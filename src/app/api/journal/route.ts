import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";
import { classifyMood } from "@/lib/coach/mood";
import { replyTemplate, type Tone } from "@/lib/coach/tone";
import { checkinAndReward } from "@/lib/coach/streak";

dayjs.extend(utc);
dayjs.extend(timezone);

const createSchema = z.object({
  content: z.string().trim().min(1, "content_required").max(2000, "content_too_long"),
  tone: z.enum(["strict", "healer", "social"]).optional(),
});

const cursorSchema = z
  .object({
    cursor: z.string().datetime().optional(),
  })
  .optional();

const PAGE_SIZE = 20;

export async function POST(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { content } = parsed.data;
  const tone: Tone = parsed.data.tone ?? "healer";
  const mood = classifyMood(content);

  const now = dayjs().tz("Asia/Tokyo");
  const today = now.format("YYYY-MM-DD");

  const { data: entry, error: entryError } = await supabaseAdmin
    .from("journal_entries")
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      content,
      mood,
      tone,
    })
    .select("*")
    .single();

  if (entryError) {
    console.error("[journal] insert entry failed", entryError);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  const { error: moodEventError } = await supabaseAdmin.from("mood_events").insert({
    tenant_id: auth.tenantId,
    user_id: auth.userId,
    source: "journal",
    mood,
    payload: {
      detectedAt: now.toISOString(),
    },
  });

  if (moodEventError) {
    console.warn("[journal] insert mood event failed", moodEventError);
  }

  let streakResult;
  try {
    streakResult = await checkinAndReward({
      supabase: supabaseAdmin,
      tenantId: auth.tenantId,
      userId: auth.userId,
      today,
    });
  } catch (error) {
    console.error("[journal] checkin failed", error);
    streakResult = { streakDays: 1, level: 1, awardedBadges: [] };
  }

  const summary =
    content.length > 60 ? `${content.slice(0, 57)}...` : content;
  const reply = replyTemplate(tone, mood, summary);

  return NextResponse.json({
    ok: true,
    data: {
      entry,
      mood,
      tone,
      reply,
      streak: streakResult.streakDays,
      level: streakResult.level,
      awardedBadges: streakResult.awardedBadges,
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const search = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = cursorSchema.safeParse(search);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_query" },
      { status: 400 },
    );
  }

  const cursor = parsed.data?.cursor;

  let query = supabaseAdmin
    .from("journal_entries")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[journal] fetch entries failed", error);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const items = hasMore ? data!.slice(0, PAGE_SIZE) : data ?? [];
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;

  return NextResponse.json({
    ok: true,
    data: {
      entries: items,
      nextCursor,
    },
  });
}
