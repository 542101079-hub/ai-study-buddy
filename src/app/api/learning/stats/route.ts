import { NextRequest, NextResponse } from "next/server";

import { getLearningStats } from "@/lib/learning/stats";
import { getServerSession, supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = parseInt(searchParams.get("period") ?? "30", 10);
    const periodDays = Number.isFinite(periodParam) && periodParam > 0 ? periodParam : 30;

    const stats = await getLearningStats(supabaseAdmin, session.user.id, { periodDays });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Learning stats API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
