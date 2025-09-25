"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

const STAGES = [
  {
    value: "exam",
    label: "\u5907\u8003\u9636\u6bb5",
    headline: "\u51b2\u523a\u8003\u8bd5 / \u8bc1\u4e66",
    description: "\u5339\u914d\u8003\u8bd5\u5927\u7eb2\u4e0e\u5237\u9898\u8282\u594f\uff0c\u5e2e\u4f60\u5728\u51b2\u523a\u671f\u68b3\u7406\u91cd\u70b9\u3002",
  },
  {
    value: "skills",
    label: "\u6280\u80fd\u63d0\u5347",
    headline: "\u6784\u5efa\u53ef\u8fc1\u79fb\u80fd\u529b",
    description: "\u9488\u5bf9\u6280\u80fd\u7a7a\u6863\u62c6\u89e3\u7ec3\u4e60\u8def\u5f84\uff0c\u6301\u7eed\u79ef\u7d2f\u9879\u76ee\u4eae\u70b9\u3002",
  },
  {
    value: "job",
    label: "\u5c31\u4e1a\u51c6\u5907",
    headline: "\u7784\u51c6\u5c97\u4f4d / \u9762\u8bd5",
    description: "\u7ed3\u5408\u5c97\u4f4d\u753b\u50cf\u751f\u6210\u9762\u8bd5\u5267\u672c\u548c\u884c\u4e3a\u9898\u590d\u76d8\uff0c\u5de9\u56fa\u4e34\u573a\u4fe1\u5fc3\u3002",
  },
] as const;

const INSIGHTS = [
  "\u57fa\u4e8e\u9636\u6bb5\u63d0\u4f9b\u5b66\u4e60\u5411\u5bfc",
  "\u6458\u8981\u76ee\u6807\u8fde\u63a5\u5728\u6574\u4f53\u8fdb\u5ea6",
  "\u4e2a\u6027\u5316\u9762\u8bd5\u6a21\u62df\u4e0e\u53cd\u9988",
];

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  stage?: string;
  consent?: string;
};

type StageValue = (typeof STAGES)[number]["value"];

