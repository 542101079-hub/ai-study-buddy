"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudyBuddyIllustration } from "@/components/study-buddy-illustration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { setSession } from "@/lib/session";

const PROMISES = [
  "专人助手跟踪你的每个小目标",
  "自动列入每周的预算时间与优先级",
  "根据进度逐步提醒打卡与复盘",
];

const EMAIL_PATTERN = /[^\\s@]+@[^\\s@]+\\.[^\\s@]+/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export default function RegisterPage() {
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const nextErrors: FieldErrors = {};

    if (!name) {
      nextErrors.name = "请填写姓名。";
    }

    if (!email) {
      nextErrors.email = "请填写邮箱地址。";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "请输入有效邮箱地址。";
    }

    if (!password) {
      nextErrors.password = "请填写密码。";
    } else if (password.length < 6) {
      nextErrors.password = "密码至少需有6位字符。";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("请检查标记的字段。");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 480));
      setSession({
        email,
        displayName: name,
      });
      router.replace("/dashboard");
    } catch (error) {
      console.error("register failed", error);
      setFormError("注册失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_rgba(6,11,34,0.96))]" />
        <div className="absolute left-1/4 top-1/4 h-[480px] w-[480px] rounded-full bg-indigo-500/25 blur-[140px]" />
        <div className="absolute right-1/5 bottom-1/4 h-[360px] w-[360px] rounded-full bg-sky-500/20 blur-[130px]" />
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden flex-1 flex-col justify-between border-t border-sky-500/25 bg-gradient-to-br from-sky-500/12 via-blue-500/8 to-indigo-500/20 px-6 py-12 text-white md:px-10 lg:px-12 lg:py-16 lg:flex">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                Launch Plan
              </span>
              <h2 className="max-w-lg text-3xl font-semibold leading-snug">
                开启你的智能学习计划，由 AI 担心带走每步改进。
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-sky-100/85">
              {PROMISES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-sky-400/35 bg-sky-500/12 p-4 text-sky-50"
                >
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/40 text-xs font-semibold text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-slate-300">
            注册即可获得七天初始体验，支持随时导出全部训练数据。
          </div>
        </aside>
        <div className="w-full px-6 py-12 md:px-10 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="mt-12 max-w-md">
            <Card className="border-sky-400/40 bg-sky-500/15 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">
                  正式加入学习搭子
                </CardTitle>
                <CardDescription className="text-base text-sky-100/85">
                  输入基础信息，我们将为你生成个性化学习方案。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="AI Learner"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
                    />
                    {fieldErrors.name && (
                      <p id="register-name-error" className="text-xs text-red-300">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                    />
                    {fieldErrors.email && (
                      <p id="register-email-error" className="text-xs text-red-300">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="********"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                    />
                    {fieldErrors.password && (
                      <p id="register-password-error" className="text-xs text-red-300">
                        {fieldErrors.password}
                      </p>
                    )}
                    <p className="text-xs text-slate-300">
                      推荐10位以上，包括数字与字母组合。
                    </p>
                  </div>
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      {formError}
                    </div>
                  )}
                  <Button type="submit" size="lg" disabled={loading} className="w-full">
                    {loading ? "正在员点学习旅程..." : "立即加入学习旅程"}
                  </Button>
                </form>
                <p className="text-sm text-slate-300">
                  已有账号？
                  <Button asChild variant="ghost" size="sm" className="px-1 text-sky-300">
                    <Link href="/signin">继续学习旅程</Link>
                  </Button>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
