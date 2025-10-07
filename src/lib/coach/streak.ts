import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

dayjs.extend(utc);
dayjs.extend(timezone);

type Supabase = SupabaseClient<Database>;

type CheckinParams = {
  supabase: Supabase;
  tenantId: string;
  userId: string;
  today: string; // YYYY-MM-DD (Asia/Tokyo)
};

type CheckinResult = {
  streakDays: number;
  level: number;
  awardedBadges: Array<{
    id: string;
    code: string;
    name: string;
    acquired_at: string;
  }>;
};

export const BADGE_THRESHOLDS: Array<{ code: string; days: number; name: string }> = [
  { code: "streak_3", days: 3, name: "连续打卡 3 天" },
  { code: "streak_7", days: 7, name: "连续打卡 7 天" },
  { code: "streak_30", days: 30, name: "连续打卡 30 天" },
];

export function calcLevel(streakDays: number): number {
  if (streakDays >= 30) return 4;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  return 1;
}

export async function checkinAndReward({
  supabase,
  tenantId,
  userId,
  today,
}: CheckinParams): Promise<CheckinResult> {
  const todayDate = dayjs.tz(today, "Asia/Tokyo");
  const todayStr = todayDate.format("YYYY-MM-DD");
  const yesterdayStr = todayDate.subtract(1, "day").format("YYYY-MM-DD");

  const { data: existing, error: statsError } = await supabase
    .from("motivation_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (statsError) {
    throw statsError;
  }

  let streakDays = 1;
  let level = 1;

  if (existing) {
    if (existing.last_checkin === todayStr) {
      const { data: badgesData, error: badgeErr } = await supabase
        .from("badges")
        .select("id, code, name, acquired_at")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);

      if (badgeErr) throw badgeErr;

      return {
        streakDays: existing.streak_days,
        level: existing.level,
        awardedBadges: badgesData ?? [],
      };
    }

    if (existing.last_checkin === yesterdayStr) {
      streakDays = existing.streak_days + 1;
    } else {
      streakDays = 1;
    }
    level = Math.max(existing.level, calcLevel(streakDays));
  } else {
    level = calcLevel(streakDays);
  }

  const upsertPayload = {
    user_id: userId,
    tenant_id: tenantId,
    streak_days: streakDays,
    level,
    last_checkin: todayStr,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("motivation_stats")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (upsertError) {
    throw upsertError;
  }

  const thresholds = BADGE_THRESHOLDS.filter((item) => streakDays >= item.days);

  const { data: ownedBadges, error: ownedError } = await supabase
    .from("badges")
    .select("code")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .in(
      "code",
      thresholds.map((badge) => badge.code),
    );

  if (ownedError) {
    throw ownedError;
  }

  const ownedCodes = new Set((ownedBadges ?? []).map((badge) => badge.code));

  const toInsert = thresholds.filter((item) => !ownedCodes.has(item.code));

  let awardedBadges: CheckinResult["awardedBadges"] = [];
  if (toInsert.length > 0) {
    const insertPayload = toInsert.map((item) => ({
      tenant_id: tenantId,
      user_id: userId,
      code: item.code,
      name: item.name,
      acquired_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("badges")
      .insert(insertPayload)
      .select("id, code, name, acquired_at");

    if (error) {
      throw error;
    }
    awardedBadges = data ?? [];
  }

  return {
    streakDays,
    level,
    awardedBadges,
  };
}