export default function SignupPage() {
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedStage, setSelectedStage] = useState<StageValue | "">("");

  const stageMeta = useMemo(() => {
    return STAGES.find((item) => item.value === selectedStage) ?? null;
  }, [selectedStage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();
    const stage = (selectedStage || String(formData.get("stage") ?? "")).trim();
    const goalExam = String(formData.get("goalExam") ?? "").trim();
    const goalJob = String(formData.get("goalJob") ?? "").trim();
    const consentChecked = formData.get("consent") === "on";

    const nextErrors: FieldErrors = {};

    if (!name) {
      nextErrors.name = "\u8bf7\u586b\u5199\u59d3\u540d\u3002";
    }

    if (!email) {
      nextErrors.email = "\u8bf7\u586b\u5199\u90ae\u7bb1\u5730\u5740\u3002";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002";
    }

    if (!password) {
      nextErrors.password = "\u8bf7\u586b\u5199\u5bc6\u7801\u3002";
    } else if (password.length < 6) {
      nextErrors.password = "\u5bc6\u7801\u81f3\u5c11\u9700\u89816\u4f4d\u5b57\u7b26\u3002";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "\u8bf7\u518d\u6b21\u8f93\u5165\u5bc6\u7801\u3002";
    } else if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = "\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4\u3002";
    }

    if (!stage) {
      nextErrors.stage = "\u8bf7\u9009\u62e9\u5f53\u524d\u9636\u6bb5\u3002";
    }

    if (!consentChecked) {
      nextErrors.consent = "\u8981\u7ee7\u7eed\uff0c\u9700\u540c\u610f\u9690\u79c1\u653f\u7b56\u4e0e\u670d\u52a1\u6761\u6b3e\u3002";
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
      await new Promise((resolve) => setTimeout(resolve, 520));
      setSession({
        email,
        displayName: name,
      });
      router.replace("/dashboard");
    } catch (error) {
      console.error("signup failed", error);
      setFormError("\u6ce8\u518c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.24),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.18)_0%,rgba(56,189,248,0.1)_38%,transparent_78%)] opacity-75" />
        <div className="absolute left-[-10%] top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/30 blur-[200px]" />
        <div className="absolute right-[-12%] bottom-1/5 h-[420px] w-[420px] rounded-full bg-sky-400/30 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[240px]" />
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="order-2 flex w-full flex-col justify-between border-t border-white/10 bg-white/5 px-6 py-10 text-white sm:px-10 lg:order-1 lg:w-1/2 lg:border-t-0 lg:border-r lg:px-12 lg:py-16">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">
                AI Talent Path
              </span>
              <h2 className="max-w-lg text-3xl font-semibold leading-snug">
                \u57fa\u4e8e\u4f60\u7684\u901a\u8d27\u80fd\u7ec3\u7b56\u5212\uff0cAI \u642d\u5b50\u4e3a\u4f60\u91c7\u96c6\u9762\u8bd5\u76ee\u6807\u6570\u636e\u548c\u5c31\u4e1a\u8def\u7ebf\u3002
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-slate-200">
              {INSIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/35 text-xs font-semibold text-white">
                    \u2605
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-slate-300">
            \u52a0\u5165\u540e\u6309\u9879\u76ee\u5206\u7c7b\u7acb\u5373\u751f\u6210\u4e2a\u6027\u5316\u63d0\u9ad8\u65b9\u6848\u3002
          </div>
        </aside>
        <div className="order-1 w-full px-6 py-10 sm:px-10 lg:order-2 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50" />
          <div className="mt-12 max-w-xl">
            <Card className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">
                  \u521b\u5efa\u5b66\u751f\u6c42\u804c\u8005\u8d26\u53f7
                </CardTitle>
                <CardDescription className="text-base text-slate-200">
                  \u8f93\u5165\u57fa\u7840\u4fe1\u606f\uff0c\u6211\u4eec\u5c06\u4e3a\u4f60\u751f\u6210\u4e2a\u6027\u5316\u5b66\u4e60\u65b9\u6848\u3002
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
                      />
                      {fieldErrors.name && (
                        <p id="signup-name-error" className="text-xs text-red-300">
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
                        aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
                      />
                      {fieldErrors.email && (
                        <p id="signup-email-error" className="text-xs text-red-300">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
                      />
                      {fieldErrors.password && (
                        <p id="signup-password-error" className="text-xs text-red-300">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">\u786e\u8ba4\u5bc6\u7801</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="********"
                        disabled={loading}
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                        aria-describedby={fieldErrors.confirmPassword ? "signup-confirm-password-error" : undefined}
                      />
                      {fieldErrors.confirmPassword && (
                        <p id="signup-confirm-password-error" className="text-xs text-red-300">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>\u5f53\u524d\u9636\u6bb5</Label>
                    <input type="hidden" name="stage" value={selectedStage} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {STAGES.map((item) => {
                        const isActive = selectedStage === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setSelectedStage(item.value)}
                            disabled={loading}
                            aria-pressed={isActive}
                            className={cn(
                              "flex h-full flex-col gap-1 rounded-xl border border-white/10 bg-white/10 p-4 text-left transition-all",
                              "hover:border-indigo-200/60 hover:bg-white/12",
                              isActive &&
                                "border-indigo-300/60 bg-indigo-500/25 shadow-[0_18px_45px_rgba(79,70,229,0.3)]",
                              loading && "cursor-not-allowed opacity-70",
                            )}
                          >
                            <span className="text-sm font-semibold text-white">{item.label}</span>
                            <span className="text-xs text-indigo-100">{item.headline}</span>
                            <span className="text-xs text-slate-200">{item.description}</span>
                          </button>
                        );
                      })}
                    </div>
                    {stageMeta && (
                      <div className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-200">
                        \u5df2\u9009\u62e9\uff1a{stageMeta.label} \u00b7 {stageMeta.headline}
                      </div>
                    )}
                    {fieldErrors.stage && (
                      <p className="text-xs text-red-300">{fieldErrors.stage}</p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="goalExam">\u8003\u8bd5\u79d1\u76ee / \u8bc1\u4e66</Label>
                      <Input
                        id="goalExam"
                        name="goalExam"
                        type="text"
                        placeholder="\u4f8b\uff1a\u8f6f\u8003\u4e2d\u7ea7 / \u96c5\u601d"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goalJob">\u5c97\u4f4d\u65b9\u5411</Label>
                      <Input
                        id="goalJob"
                        name="goalJob"
                        type="text"
                        placeholder="\u4f8b\uff1a\u524d\u7aef\u5f00\u53d1 / \u6570\u636e\u5206\u6790"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">\u9644\u52a0\u8bf4\u660e (\u53ef\u9009)</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder="\u7b80\u5355\u63cf\u8ff0\u4f60\u7684\u5b66\u4e60\u9700\u6c42\u6216\u65f6\u95f4\u5b89\u6392\u3002"
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        name="consent"
                        className="mt-1 h-4 w-4 rounded border border-white/20 bg-white/10"
                        disabled={loading}
                        aria-invalid={Boolean(fieldErrors.consent)}
                        aria-describedby={fieldErrors.consent ? "signup-consent-error" : undefined}
                      />
                      <span>
                        \u6211\u5df2\u9605\u8bfb\u5e76\u540c\u610f
                        <a
                          href="#privacy"
                          className="px-1 text-sky-300 underline-offset-2 hover:underline"
                        >
                          \u9690\u79c1\u653f\u7b56
                        </a>
                        \u4e0e
                        <a
                          href="#terms"
                          className="px-1 text-sky-300 underline-offset-2 hover:underline"
                        >
                          \u670d\u52a1\u6761\u6b3e
                        </a>
                        \uff0c\u5e76\u5141\u8bb8 AI Study Buddy \u4f7f\u7528\u6211\u7684\u6570\u636e\u4e3a\u6211\u5efa\u8bae\u5b66\u4e60\u8def\u5f84\u3002
                      </span>
                    </label>
                    {fieldErrors.consent && (
                      <p id="signup-consent-error" className="text-xs text-red-300">
                        {fieldErrors.consent}
                      </p>
                    )}
                  </div>
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      {formError}
                    </div>
                  )}
                  <Button type="submit" size="lg" disabled={loading} className="w-full shadow-[0_12px_35px_rgba(79,70,229,0.32)]">
                    {loading ? "\u6b63\u5728\u70b9\u4eae\u5b66\u4e60\u65c5\u7a0b..." : "\u5f00\u59cb\u89c4\u5212\u5b66\u4e60\u65c5\u7a0b"}
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


