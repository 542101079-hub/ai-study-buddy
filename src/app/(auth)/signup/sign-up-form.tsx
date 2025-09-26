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

export function SignUpForm() {
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

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const username = (formData.get("username") as string | null)?.trim() ?? "";

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const result = await submitAuthRequest("/api/auth/register", {
        name,
        email,
        password,
        username: username.length > 0 ? username : undefined,
      });

      if (result.ok) {
        setMessage({
          variant: "success",
          text: result.payload?.message ?? "注册成功",
        });
        router.replace("/dashboard");
        router.refresh();
      } else {
        setMessage({
          variant: "error",
          text: result.payload?.message ?? "注册失败，请稍后再试",
        });
        setFieldErrors(result.payload?.fieldErrors ?? {});
      }
    } catch (error) {
      console.error("[signup] submit failed", error);
      setMessage({ variant: "error", text: "注册失败，请稍后再试" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-slate-200">
            姓名
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="你的名字"
            autoComplete="name"
            required
            disabled={isSubmitting}
          />
          {fieldErrors.name && (
            <p className="text-sm text-rose-300/95">{fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm text-slate-200">
            用户名（可选）
          </Label>
          <Input
            id="username"
            name="username"
            placeholder="仅限字母、数字或下划线"
            disabled={isSubmitting}
          />
          {fieldErrors.username && (
            <p className="text-sm text-rose-300/95">{fieldErrors.username}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-slate-200">
          邮箱
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
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
          placeholder="至少 8 位字符"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
        {fieldErrors.password && (
          <p className="text-sm text-rose-300/95">{fieldErrors.password}</p>
        )}
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
        className="w-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-500 text-base shadow-[0_18px_45px_rgba(124,58,237,0.35)] hover:from-fuchsia-500 hover:via-violet-500 hover:to-indigo-400"
        disabled={isSubmitting}
      >
        {isSubmitting ? "正在创建账号..." : "立即注册"}
      </Button>

      <p className="text-center text-sm text-slate-200/80">
        已有账号？
        <Link href="/signin" className="ml-2 text-violet-200 transition hover:text-white">
          直接登录
        </Link>
      </p>
    </form>
  );
}
