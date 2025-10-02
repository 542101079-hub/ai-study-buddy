
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient, getServerSession, supabaseAdmin } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

const HIGHLIGHTS = [
  {
    title: "专注时长",
    value: "6.8h",
    description: "较上周提升 12%",
  },
  {
    title: "完成计划",
    value: "5",
    description: "超出本周目标进度",
  },
  {
    title: "平均时长",
    value: "2.5h",
    description: "已保持 9 天连续学习",
  },
];

const QUICK_ACTIONS = [
  {
    title: "查看学习计划",
    description: "提前掌握重点内容，灵活调整时间安排。",
    cta: "查看计划",
  },
  {
    title: "开始下一次学习",
    description: "进入下一段 AI 引导的练习模块。",
    cta: "开始学习",
  },
  {
    title: "记录学习心得",
    description: "随手记下关键收获，巩固长期记忆。",
    cta: "添加笔记",
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
      tenantSummary = await loadTenantSummary(supabase, profileData.tenant_id);
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
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6 text-amber-200">
              <h3 className="text-lg font-semibold mb-2">欢迎使用 AI 学习伙伴！</h3>
              <p className="mb-4">
                我们检测到您还没有完整的学习档案。您可以继续使用基本功能，或者创建完整档案来解锁更多功能。
              </p>
              <Button
                asChild
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Link href="/create-profile">创建完整档案</Link>
              </Button>
            </div>
          )}
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
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
                <Button size="sm" className="bg-violet-900/70 hover:bg-violet-700">
                  调整计划
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-violet-700/60 bg-violet-800/55 p-4 text-white/90"
                  >
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="mt-2 text-sm text-white/85">{action.description}</p>
                    <Button variant="ghost" size="sm" className="mt-4 px-1 text-white/85">
                      {action.cta}
                    </Button>
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
                  variant="outline"
                  className="border-violet-700/60 text-white/85 hover:bg-violet-900/70"
                  size="sm"
                >
                  查看清单
                </Button>
              </CardContent>
            </Card>
          </section>

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
