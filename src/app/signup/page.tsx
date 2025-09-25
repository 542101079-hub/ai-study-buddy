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
    label: "备考阶段",
    headline: "冲刺考试 / 证书",
    description: "匹配考试大纲与刷题节奏，帮你在冲刺期梳理重点。",
  },
  {
    value: "skills",
    label: "技能提升",
    headline: "构建可迁移能力",
    description: "针对技能空档拆解练习路径，持续积累项目亮点。",
  },
  {
    value: "job",
    label: "就业准备",
    headline: "瞄准岗位 / 面试",
    description: "结合岗位画像生成面试剧本和行为题复盘，巩固临场信心。",
  },
] as const;

const INSIGHTS = [
  "基于阶段提供学习向导",
  "摘要目标连接在整体进度",
  "个性化面试模拟与反馈",
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
      nextErrors.name = "请填写姓名。";
    }

    if (!email) {
      nextErrors.email = "请填写邮箱地址。";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "请输入有效的邮箱地址。";
    }

    if (!password) {
      nextErrors.password = "请填写密码。";
    } else if (password.length < 6) {
      nextErrors.password = "密码至少需要6位字符。";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "请再次输入密码。";
    } else if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = "两次输入的密码不一致。";
    }

    if (!stage) {
      nextErrors.stage = "请选择当前阶段。";
    }

    if (!consentChecked) {
      nextErrors.consent = "要继续，需同意隐私政策与服务条款。";
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
      await new Promise((resolve) => setTimeout(resolve, 520));
      setSession({
        email,
        displayName: name,
      });
      router.replace("/dashboard");
    } catch (error) {
      console.error("signup failed", error);
      setFormError("注册失败，请稍后重试。");
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
        <div className="absolute right-[-12%] bottom-1/5 h-[420px] w-[420px] rounded-full bg-purple-500/30 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[240px]" />
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="order-2 flex w-full flex-col justify-between border-t border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 px-6 py-10 text-white sm:px-10 lg:order-1 lg:w-1/2 lg:border-t-0 lg:border-r lg:px-12 lg:py-16">
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-violet-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
                AI Talent Path
              </span>
              <h2 className="max-w-lg text-3xl font-semibold leading-snug">
                基于你的通货能练策划，AI 搭子为你采集面试目标数据和就业路线。
              </h2>
            </div>
            <StudyBuddyIllustration className="w-full" />
            <ul className="space-y-4 text-sm text-white/92">
              {INSIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-violet-700/60 bg-violet-800/55 p-4 text-white/90"
                >
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-700/60 text-xs font-semibold text-white">
                    ★
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-white/92">
            加入后按项目分类立即生成个性化提高方案。
          </div>
        </aside>
        <div className="order-1 w-full px-6 py-10 sm:px-10 lg:order-2 lg:w-1/2 lg:px-12 lg:py-16">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="mt-12 max-w-xl">
            <Card className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <CardTitle className="text-3xl font-semibold">
                  创建学生求职者账号
                </CardTitle>
                <CardDescription className="text-base text-white/92">
                  输入基础信息，我们将为你生成个性化学习方案。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
                      />
                      {fieldErrors.name && (
                        <p id="signup-name-error" className="text-xs text-red-300">
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
                      <Label htmlFor="password">密码</Label>
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
                      <Label htmlFor="confirmPassword">确认密码</Label>
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
                    <Label>当前阶段</Label>
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
                              "flex h-full flex-col gap-1 rounded-xl border border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 p-4 text-left text-white/90 transition-all",
                              "hover:border-violet-500/80 hover:bg-violet-800/65 hover:text-white",
                              isActive &&
                                "border-indigo-400/70 bg-indigo-700/60 text-white shadow-[0_18px_45px_rgba(79,70,229,0.3)]",
                              loading && "cursor-not-allowed opacity-70",
                            )}
                          >
                            <span className="text-sm font-semibold text-white">{item.label}</span>
                            <span className="text-xs text-white/80">{item.headline}</span>
                            <span className="text-xs text-white/85">{item.description}</span>
                          </button>
                        );
                      })}
                    </div>
                    {stageMeta && (
                      <div className="rounded-lg border border-violet-700/60 bg-violet-800/55 px-4 py-3 text-xs text-white/90">
                        已选择：{stageMeta.label} · {stageMeta.headline}
                      </div>
                    )}
                    {fieldErrors.stage && (
                      <p className="text-xs text-red-300">{fieldErrors.stage}</p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="goalExam">考试科目 / 证书</Label>
                      <Input
                        id="goalExam"
                        name="goalExam"
                        type="text"
                        placeholder="例：软考中级 / 雅思"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goalJob">岗位方向</Label>
                      <Input
                        id="goalJob"
                        name="goalJob"
                        type="text"
                        placeholder="例：前端开发 / 数据分析"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">附加说明 (可选)</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder="简单描述你的学习需求或时间安排。"
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 text-sm text-white/90">
                      <input
                        type="checkbox"
                        name="consent"
                        className="mt-1 h-4 w-4 rounded border border-white/20 bg-white/10"
                        disabled={loading}
                        aria-invalid={Boolean(fieldErrors.consent)}
                        aria-describedby={fieldErrors.consent ? "signup-consent-error" : undefined}
                      />
                      <span>
                        我已阅读并同意
                        <a
                          href="#privacy"
                          className="px-1 text-violet-200 underline-offset-2 hover:underline"
                        >
                          隐私政策
                        </a>
                        与
                        <a
                          href="#terms"
                          className="px-1 text-violet-200 underline-offset-2 hover:underline"
                        >
                          服务条款
                        </a>
                        ，并允许 AI Study Buddy 使用我的数据为我建议学习路径。
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
                    {loading ? "正在点亮学习旅程..." : "开始规划学习旅程"}
                  </Button>
                </form>
                <p className="text-sm text-white/92">
                  已有账号？
                  <Button asChild variant="ghost" size="sm" className="px-1 text-violet-200">
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


