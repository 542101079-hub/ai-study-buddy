"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAuthRequest, type AuthFieldErrors } from "@/lib/auth/client";

interface MessageState {
  text: string;
  variant: "success" | "error";
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface CreateProfileFormProps {
  userEmail: string;
  userName: string;
}

export function CreateProfileForm({ userEmail, userName }: CreateProfileFormProps) {
  const router = useRouter();
  // 不使用useAuthRedirect，因为这个页面专门为已登录但没有profile的用户设计

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadTenants() {
      try {
        const response = await fetch("/api/tenants");
        if (!response.ok) {
          throw new Error("failed");
        }
        const payload = (await response.json()) as { tenants?: Array<{ id: string; name: string; slug: string }> };
        const list = payload.tenants ?? [];
        setTenants(list);
        setSelectedTenantId(list[0]?.id ?? "");
        setTenantError(list.length === 0 ? "暂无可用的工作区，请联系管理员" : null);
      } catch (error) {
        console.error("[create-profile] load tenants failed", error);
        setTenantError("无法加载工作区列表，请稍后再试");
      } finally {
        setTenantLoading(false);
      }
    }

    loadTenants();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const username = (formData.get("username") as string | null)?.trim() ?? "";
    const tenantId = ((formData.get("tenantId") as string | null)?.trim() ?? selectedTenantId ?? "");

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const result = await submitAuthRequest("/api/auth/create-profile", {
        name,
        tenantId,
        username: username.length > 0 ? username : undefined,
      });

      if (result.ok) {
        setMessage({
          variant: "success",
          text: result.payload?.message ?? "档案创建成功",
        });
        router.replace("/dashboard");
        router.refresh();
      } else {
        setMessage({
          variant: "error",
          text: result.payload?.message ?? "创建档案失败，请稍后再试",
        });
        setFieldErrors(result.payload?.fieldErrors ?? {});
      }
    } catch (error) {
      console.error("[create-profile] submit failed", error);
      setMessage({ variant: "error", text: "创建档案失败，请稍后再试" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const disableSubmit = isSubmitting || tenantLoading || !selectedTenantId;

  return (
    <form className="space-y-7" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="tenantId" className="text-sm text-slate-200">
          选择工作区
        </Label>
        <select
          id="tenantId"
          name="tenantId"
          value={selectedTenantId}
          onChange={(event) => {
            setSelectedTenantId(event.target.value);
            setFieldErrors((prev) => {
              const { tenantId, ...rest } = prev;
              return rest;
            });
            setTenantError(null);
          }}
          className="w-full rounded border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
          disabled={tenantLoading || isSubmitting || !!tenantError}
          title="选择工作区"
          required
        >
          {tenantLoading && <option value="">正在加载...</option>}
          {!tenantLoading && tenants.length === 0 && <option value="">暂无可加入的工作区</option>}
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}（{tenant.slug}）
            </option>
          ))}
        </select>
        {fieldErrors.tenantId && <p className="text-sm text-rose-300/95">{fieldErrors.tenantId}</p>}
        {tenantError && !fieldErrors.tenantId && (
          <p className="text-sm text-rose-300/95">{tenantError}</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-slate-200">
            姓名
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="请输入姓名"
            defaultValue={userName}
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
        <Label className="text-sm text-slate-200">邮箱</Label>
        <div className="rounded border border-white/15 bg-slate-950/50 px-3 py-2 text-sm text-white/70">
          {userEmail}
        </div>
        <p className="text-xs text-slate-400">邮箱地址无法修改</p>
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

      <div className="space-y-3">
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-500 text-base shadow-[0_18px_45px_rgba(124,58,237,0.35)] hover:from-fuchsia-500 hover:via-violet-500 hover:to-indigo-400"
          disabled={disableSubmit}
        >
          {isSubmitting ? "正在创建档案..." : "创建学习档案"}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full text-white/70 hover:text-white"
          onClick={() => router.push("/dashboard")}
        >
          暂时跳过，直接使用
        </Button>
      </div>
    </form>
  );
}
