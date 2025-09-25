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
  "\u5b66\u4e60\u548c\u6253\u5361\u8bb0\u5f55\u5b9a\u671f\u5f52\u6863",
  "\u4e2a\u6027\u5316\u89c4\u5212\u4e0e\u63d0\u9192\u81ea\u52a8\u5efa\u8bae",
  "\u9762\u8bd5\u7ec3\u4e60\u4e0e\u77ed\u671f\u76ee\u6807\u5f52\u4e00\u7ba1\u7406",
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
      nextErrors.email = "\u8bf7\u586b\u5199\u90ae\u7bb1\u5730\u5740\u3002";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002";
    }

    if (!password) {
      nextErrors.password = "\u8bf7\u586b\u5199\u5bc6\u7801\u3002";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("\u8bf7\u68c0\u67e5\u6807\u8bb0\u7684\u5b57\u6bb5\u3002");
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
      setFormError("\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(59,130,246,0.18)_0%,rgba(56,189,248,0.1)_40%,transparent_78%)] opacity-70" />
        <div className="absolute left-[-8%] top-1/3 h-[380px] w-[380px] rounded-full bg-sky-400/30 blur-[180px]" />
        <div className="absolute right-[-12%] top-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500/30 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[230px]" />
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="order-2 flex w-full flex-col justify-between border-t border-white/10 bg-white/5 px-6 py-10 text-white sm:px-10 lg:order-1 lg:w-1/2 lg:border-t-0 lg:border-r lg:px-12 lg:py-16">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                AI Study Buddy
              </span>
              <h2 className="max-w-md text-3xl font-semibold leading-snug">
                \u4f60\u7684\u6bcf\u4e2a\u5b66\u4e60\u70b9\u90fd\u53ef\u8f6c\u5316\u4e3a\u5c31\u4e1a\u786e\u5b9a\u7684\u6b65\u4f10\u3002
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-slate-200">
              {SIDE_NOTES.map((note) => (
                <li
                  key={note}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/35 text-sm font-semibold text-white">
                    \u2605
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-slate-300">
            \u516c\u6d4b\u9636\u6bb5\u652f\u6301\u5b58\u50a8\u767b\u5f55\u4fe1\u606f\uff0c\u968f\u65f6\u53ef\u4ee5\u6e05\u9664\u3002
          </div>
        </aside>
        <div className="order-1 w-full px-6 py-10 sm:px-10 lg:order-2 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50" />
          <div className="mt-12 max-w-md">
            <Card className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">\u6b22\u8fce\u56de\u6765</CardTitle>
                <CardDescription className="text-base text-slate-200">
                  \u767b\u5f55\u540e\u7acb\u5373\u94fa\u5f00\u4e2a\u6027\u5316\u5b66\u4e60\u8def\u7ebf\u4e0e\u9762\u8bd5\u51c6\u5907\u65f6\u95f4\u8868\u3002
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">\u90ae\u7bb1</Label>
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
                      <Label htmlFor="password">\u5bc6\u7801</Label>
                      <Link
                        href="#forgot-password"
                        className="text-xs text-sky-300 underline-offset-2 hover:underline"
                      >
                        \u5fd8\u8bb0\u5bc6\u7801\uff1f
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
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border border-white/20 bg-white/10"
                      disabled={loading}
                    />
                    <span>\u8bb0\u4f4f\u6211\u7684\u65c5\u7a0b\u8282\u594f</span>
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
                    {loading ? "\u6b63\u5728\u540c\u6b65\u5b66\u4e60\u65c5\u7a0b..." : "\u7ee7\u7eed\u6211\u7684\u5b66\u4e60\u65c5\u7a0b"}
                  </Button>
                </form>
                <p className="text-sm text-slate-300">
                  \u6ca1\u6709\u8d26\u53f7\uff1f
                  <Button asChild variant="ghost" size="sm" className="px-1 text-sky-300">
                    <Link href="/signup">\u5f00\u542f\u6211\u7684\u5b66\u4e60\u65c5\u7a0b</Link>
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


