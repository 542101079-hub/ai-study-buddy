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

const SIDE_NOTES = [
  "学习和打卡记录定期归档",
  "个性化规划与提醒自动建议",
  "面试练习与短期目标归一管理",
];

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function SigninPage() {
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const nextErrors: FieldErrors = {};

    if (!email) {
      nextErrors.email = "请填写邮箱地址。";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "请输入有效的邮箱地址。";
    }

    if (!password) {
      nextErrors.password = "请填写密码。";
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
      await new Promise((resolve) => setTimeout(resolve, 420));
      setSession(
        {
          email,
          displayName: email.split("@")[0] || undefined,
        },
        { remember: rememberMe },
      );
      router.replace("/dashboard");
    } catch (error) {
      console.error("signin failed", error);
      setFormError("登录失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(59,130,246,0.18)_0%,rgba(56,189,248,0.1)_40%,transparent_78%)] opacity-70" />
        <div className="absolute left-[-8%] top-1/3 h-[380px] w-[380px] rounded-full bg-purple-500/32 blur-[180px]" />
        <div className="absolute right-[-12%] top-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500/30 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[230px]" />
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="order-2 flex w-full flex-col justify-between border-t border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 px-6 py-10 text-white sm:px-10 lg:order-1 lg:w-1/2 lg:border-t-0 lg:border-r lg:px-12 lg:py-16">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-100/85">
                AI Study Buddy
              </span>
              <h2 className="max-w-md text-3xl font-semibold leading-snug">
                你的每个学习点都可转化为就业确定的步伐。
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-violet-100/90">
              {SIDE_NOTES.map((note) => (
                <li
                  key={note}
                  className="flex items-center gap-3 rounded-xl border border-violet-700/60 bg-violet-800/55 px-4 py-3 text-white/90"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-700/60 text-sm font-semibold text-white">
                    ★
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-violet-100/90">
            公测阶段支持存储登录信息，随时可以清除。
          </div>
        </aside>
        <div className="order-1 w-full px-6 py-10 sm:px-10 lg:order-2 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="mt-12 max-w-md">
            <Card className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">欢迎回来</CardTitle>
                <CardDescription className="text-base text-violet-100/95">
                  登录后立即铺开个性化学习路线与面试准备时间表。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
                      aria-describedby={fieldErrors.email ? "signin-email-error" : undefined}
                    />
                    {fieldErrors.email && (
                      <p id="signin-email-error" className="text-xs text-red-300">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">密码</Label>
                      <Link
                        href="#forgot-password"
                        className="text-xs text-violet-200 underline-offset-2 hover:underline"
                      >
                        忘记密码？
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="********"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? "signin-password-error" : undefined}
                    />
                    {fieldErrors.password && (
                      <p id="signin-password-error" className="text-xs text-red-300">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-3 text-sm text-violet-100/90">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border border-white/20 bg-white/10"
                      disabled={loading}
                    />
                    <span>记住我的旅程节奏</span>
                  </label>
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      {formError}
                    </div>
                  )}
                  <Button type="submit" size="lg" disabled={loading} className="w-full shadow-[0_10px_30px_rgba(79,70,229,0.32)]">
                    {loading ? "正在同步学习旅程..." : "继续我的学习旅程"}
                  </Button>
                </form>
                <p className="text-sm text-violet-100/95">
                  没有账号？
                  <Button asChild variant="ghost" size="sm" className="px-1 text-violet-200">
                    <Link href="/signup">开启我的学习旅程</Link>
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


