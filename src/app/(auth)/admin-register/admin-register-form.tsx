"use client";

import { FormEvent, useState } from "react";
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

export function AdminRegisterForm() {
  const router = useRouter();
  useAuthRedirect({ when: "authenticated", redirectTo: "/tenant-select" });

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

    const payload = {
      tenantName: (formData.get("tenantName") as string | null)?.trim() ?? "",
      tenantLogoUrl: (formData.get("tenantLogoUrl") as string | null)?.trim() ?? "",
      tenantTagline: (formData.get("tenantTagline") as string | null)?.trim() ?? "",
      name: (formData.get("name") as string | null)?.trim() ?? "",
      email: (formData.get("email") as string | null)?.trim() ?? "",
      password: (formData.get("password") as string | null) ?? "",
      username: ((formData.get("username") as string | null)?.trim() ?? "") || undefined,
    };

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const result = await submitAuthRequest("/api/auth/admin-register", payload);

      if (result.ok) {
        setMessage({
          variant: "success",
          text: result.payload?.message ?? "管理员创建成功",
        });
        router.replace("/tenant-select");
        router.refresh();
      } else {
        setMessage({
          variant: "error",
          text: result.payload?.message ?? "注册失败，请稍后再试",
        });
        setFieldErrors(result.payload?.fieldErrors ?? {});
      }
    } catch (error) {
      console.error("[admin-register] submit failed", error);
      setMessage({ variant: "error", text: "注册失败，请稍后再试" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenantName" className="text-sm text-slate-200">
            租户名称
          </Label>
          <Input
            id="tenantName"
            name="tenantName"
            placeholder="示例：星火学习工作室"
            autoComplete="organization"
            required
            disabled={isSubmitting}
          />
          {fieldErrors.tenantName && (
            <p className="text-sm text-rose-300/95">{fieldErrors.tenantName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenantLogoUrl" className="text-sm text-slate-200">
            租户 Logo 链接
          </Label>
          <Input
            id="tenantLogoUrl"
            name="tenantLogoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            required
            disabled={isSubmitting}
          />
          {fieldErrors.tenantLogoUrl && (
            <p className="text-sm text-rose-300/95">{fieldErrors.tenantLogoUrl}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tenantTagline" className="text-sm text-slate-200">
          租户标语
        </Label>
        <Input
          id="tenantTagline"
          name="tenantTagline"
          placeholder="用一句话概括团队使命"
          required
          disabled={isSubmitting}
        />
        {fieldErrors.tenantTagline && (
          <p className="text-sm text-rose-300/95">{fieldErrors.tenantTagline}</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-slate-200">
            管理员姓名
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="张三"
            autoComplete="name"
            required
            disabled={isSubmitting}
          />
          {fieldErrors.name && <p className="text-sm text-rose-300/95">{fieldErrors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm text-slate-200">
            管理员用户名（可选）
          </Label>
          <Input
            id="username"
            name="username"
            placeholder="只允许字母、数字或下划线"
            disabled={isSubmitting}
          />
          {fieldErrors.username && (
            <p className="text-sm text-rose-300/95">{fieldErrors.username}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-slate-200">
          管理员邮箱
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.com"
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
          设置密码
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
        {isSubmitting ? "正在创建管理员..." : "提交并创建工作区"}
      </Button>
    </form>
  );
}
