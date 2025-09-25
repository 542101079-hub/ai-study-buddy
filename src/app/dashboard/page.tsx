"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { clearSession, getSession } from "@/lib/session";

interface SessionInfo {
  email: string;
  displayName?: string;
}

const HIGHLIGHTS = [
  {
    title: "本周学习进度",
    value: "68%",
    description: "与上周比提升 12%。",
  },
  {
    title: "连续打卡天数",
    value: "5",
    description: "保持机械包中加油，试着创造新的连续记录。",
  },
  {
    title: "今天予定时长",
    value: "2.5h",
    description: "再完成 1 个任务就可达成目标。",
  },
];

const QUICK_ACTIONS = [
  {
    title: "今日任务",
    description: "根据你的计划发掘今日需重点破集的知识点。",
    cta: "查看计划",
  },
  {
    title: "下一个复盘",
    description: "反思本周的最佳学习模式，准备启动新一轮的进阶计划。",
    cta: "打开复盘",
  },
  {
    title: "练习目标",
    description: "前置下周重点任务，确认需深耐的技能和知识模块。",
    cta: "编辑路线",
  },
];

export default function DashboardPage() {
  useAuthRedirect({ when: "unauthenticated", redirectTo: "/" });

  const router = useRouter();
  const [session, setSessionState] = useState<SessionInfo | null>(null);

  useEffect(() => {
    setSessionState(getSession());
  }, []);

  function handleSignOut() {
    clearSession();
    router.replace("/");
  }

  const displayName = session?.displayName || session?.email?.split("@")[0] || "Learner";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),_rgba(2,6,23,0.98))]" />
        <div className="absolute left-1/3 top-1/4 h-[460px] w-[460px] rounded-full bg-purple-500/24 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/5 h-[380px] w-[380px] rounded-full bg-indigo-500/25 blur-[160px]" />
      </div>
      <div className="container mx-auto flex min-h-screen flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-white/92">
              <p>欢迎回来，{displayName}！</p>
              <p className="text-xs text-white/85">今天也一起保持动力。</p>
            </div>
            <Button variant="outline" className="border-violet-700/60 text-white/85 hover:bg-violet-900/70" onClick={handleSignOut}>
              退出
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 pb-12">
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <Card key={item.title} className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
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
                  <CardTitle className="text-2xl font-semibold">
                    路径静猜调整
                  </CardTitle>
                  <CardDescription className="text-sm text-white/90">
                    根据最新进度与优先级，提前安排的策略建议已到达。
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
                    <h3 className="text-base font-semibold text-white">
                      {action.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/90">
                      {action.description}
                    </p>
                    <Button variant="ghost" size="sm" className="mt-4 px-1 text-white/85">
                      {action.cta}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-semibold">
                  动力体系
                </CardTitle>
                <CardDescription className="text-sm text-white/92">
                  您的反馈帮助 AI 搭子调整动力方向，维持长期学习效率。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/90">
                <p>
                  本周情绪倾向：
                  <span className="underline">优势活力</span>
                </p>
                <p>
                  提醒建议：按时继续保持 25 分钟学习 + 5 分钟复盘的节奏。
                </p>
                <Button variant="outline" className="border-violet-700/60 text-white/85 hover:bg-violet-900/70" size="sm">
                  设定提醒
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
