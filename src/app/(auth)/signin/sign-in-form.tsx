"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
};

type SignInStage = "credentials" | "tenant";

const TENANT_REQUIRED_MESSAGE = "请选择一个学习空间后继续";
const TENANT_FETCH_ERROR_MESSAGE = "学习空间列表加载失败，请稍后重试";
const NO_TENANT_AVAILABLE_MESSAGE = "当前还没有可用的学习空间，请联系管理员或创建一个新空间";
const CREDENTIALS_INCOMPLETE_MESSAGE = "请填写邮箱和密码";

export function SignInForm() {
  const router = useRouter();
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  const [stage, setStage] = useState<SignInStage>("credentials");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [credentials, setCredentials] = useState({ email: "", password: "", remember: false });

  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantFetchError, setTenantFetchError] = useState<string | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [tenantsRequestId, setTenantsRequestId] = useState(0);

  useEffect(() => {
    if (stage !== "tenant") {
      return;
    }

    let cancelled = false;

    async function loadTenants() {
      setIsLoadingTenants(true);
      setTenantFetchError(null);

      try {
        const response = await fetch("/api/tenants", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load tenants: ${response.status}`);
        }

        const payload = (await response.json()) as { tenants?: TenantOption[] | null };
        if (cancelled) {
          return;
        }

        const fetchedTenants = Array.isArray(payload.tenants) ? payload.tenants : [];
        setTenantOptions(fetchedTenants);
        setSelectedTenantId((current) => {
          if (current && fetchedTenants.some((tenant) => tenant.id === current)) {
            return current;
          }
          if (fetchedTenants.length === 1) {
            return fetchedTenants[0].id;
          }
          return "";
        });
      } catch (error) {
        console.error("[signin] load tenants failed", error);
        if (!cancelled) {
          setTenantOptions([]);
          setSelectedTenantId("");
          setTenantFetchError(TENANT_FETCH_ERROR_MESSAGE);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTenants(false);
        }
      }
    }

    void loadTenants();

    return () => {
      cancelled = true;
    };
  }, [stage, tenantsRequestId]);

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setCredentials((prev) => ({ ...prev, email: value }));
    setFieldErrors((prev) => {
      if (!prev.email) {
        return prev;
      }
      const next = { ...prev };
      delete next.email;
      return next;
    });
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setCredentials((prev) => ({ ...prev, password: value }));
    setFieldErrors((prev) => {
      if (!prev.password) {
        return prev;
      }
      const next = { ...prev };
      delete next.password;
      return next;
    });
  }

  function handleRememberChange(event: ChangeEvent<HTMLInputElement>) {
    setCredentials((prev) => ({ ...prev, remember: event.target.checked }));
  }

  function handleTenantChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setSelectedTenantId(value);
    setFieldErrors((prev) => {
      if (!prev.tenantId) {
        return prev;
      }
      const next = { ...prev };
      delete next.tenantId;
      return next;
    });
  }

  function handleRetryTenants() {
    setTenantsRequestId((value) => value + 1);
  }

  function handleBackToCredentials() {
    if (isSubmitting) {
      return;
    }
    setStage("credentials");
    setMessage(null);
    setTenantFetchError(null);
    setFieldErrors((prev) => {
      if (!prev.tenantId) {
        return prev;
      }
      const next = { ...prev };
      delete next.tenantId;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = credentials.email.trim();
    const password = credentials.password;

    if (stage === "credentials") {
      const nextErrors: AuthFieldErrors = {};
      if (!trimmedEmail) {
        nextErrors.email = "请填写邮箱";
      }
      if (!password) {
        nextErrors.password = "请填写密码";
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
        setMessage({ variant: "error", text: CREDENTIALS_INCOMPLETE_MESSAGE });
        return;
      }

      setCredentials((prev) => ({ ...prev, email: trimmedEmail }));
      setSelectedTenantId("");
      setTenantOptions([]);
      setTenantFetchError(null);
      setFieldErrors({});
      setMessage({ variant: "success", text: TENANT_REQUIRED_MESSAGE });
      setStage("tenant");
      setTenantsRequestId((value) => value + 1);
      return;
    }

    const tenantId = selectedTenantId.trim();
    if (!tenantId) {
      setFieldErrors((prev) => ({ ...prev, tenantId: TENANT_REQUIRED_MESSAGE }));
      setMessage({ variant: "error", text: TENANT_REQUIRED_MESSAGE });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const result = await submitAuthRequest("/api/auth/login", {
        email: trimmedEmail,
        password,
        remember: credentials.remember,
        tenantId,
      });

      if (result.ok) {
        const role = result.payload?.user?.profile?.role;
        const availableTenants = Array.isArray(result.payload?.tenants)
          ? (result.payload?.tenants as TenantOption[])
          : [];
        const fallbackTenant = (result.payload?.tenant as TenantOption | undefined) ?? null;
        if (fallbackTenant && !availableTenants.some((tenantOption) => tenantOption.id === fallbackTenant.id)) {
          availableTenants.unshift(fallbackTenant);
        }

        try {
          sessionStorage.setItem('availableTenants', JSON.stringify(availableTenants));
          sessionStorage.setItem('activeTenantId', tenantId);
        } catch (error) {
          console.warn('[signin] failed to cache tenant list', error);
        }

        const redirectTo = role === 'admin'
          ? '/tenant-select'
          : availableTenants.length > 1
            ? '/tenant-choice'
            : '/dashboard';

        setMessage({
          variant: "success",
          text: result.payload?.message ?? "登录成功",
        });
        router.replace(redirectTo);
        router.refresh();
      } else {
        setMessage({
          variant: "error",
          text: result.payload?.message ?? "登录失败，请稍后重试",
        });
        setFieldErrors(result.payload?.fieldErrors ?? {});
        if (result.status === 401 || result.status === 400) {
          setStage("credentials");
        }
      }
    } catch (error) {
      console.error("[signin] submit failed", error);
      setMessage({ variant: "error", text: "登录失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedTenant = tenantOptions.find((tenant) => tenant.id === selectedTenantId);
  const isTenantStage = stage === "tenant";

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
          placeholder="请输入邮箱地址"
          required
          value={credentials.email}
          onChange={handleEmailChange}
          disabled={isSubmitting || isTenantStage}
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
          placeholder="至少 8 个字符"
          required
          value={credentials.password}
          onChange={handlePasswordChange}
          disabled={isSubmitting || isTenantStage}
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
            checked={credentials.remember}
            onChange={handleRememberChange}
            disabled={isSubmitting || isTenantStage}
          />
          <span>记住我</span>
        </label>
        <Link href="/" className="text-violet-200 transition hover:text-white">
          忘记密码？
        </Link>
      </div>

      {isTenantStage && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tenantId" className="text-sm text-slate-200">
              学习空间
            </Label>
            <select
              id="tenantId"
              name="tenantId"
              value={selectedTenantId}
              onChange={handleTenantChange}
              disabled={isSubmitting || isLoadingTenants || tenantOptions.length === 0}
              required
              className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="" disabled>
                {isLoadingTenants ? "加载学习空间中…" : "请选择要登录的学习空间"}
              </option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {`${tenant.name} (${tenant.slug})`}
                </option>
              ))}
            </select>
            {tenantFetchError && (
              <p className="text-xs text-amber-300/90">
                {tenantFetchError}
                <button
                  type="button"
                  onClick={handleRetryTenants}
                  className="ml-2 text-violet-200 underline-offset-2 hover:underline"
                >
                  重试
                </button>
              </p>
            )}
            {!tenantFetchError && !isLoadingTenants && tenantOptions.length === 0 && (
              <p className="text-xs text-amber-200/80">{NO_TENANT_AVAILABLE_MESSAGE}</p>
            )}
            {fieldErrors.tenantId && (
              <p className="text-sm text-rose-300/95">{fieldErrors.tenantId}</p>
            )}
          </div>

          {selectedTenant && (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-3">
              {selectedTenant.logo_url ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white/10">
                  <img
                    src={selectedTenant.logo_url}
                    alt={`${selectedTenant.name} logo`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-base font-semibold">
                  {selectedTenant.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/90">{selectedTenant.name}</p>
                <p className="truncate text-xs text-white/70">
                  {selectedTenant.tagline ?? "该空间暂未设置简介"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isTenantStage && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToCredentials}
            disabled={isSubmitting || isLoadingTenants}
            className="sm:w-auto"
          >
            返回账号信息
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 text-base shadow-[0_18px_45px_rgba(79,70,229,0.35)] hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400"
          disabled={
            isSubmitting || (isTenantStage ? !selectedTenantId || isLoadingTenants : false)
          }
        >
          {isSubmitting
            ? (isTenantStage ? "正在登录…" : "正在处理…")
            : isTenantStage
              ? "登录"
              : "下一步"}
        </Button>
      </div>

      <p className="text-center text-sm text-slate-200/80">
        还没有账号？
        <Link href="/signup" className="ml-2 text-violet-200 transition hover:text-white">
          立即注册
        </Link>
      </p>
    </form>
  );
}


