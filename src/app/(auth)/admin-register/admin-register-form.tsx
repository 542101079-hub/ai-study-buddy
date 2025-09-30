"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { submitAuthRequest, type AuthFieldErrors } from "@/lib/auth/client";
import { uploadTenantLogoToStorage } from "@/utils/supabaseClient";

interface MessageState {
  text: string;
  variant: "success" | "error";
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export function AdminRegisterForm() {
  const router = useRouter();
  useAuthRedirect({ when: "authenticated", redirectTo: "/tenant-select" });
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (isUploadingLogo) {
      setMessage({ variant: "error", text: "Logo 上传中，请完成后再提交" });
      return;
    }

    const tenantNameValue = (formData.get("tenantName") as string | null)?.trim() ?? "";
    const formLogoUrl = (formData.get("tenantLogoUrl") as string | null)?.trim() ?? "";
    const resolvedLogoUrl = (logoUrl || formLogoUrl).trim();

    const nextErrors: AuthFieldErrors = {};
    if (!tenantNameValue) {
      nextErrors.tenantName = "请填写租户名称";
    }
    if (!resolvedLogoUrl) {
      nextErrors.tenantLogoUrl = "请先上传 Logo 图片";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      setMessage({ variant: "error", text: "请完善表单信息后再提交" });
      return;
    }

    const payload = {
      tenantName: tenantNameValue,
      tenantLogoUrl: resolvedLogoUrl,
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

  function handleLogoButtonClick() {
    if (isSubmitting || isUploadingLogo) {
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const mimeType = (file.type || "").toLowerCase();
    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
    if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType) && !ALLOWED_LOGO_EXTENSIONS.has(extension)) {
      setFieldErrors((prev) => ({
        ...prev,
        tenantLogoUrl: "仅支持 PNG、JPG、JPEG 或 WebP 格式的 Logo",
      }));
      setMessage({ variant: "error", text: "Logo 上传失败：文件格式不支持" });
      event.target.value = "";
      return;
    }

    const sizeLimitMb = Math.round(MAX_LOGO_SIZE_BYTES / (1024 * 1024));
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        tenantLogoUrl: `Logo 图片大小不能超过 ${sizeLimitMb} MB`,
      }));
      setMessage({ variant: "error", text: `Logo 上传失败：图片大小超过 ${sizeLimitMb} MB 限制` });
      event.target.value = "";
      return;
    }

    setIsUploadingLogo(true);
    setMessage((prev) => (prev?.variant === "error" ? null : prev));
    setFieldErrors((prev) => {
      if (!prev.tenantLogoUrl) {
        return prev;
      }
      const next = { ...prev };
      delete next.tenantLogoUrl;
      return next;
    });

    try {
      const tenantNameValue = (
        (event.currentTarget.form?.elements.namedItem("tenantName") as HTMLInputElement | null)?.value ?? ""
      ).trim();

      const { publicUrl } = await uploadTenantLogoToStorage(file, tenantNameValue);

      setLogoUrl(publicUrl);
      setLogoFileName(file.name);
    } catch (error) {
      console.error("[admin-register] logo upload failed", error);
      setFieldErrors((prev) => ({
        ...prev,
        tenantLogoUrl: "Logo 上传失败，请稍后再试",
      }));
      setMessage({ variant: "error", text: "Logo 上传失败，请稍后再试" });
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
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
          <Label htmlFor="tenantLogoUpload" className="text-sm text-slate-200">
            租户 Logo
          </Label>
          <input
            ref={fileInputRef}
            id="tenantLogoUpload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoFileChange}
            disabled={isSubmitting || isUploadingLogo}
          />
          <input type="hidden" name="tenantLogoUrl" value={logoUrl} readOnly />
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-fit border-dashed border-white/20 text-white/85 hover:border-white/45 hover:text-white"
              onClick={handleLogoButtonClick}
              disabled={isSubmitting || isUploadingLogo}
            >
              {isUploadingLogo ? "正在上传..." : logoUrl ? "重新上传 Logo" : "上传 Logo"}
            </Button>
            {logoUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <img
                  src={logoUrl}
                  alt="租户 Logo 预览"
                  className="h-12 w-12 rounded-md object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/90">{logoFileName ?? "已上传的 Logo"}</p>
                  <p className="text-xs text-slate-200/70">重新上传可替换当前 Logo。</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-200/80">支持 PNG、JPG、JPEG、WebP，最大 5 MB。</p>
            )}
          </div>
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
