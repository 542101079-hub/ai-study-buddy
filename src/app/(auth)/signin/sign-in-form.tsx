"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { submitAuthRequest, type AuthFieldErrors } from "@/lib/auth/client";

interface MessageState {
  text: string;
  variant: "success" | "error";
}

export function SignInForm() {
  const router = useRouter();
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const remember = formData.get("remember") === "on";

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const result = await submitAuthRequest("/api/auth/login", {
        email,
        password,
        remember,
      });

      if (result.ok) {
        const role = result.payload?.user?.profile?.role;
        const redirectTo = role === "admin" ? "/tenant-select" : "/dashboard";
        setMessage({
          variant: "success",
          text: result.payload?.message ?? "登录成功",
        });
        router.replace(redirectTo);
        router.refresh();
      } else {
        setMessage({
          variant: "error",
          text: result.payload?.message ?? "登录失败，请稍后再试",
        });
        setFieldErrors(result.payload?.fieldErrors ?? {});
      }
    } catch (error) {
      console.error("[signin] submit failed", error);
      setMessage({ variant: "error", text: "登录失败，请稍后再试" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-slate-200">
          邮箱
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          disabled={isSubmitting}
        />
        {fieldErrors.email && (
          <p className="text-sm text-rose-300/95">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm text-slate-200">
          密码
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="至少 8 位字符"
          required
          disabled={isSubmitting}
        />
        {fieldErrors.password && (
          <p className="text-sm text-rose-300/95">{fieldErrors.password}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-200/90">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border-violet-500/60 bg-slate-900/60 text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            disabled={isSubmitting}
          />
          <span>记住我</span>
        </label>
        <Link href="/" className="text-violet-200 transition hover:text-white">
          忘记密码？
        </Link>
      </div>

      {message && (
        <div
          className={
            message.variant === "success"
              ? "rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
              : "rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
          }
        >
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 text-base shadow-[0_18px_45px_rgba(79,70,229,0.35)] hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400"
        disabled={isSubmitting}
      >
        {isSubmitting ? "正在登录..." : "登录"}
      </Button>

      <p className="text-center text-sm text-slate-200/80">
        还没有账号？
        <Link href="/signup" className="ml-2 text-violet-200 transition hover:text-white">
          立即注册
        </Link>
      </p>
    </form>
  );
}
