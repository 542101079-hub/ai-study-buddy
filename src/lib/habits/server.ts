import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/db/types";
import {
  HABIT_DEFINITIONS,
  HABIT_TIMEZONE,
  buildDefaultMeta,
  type HabitCode,
  HABIT_CODE_SET,
} from "./definitions";

dayjs.extend(utc);
dayjs.extend(timezone);

export type HabitRunRow = Database["public"]["Tables"]["habit_runs"]["Row"];
export type HabitRunStatus = HabitRunRow["status"];

export type HabitAuthContext = {
  tenantId: string;
  userId: string;
};

export type HabitDateResolution = {
  date: string;
  day: dayjs.Dayjs;
};

export function resolveHabitDate(input?: string | null): HabitDateResolution {
  if (input) {
    const parsed = dayjs.tz(`${input}T00:00:00`, HABIT_TIMEZONE);
    if (!parsed.isValid()) {
      throw new Error("INVALID_DATE");
    }
    return {
      date: parsed.format("YYYY-MM-DD"),
      day: parsed,
    };
  }

  const now = dayjs().tz(HABIT_TIMEZONE);
  return {
    date: now.format("YYYY-MM-DD"),
    day: now,
  };
}

export function habitNowIso(): string {
  return dayjs().tz(HABIT_TIMEZONE).toISOString();
}

export async function ensureHabitRunsForDate(
  supabase: SupabaseClient<Database>,
  auth: HabitAuthContext,
  date: string,
): Promise<HabitRunRow[]> {
  const existing = await fetchHabitRunsForDate(supabase, auth, date);
  const existingCodes = new Set(existing.map((run) => run.habit_code as HabitCode));

  const missingDefinitions = HABIT_DEFINITIONS.filter(
    (definition) => !existingCodes.has(definition.code),
  );

  if (missingDefinitions.length > 0) {
    const payload = missingDefinitions.map((definition) => ({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      habit_code: definition.code,
      date,
      planned_minutes: definition.plannedMinutes,
      status: "pending" as HabitRunStatus,
      meta: buildDefaultMeta(definition.code),
    }));

    const { error: insertError } = await supabase
      .from("habit_runs")
      .insert(payload, {
        onConflict: "user_id,date,habit_code",
        ignoreDuplicates: true,
      });

    if (insertError && insertError.code !== "23505") {
      console.error("[habit_runs] ensure insert failed", insertError);
      throw new Error("INSERT_FAILED");
    }

    return fetchHabitRunsForDate(supabase, auth, date);
  }

  return existing;
}

export async function fetchHabitRunsForDate(
  supabase: SupabaseClient<Database>,
  auth: HabitAuthContext,
  date: string,
): Promise<HabitRunRow[]> {
  const { data, error } = await supabase
    .from("habit_runs")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .eq("date", date)
    .order("habit_code", { ascending: true });

  if (error) {
    console.error("[habit_runs] fetch failed", error);
    throw new Error("FETCH_FAILED");
  }

  return data ?? [];
}

export async function getHabitRunForDate(
  supabase: SupabaseClient<Database>,
  auth: HabitAuthContext,
  code: HabitCode,
  date: string,
  options: { ensure?: boolean } = {},
): Promise<HabitRunRow | null> {
  if (!HABIT_CODE_SET.has(code)) {
    throw new Error("UNKNOWN_HABIT");
  }

  if (options.ensure) {
    await ensureHabitRunsForDate(supabase, auth, date);
  }

  const { data, error } = await supabase
    .from("habit_runs")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .eq("habit_code", code)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    console.error("[habit_runs] load single failed", error);
    throw new Error("FETCH_FAILED");
  }

  return data ?? null;
}

type HabitMetaObject = Record<string, unknown>;

export function normalizeHabitMeta(meta: Json | null | undefined, code: HabitCode): HabitMetaObject {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as HabitMetaObject;
  }

  const fallback = buildDefaultMeta(code);
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    return fallback as HabitMetaObject;
  }

  return {};
}

export function mergeHabitMeta(
  meta: Json | null | undefined,
  code: HabitCode,
  patch: HabitMetaObject,
): HabitMetaObject {
  return {
    ...normalizeHabitMeta(meta, code),
    ...patch,
  };
}
