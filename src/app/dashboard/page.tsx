import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient, getServerSession } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

const HIGHLIGHTS = [
  {
    title: "专注学习时长",
    value: "68%",
    description: "较上周提高了 12%",
  },
  {
    title: "完成的计划",
    value: "5",
    description: "保持每周节奏，完成新增专题练习",
  },
  {
    title: "平均规划时长",
    value: "2.5h",
    description: "坚持每日 1 小时即可达成阶段目标",
  },
];

const QUICK_ACTIONS = [
  {
    title: "今日任务",
    description: "查看待办的高优先级知识点与练习题。",
    cta: "查看计划",
  },
  {
    title: "下一次回顾",
    description: "整理最近的学习模块，为下一阶段复习做准备。",
    cta: "打开复习",
  },
  {
    title: "强化目标",
    description: "聚焦关键技能，确认练习安排与知识节点。",
    cta: "编辑路径",
  },
];

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  const supabase = createServerSupabaseClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle<{ full_name: string | null; username: string | null; avatar_url: string | null }>();

  const displayName =
    profileData?.full_name ||
    profileData?.username ||
    session.user.email?.split("@")[0] ||
    "Learner";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),_rgba(2,6,23,0.98))]" />
        <div className="absolute left-1/3 top-1/4 h-[460px] w-[460px] rounded-full bg-purple-500/24 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/5 h-[380px] w-[380px] rounded-full bg-indigo-500/25 blur-[160px]" />
      </div>
      <div className="container mx-auto flex min-h-screen flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <BrandLogo subtitle="AI 智能学习顾问" />
          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-white/92">
              <p>欢迎回来，{displayName}</p>
              <p className="text-xs text-white/85">继续保持学习势能</p>
            </div>
            <LogoutButton className="border-violet-700/60 text-white/85 hover:bg-violet-900/70" />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 pb-12">
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
                  <CardTitle className="text-2xl font-semibold">本周概览</CardTitle>
                  <CardDescription className="text-sm text-white/90">
                    查看最新的进度摘要与推荐任务，高效规划学习时间。
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-violet-900/70 hover:bg-violet-700">
                  更新计划
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-violet-700/60 bg-violet-800/55 p-4 text-white/90"
                  >
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="mt-2 text-sm text-white/90">{action.description}</p>
                    <Button variant="ghost" size="sm" className="mt-4 px-1 text-white/85">
                      {action.cta}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-semibold">学习协同</CardTitle>
                <CardDescription className="text-sm text-white/92">
                  结合 AI 建议与自定义计划，构建多维的进阶路径。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/90">
                <p>
                  下一步关注：<span className="underline">强化记忆和知识串联</span>
                </p>
                <p>建议安排：每日 25 分钟深度学习 + 5 分钟快速复盘。</p>
                <Button
                  variant="outline"
                  className="border-violet-700/60 text-white/85 hover:bg-violet-900/70"
                  size="sm"
                >
                  设置提醒
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
