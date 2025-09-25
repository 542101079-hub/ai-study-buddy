'use client';

import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

const FEATURES = [
  {
    title: "个性化学习规划",
    description: "根据阶段与目标自动生成周计划与每日任务，保持循序渐进的节奏。",
  },
  {
    title: "智能答疑",
    description: "24/7 AI 学伴即时解析难点，提供知识点延伸与举一反三。",
  },
  {
    title: "进度追踪",
    description: "多维度记录打卡、复盘与习惯数据，实时反馈成长曲线。",
  },
  {
    title: "情感激励",
    description: "贴近真实导师的陪伴感，用故事化提示与语音鼓励稳住动力。",
  },
  {
    title: "就业进阶",
    description: "生成个性化面试脚本与技能清单，帮助你完成从学习到就业的跃迁。",
  },
];

export default function HomePage() {
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.18)_0%,rgba(56,189,248,0.08)_38%,transparent_76%)] opacity-70" />
        <div className="absolute left-[-10%] top-1/4 h-[420px] w-[420px] rounded-full bg-purple-500/35 blur-[170px]" />
        <div className="absolute right-[-8%] top-1/3 h-[360px] w-[360px] rounded-full bg-indigo-500/35 blur-[200px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[240px]" />
      </div>

      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/88 hover:text-white">
              <Link href="/signin">登录</Link>
            </Button>
            <Button asChild className="shadow-[0_12px_40px_rgba(59,130,246,0.32)]">
              <Link href="/signup">立即注册</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 py-12 sm:px-10 sm:py-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-violet-200">
              AI Study Buddy
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                你的 AI 智能学习搭子
              </h1>
              <p className="max-w-xl text-base text-white/88 sm:text-lg">
                从规划到答疑，从进度追踪到就业进阶，一位始终在线的 AI 学伴，帮助你把每一次练习都对准目标。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="px-7 text-base shadow-[0_18px_45px_rgba(79,70,229,0.35)]">
                <Link href="/signup">免费开启我的学习旅程</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-violet-600/70 text-white/85 hover:border-violet-400 hover:bg-violet-800/60 hover:text-white">
                <Link href="/signin">我已有账号，立即登录</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/90">
              <div>
                <p className="text-3xl font-semibold text-white">92%</p>
                <p>坚持打卡 4 周以上的学员完成主要阶段目标</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">30min</p>
                <p>平均节省每日规划与复盘时间</p>
              </div>
            </div>
          </div>
          <Card className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white shadow-[0_25px_80px_rgba(79,70,229,0.18)]">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">每天都有伙伴在你身旁</CardTitle>
              <CardDescription className="text-base text-white/90">
                贴合节奏的学习搭子，看板式掌握进展，复盘提醒和情绪播报随时跟进。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/85">
              <div className="rounded-lg border border-violet-700/60 bg-violet-800/55 p-4 text-white/90">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">今日亮点</p>
                <p className="mt-2 text-lg text-white">任务完成度 82%</p>
                <p className="text-white/90">下一个建议：完成面试行为题演练 1 轮。</p>
              </div>
              <div className="rounded-lg border border-violet-700/60 bg-violet-800/55 p-4 text-white/90">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">情感播报</p>
                <p className="mt-2 text-lg text-white">保持良好状态，再走一步就能完成本周计划。</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-white">AI 学伴的 5 大能力</h2>
            <p className="max-w-2xl text-base text-white/90">
              将学习路径拆成可执行的行动，用数据与反馈伴随你坚持下去。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className={cn(
                  "border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white/90 transition-all duration-300",
                  "hover:border-violet-600/80 hover:bg-violet-800/65 hover:text-white hover:shadow-[0_35px_80px_rgba(56,0,94,0.45)]",
                )}
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-white/92">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 px-8 py-12 text-white shadow-[0_45px_110px_rgba(56,0,94,0.35)] sm:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">今天开始，让 AI 陪你把目标逐一实现</h3>
              <p className="max-w-xl text-sm text-white/88">
                选择适合你的阶段，15 秒完成注册，立即同步学习节奏与陪伴提醒。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-6 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 shadow-[0_18px_50px_rgba(56,0,94,0.45)] hover:from-violet-600 hover:via-purple-500 hover:to-indigo-500">
                <Link href="/signup">免费注册</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-violet-600/70 text-white/85 hover:border-violet-400 hover:bg-violet-800/60 hover:text-white">
                <Link href="/signin">我先体验登录</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

