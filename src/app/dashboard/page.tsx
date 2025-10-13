const STATS_WINDOW_DAYS = 30;

import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import { getLearningStats, type LearningStats } from "@/lib/learning/stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient, getServerSession, supabaseAdmin } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";
import { QuickActionNavigate } from "./quick-action-navigate";

const QUICK_ACTIONS = [
  {
    title: "查看学习计划",
    description: "整理当前的学习计划，把握节奏查缺补漏",
    cta: "查看计划",
    href: "/learning/plans",
  },
  {
    title: "开始一段学习",
    description: "使用 AI 学习助手开启对话式学习，随时复盘巩固",
    cta: "和 AI 学习助手对话",
    href: "/assistant",
    external: true,
  },
  {
    title: "记录学习日志",
    description: "及时总结关键收获与反思，沉淀每一次成长",
    cta: "撰写日志",
    href: "/journal",
  },
];
export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  const supabase = createServerSupabaseClient();
  
  // 使用service role绕过RLS问题来获取profile数据
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username, avatar_url, role, tenant_id")
    .eq("id", session.user.id)
    .maybeSingle<{
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      role: "user" | "admin" | "editor" | "viewer";
      tenant_id: string | null;
    }>();

  // 检查profile数据，但不强制重定向
  if (profileError) {
    console.warn("[dashboard] load profile failed", {
      error: profileError,
      errorCode: profileError?.code,
      errorMessage: profileError?.message,
      errorDetails: JSON.stringify(profileError),
      userId: session.user.id,
      userEmail: session.user.email
    });
  }

  if (!profileData) {
    console.warn("[dashboard] profile data is null", {
      userId: session.user.id,
      userEmail: session.user.email
    });
  }

  let tenantSummary: TenantSummary | null = null;

  if (profileData?.tenant_id) {
    try {
      tenantSummary = await loadTenantSummary(supabaseAdmin, profileData.tenant_id);
    } catch (tenantError) {
      console.error("[dashboard] load tenant failed", tenantError);
    }
  }

  const tenantDisplayName = tenantSummary?.name ?? "AI 学习伙伴";
  const tenantTagline = tenantSummary?.tagline ?? "智能学习搭档";
  const tenantLogoUrl = tenantSummary?.logo_url ?? null;
  const displayName =
    profileData?.full_name ||
    profileData?.username ||
    session.user.email?.split("@")[0] ||
    "学习者";

  const isAdmin = profileData?.role === "admin";
  const roleLabel = isAdmin ? "管理员" : "成员";

  // 如果没有profile数据，显示提示信息
  const showProfileWarning = !profileData;

  let learningStats: LearningStats | null = null;
  try {
    learningStats = await getLearningStats(supabaseAdmin, session.user.id, { periodDays: STATS_WINDOW_DAYS });
  } catch (statsError) {
    console.error("[dashboard] load learning stats failed", statsError);
  }

  const highlightCards = buildHighlightCards(learningStats, STATS_WINDOW_DAYS);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),_rgba(2,6,23,0.98))]" />
        <div className="absolute left-1/3 top-1/4 h-[460px] w-[460px] rounded-full bg-purple-500/24 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/5 h-[380px] w-[380px] rounded-full bg-indigo-500/25 blur-[160px]" />
      </div>
      <div className="container mx-auto flex min-h-screen flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {tenantLogoUrl ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/20 bg-white/10">
                <img
                  src={tenantLogoUrl}
                  alt={`${tenantDisplayName} 徽标`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <BrandLogo showText={false} />
            )}
            <div className="space-y-1">
              <p className="text-xl font-semibold text-white/95">{tenantDisplayName}</p>
              <p className="text-sm text-white/70">{tenantTagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {isAdmin && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/20"
              >
                <Link href="/admin">管理学习空间</Link>
              </Button>
            )}
            <div className="text-right text-sm text-white/92">
              <p>欢迎回来，{displayName}</p>
              <p className="text-xs text-white/75">{roleLabel}</p>
            </div>
            <LogoutButton className="border-violet-700/60 text-white/85 hover:bg-violet-900/70" />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 pb-12">
          {showProfileWarning && (
            <div className="rounded-xl border border-blue-500/50 bg-blue-500/10 p-6 text-blue-200">
              <h3 className="text-lg font-semibold mb-2">欢迎使用 AI 学习伙伴！🎉</h3>
              <p className="mb-4">
                您可以直接开始使用所有功能，包括 AI 学习搭子、智能问答和个性化学习计划。
              </p>
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link href="/learning">开始学习之旅</Link>
              </Button>
            </div>
          )}
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {highlightCards.map((item) => (
              <Card
                key={item.title}
                className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl"
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-sm font-medium text-white/92">
                    {item.title}
                  </CardTitle>
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-white/90">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">今日重点</CardTitle>
                  <CardDescription className="text-sm text-white/90">
                    围绕本周目标安排学习节奏，并注意劳逸结合。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-violet-700/60 bg-violet-800/55 p-4 text-white/90"
                  >
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="mt-2 text-sm text-white/85">{action.description}</p>
                    {action.href ? (
                      <QuickActionNavigate
                        href={action.href}
                        external={action.external}
                        variant="ghost"
                        size="sm"
                        className="mt-4 px-1 text-white/85"
                      >
                        {action.cta}
                      </QuickActionNavigate>
                    ) : (
                      <Button variant="ghost" size="sm" className="mt-4 px-1 text-white/85">
                        {action.cta}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-semibold">每日习惯</CardTitle>
                <CardDescription className="text-sm text-white/92">
                  将高效专注与快速复盘结合，强化记忆效果。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/90">
                <p>
                  先进行<span className="underline">10 分钟快速回顾</span>，整理昨日笔记。
                </p>
                <p>采用 25 分钟学习 + 5 分钟复盘的节奏，保持专注与灵活。</p>
                <Button
                  asChild
                  variant="outline"
                  className="border-violet-700/60 text-white/85 hover:bg-violet-900/70"
                  size="sm"
                >
                  <Link href="/routines">查看清单</Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* AI 学习搭子模块 */}
          <Card className="border-violet-600/50 bg-gradient-to-br from-violet-900/70 via-purple-800/60 to-slate-900/80 text-white backdrop-blur-xl">
            <CardHeader className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                  🤖 AI学习搭子
                </CardTitle>
                <CardDescription className="text-sm text-white/85">
                  个性化学习规划、智能问答、进度追踪，让AI成为你的学习伙伴。
                </CardDescription>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-violet-500/60 text-violet-200 hover:bg-violet-500/20"
              >
                <Link href="/learning">开始学习</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-white/85">
              <p>
                🎯 制定个性化学习计划，📚 智能答疑解惑，📈 实时追踪学习进度
              </p>
              <p>让AI陪伴你的每一步学习之路，提升学习效率和成果。</p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-emerald-600/50 bg-gradient-to-br from-emerald-900/70 via-emerald-800/60 to-slate-900/80 text-white backdrop-blur-xl">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">空间概览</CardTitle>
                  <CardDescription className="text-sm text-white/85">
                    查看团队进度，并在需要时调整成员权限。
                  </CardDescription>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/20"
                >
                  <Link href="/admin">进入管理中心</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-white/85">
                <p>
                  成员会根据角色继承相应权限。可将值得信赖的同伴升级为管理员，共同维护空间。
                </p>
                <p>仅管理员可以查看此模块。</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

type HighlightCard = {
  title: string;
  value: string;
  description: string;
};

function buildHighlightCards(stats: LearningStats | null, windowDays: number): HighlightCard[] {
  const windowLabel = `近 ${windowDays} 天`;
  const totalStudyMinutes = stats?.totalStudyTime ?? 0;
  const averageStudyMinutes = stats?.averageStudyTime ?? 0;
  const studyDays = stats?.studyDays ?? 0;
  const completedTasks = stats?.completedTasks ?? 0;
  const totalTasks = stats?.totalTasks ?? 0;
  const completionRate = stats?.completionRate ?? 0;

  return [
    {
      title: "专注时长",
      value: formatHourValue(totalStudyMinutes),
      description:
        totalStudyMinutes > 0
          ? `${windowLabel}共学习 ${formatDurationText(totalStudyMinutes)}`
          : "近期还没有学习记录",
    },
    {
      title: "完成计划",
      value: completedTasks.toString(),
      description:
        totalTasks > 0 ? `任务完成率 ${completionRate}%` : "暂无任务记录",
    },
    {
      title: "平均时长",
      value: formatHourValue(averageStudyMinutes),
      description:
        studyDays > 0
          ? `已保持 ${studyDays} 天连续学习`
          : "还没有连续学习记录",
    },
  ];
}

function formatHourValue(minutes: number): string {
  if (minutes <= 0) {
    return "0h";
  }

  const hours = minutes / 60;
  if (hours >= 1) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded.toString().replace(/\\.0$/, "")}h`;
  }

  return `${minutes}min`;
}

function formatDurationText(minutes: number): string {
  if (minutes <= 0) {
    return "0 分钟";
  }

  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toString().replace(/\\.0$/, "")} 小时`;
}




