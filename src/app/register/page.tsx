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
  "\u4e13\u4eba\u52a9\u624b\u8ddf\u8e2a\u4f60\u7684\u6bcf\u4e2a\u5c0f\u76ee\u6807",
  "\u81ea\u52a8\u5217\u5165\u6bcf\u5468\u7684\u9884\u7b97\u65f6\u95f4\u4e0e\u4f18\u5148\u7ea7",
  "\u6839\u636e\u8fdb\u5ea6\u9010\u6b65\u63d0\u9192\u6253\u5361\u4e0e\u590d\u76d8",
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
      nextErrors.name = "\u8bf7\u586b\u5199\u59d3\u540d\u3002";
    }

    if (!email) {
      nextErrors.email = "\u8bf7\u586b\u5199\u90ae\u7bb1\u5730\u5740\u3002";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "\u8bf7\u8f93\u5165\u6709\u6548\u90ae\u7bb1\u5730\u5740\u3002";
    }

    if (!password) {
      nextErrors.password = "\u8bf7\u586b\u5199\u5bc6\u7801\u3002";
    } else if (password.length < 6) {
      nextErrors.password = "\u5bc6\u7801\u81f3\u5c11\u9700\u67096\u4f4d\u5b57\u7b26\u3002";
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
      await new Promise((resolve) => setTimeout(resolve, 480));
      setSession({
        email,
        displayName: name,
      });
      router.replace("/dashboard");
    } catch (error) {
      console.error("register failed", error);
      setFormError("\u6ce8\u518c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
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
        <aside className="hidden flex-1 flex-col justify-between border-t border-white/10 bg-white/5 px-6 py-12 text-white md:px-10 lg:px-12 lg:py-16 lg:flex">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">
                Launch Plan
              </span>
              <h2 className="max-w-lg text-3xl font-semibold leading-snug">
                \u5f00\u542f\u4f60\u7684\u667a\u80fd\u5b66\u4e60\u8ba1\u5212\uff0c\u7531 AI \u62c5\u5fc3\u5e26\u8d70\u6bcf\u6b65\u6539\u8fdb\u3002
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-slate-200">
              {PROMISES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/40 text-xs font-semibold text-white">
                    \u2713
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-slate-300">
            \u6ce8\u518c\u5373\u53ef\u83b7\u5f97\u4e03\u5929\u521d\u59cb\u4f53\u9a8c\uff0c\u652f\u6301\u968f\u65f6\u5bfc\u51fa\u5168\u90e8\u8bad\u7ec3\u6570\u636e\u3002
          </div>
        </aside>
        <div className="w-full px-6 py-12 md:px-10 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50" />
          <div className="mt-12 max-w-md">
            <Card className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">
                  \u6b63\u5f0f\u52a0\u5165\u5b66\u4e60\u642d\u5b50
                </CardTitle>
                <CardDescription className="text-base text-slate-200">
                  \u8f93\u5165\u57fa\u7840\u4fe1\u606f\uff0c\u6211\u4eec\u5c06\u4e3a\u4f60\u751f\u6210\u4e2a\u6027\u5316\u5b66\u4e60\u65b9\u6848\u3002
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">\u59d3\u540d</Label>
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
                    <Label htmlFor="email">\u90ae\u7bb1</Label>
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
                    <Label htmlFor="password">\u5bc6\u7801</Label>
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
                      \u63a8\u835010\u4f4d\u4ee5\u4e0a\uff0c\u5305\u62ec\u6570\u5b57\u4e0e\u5b57\u6bcd\u7ec4\u5408\u3002
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
                    {loading ? "\u6b63\u5728\u5458\u70b9\u5b66\u4e60\u65c5\u7a0b..." : "\u7acb\u5373\u52a0\u5165\u5b66\u4e60\u65c5\u7a0b"}
                  </Button>
                </form>
                <p className="text-sm text-slate-300">
                  \u5df2\u6709\u8d26\u53f7\uff1f
                  <Button asChild variant="ghost" size="sm" className="px-1 text-sky-300">
                    <Link href="/signin">\u7ee7\u7eed\u5b66\u4e60\u65c5\u7a0b</Link>
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
