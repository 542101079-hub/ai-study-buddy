import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";
import { getAccessibleSession } from "../helpers";
import { qwenChat, type ChatMessage } from "@/lib/ai/providers/qwen";

const sendSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(4000),
  followUp: z.boolean().optional(),
});

const streamingToggle = false; // TODO: switch to true to enable SSE streaming

export async function POST(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { sessionId, text } = parsed.data;

  let session;
  try {
    session = await getAccessibleSession(sessionId, auth);
  } catch {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const normalizedText = text.trim();

  const { error: userInsertError } = await supabaseAdmin.from("assistant_messages").insert({
    tenant_id: auth.tenantId,
    session_id: sessionId,
    user_id: auth.userId,
    role: "user",
    content: {
      text: normalizedText,
    },
  });

  if (userInsertError) {
    console.error("[assistant messages] store user message failed", userInsertError);
    return NextResponse.json({ error: "Failed to store message" }, { status: 400 });
  }

  await supabaseAdmin
    .from("assistant_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  const { data: history, error: historyError } = await supabaseAdmin
    .from("assistant_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("order_num", { ascending: true })
    .limit(30);

  if (historyError) {
    console.error("[assistant messages] load history failed", historyError);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  const conversation: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一名学习答疑助教，请用简洁结构化方式回答，分点输出，并尽量提供解释与例子，必要时给出建议的复习步骤。",
    },
    ...(history ?? []).map((message) => ({
      role: (message.role as "user" | "assistant" | "system") ?? "user",
      content: typeof message.content === "object" && message.content !== null
        ? String((message.content as { text?: unknown }).text ?? "")
        : "",
    })),
  ];

  if (parsed.data.followUp) {
    conversation.push({
      role: "system",
      content: "用户表示 \"还没懂\"，请换一种角度进一步解释，补充直观比喻或示例，并指出下一步行动。",
    });
  }

  try {
    const { text: replyText, usage } = await qwenChat(conversation);

    const { data: assistantMessage, error: assistantError } = await supabaseAdmin
      .from("assistant_messages")
      .insert({
        tenant_id: auth.tenantId,
        session_id: sessionId,
        user_id: auth.userId,
        role: "assistant",
        content: {
          text: replyText,
          citations: [],
        },
        tokens: usage?.total_tokens ?? null,
      })
      .select("*")
      .single();

    if (assistantError) {
      console.error("[assistant messages] store assistant message failed", assistantError);
      return NextResponse.json({ error: "Failed to store assistant reply" }, { status: 500 });
    }

    await supabaseAdmin
      .from("assistant_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({
      message: assistantMessage,
      usage,
      stream: streamingToggle,
    });
  } catch (error) {
    console.error("[assistant messages] qwen call failed", error);
    return NextResponse.json({ error: "Assistant failed to respond" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  let session;
  try {
    session = await getAccessibleSession(sessionId, auth);
  } catch {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("assistant_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("order_num", { ascending: true });

  if (error) {
    console.error("[assistant messages] fetch failed", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 400 });
  }

  return NextResponse.json({
    messages: data ?? [],
  });
}
