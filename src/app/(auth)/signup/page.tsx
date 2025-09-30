import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "注册",
  description: "创建 AI Study Buddy 账户，获得专属学习规划与实时 AI 协作。",
};

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.3),_rgba(15,23,42,0.95))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.2)_0%,rgba(56,189,248,0.1)_45%,transparent_85%)] opacity-70" />
        <div className="absolute left-[-12%] top-1/3 h-[380px] w-[380px] rounded-full bg-indigo-500/35 blur-[190px]" />
        <div className="absolute right-[-10%] top-1/4 h-[440px] w-[440px] rounded-full bg-purple-600/35 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[250px]" />
      </div>

      <header className="border-b border-white/10 bg-slate-950/80 px-6 py-6 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <BrandLogo subtitle="AI智能学习搭子" />
          <Button asChild variant="ghost" className="text-white/85 hover:text-white">
            <Link href="/signin">已有账号？去登录</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-12 sm:px-10 sm:py-20">
        <Card className="w-full border-violet-800/50 bg-gradient-to-br from-slate-950/80 via-violet-950/70 to-slate-900/80 text-white shadow-[0_28px_70px_rgba(99,102,241,0.25)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-white">创建你的学习搭子账号</CardTitle>
            <CardDescription className="text-base text-slate-200/90">
              仅需几步即可开启智能学习旅程，系统会为你自动规划近期任务并跟踪进度。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignUpForm />
            <p className="text-sm text-slate-200/85">
              想以管理员身份入驻？
              <Link href="/admin-register" className="ml-1 font-medium text-indigo-200 hover:text-white">
                前往管理员注册
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
