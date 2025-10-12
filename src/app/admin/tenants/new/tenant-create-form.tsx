"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadTenantLogoToStorage } from "@/utils/supabaseClient";

interface FieldErrors {
  tenantName?: string;
  tenantSlug?: string;
  tenantTagline?: string;
  tenantLogoUrl?: string;
}

interface MessageState {
  text: string;
  variant: "success" | "error" | "info";
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export function TenantCreateForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function resetLogoFieldErrors() {
    setFieldErrors((prev) => {
      if (!prev.tenantLogoUrl) {
        return prev;
      }
      const next = { ...prev };
      delete next.tenantLogoUrl;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isUploadingLogo) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const tenantName = (formData.get("tenantName") as string | null)?.trim() ?? "";
    const tenantSlug = (formData.get("tenantSlug") as string | null)?.trim() ?? "";
    const tenantTagline = (formData.get("tenantTagline") as string | null)?.trim() ?? "";
    const resolvedLogoUrl = logoUrl.trim();

    const nextFieldErrors: FieldErrors = {};

    if (!tenantName) {
      nextFieldErrors.tenantName = "请填写租户名称";
    }

    if (tenantSlug && !/^[a-z0-9-]+$/i.test(tenantSlug)) {
      nextFieldErrors.tenantSlug = "Slug 仅支持字母、数字和短横线";
    }


    if (!resolvedLogoUrl) {
      nextFieldErrors.tenantLogoUrl = "请上传租户 Logo";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage({ variant: "error", text: "请检查表单填写是否完整" });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setMessage({ variant: "info", text: "正在创建租户..." });

    try {
      const response = await fetch("/api/tenants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenantName,
          tagline: tenantTagline || undefined,
          logoUrl: resolvedLogoUrl,
        }),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const apiMessage = result?.message ?? "创建租户失败，请稍后再试";
        const apiFieldErrors = result?.fieldErrors as Record<string, string[]> | undefined;
        if (apiFieldErrors) {
          const mappedErrors: FieldErrors = {};
          if (Array.isArray(apiFieldErrors.name) && apiFieldErrors.name.length > 0) {
            mappedErrors.tenantName = apiFieldErrors.name[0];
          }
          if (Array.isArray(apiFieldErrors.tagline) && apiFieldErrors.tagline.length > 0) {
            mappedErrors.tenantTagline = apiFieldErrors.tagline[0];
          }
          if (Array.isArray(apiFieldErrors.logoUrl) && apiFieldErrors.logoUrl.length > 0) {
            mappedErrors.tenantLogoUrl = apiFieldErrors.logoUrl[0];
          }
          setFieldErrors((prev) => ({ ...prev, ...mappedErrors }));
        }
        setMessage({ variant: "error", text: apiMessage });
        return;
      }

      setMessage({ variant: "success", text: result?.message ?? "租户创建成功" });
      setLogoUrl("");
      setLogoFileName(null);
      form.reset();
      const tenantId = result?.tenant?.id ?? null;
      if (tenantId) {
        router.push(`/admin/tenants/${tenantId}`);
      } else {
        console.info('[tenant-create] missing tenant id in response');
        router.push("/admin");
      }
    } catch (error) {
      console.error("[tenant-create] submit failed", error);
      setMessage({ variant: "error", text: "创建租户失败，请稍后再试" });
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
    resetLogoFieldErrors();

    try {
      const tenantNameValue = (
        (event.currentTarget.form?.elements.namedItem("tenantName") as HTMLInputElement | null)?.value ?? ""
      ).trim();

      const { publicUrl } = await uploadTenantLogoToStorage(file, tenantNameValue);

      setLogoUrl(publicUrl);
      setLogoFileName(file.name);
      setMessage({ variant: "success", text: "Logo 上传成功" });
      setTimeout(() => {
        setMessage((prev) => (prev?.variant === "success" ? null : prev));
      }, 1500);
    } catch (error) {
      console.error("[tenant-create] logo upload failed", error);
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
    <Card className="border border-white/10 bg-slate-950/80 text-white shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl font-semibold">租户基础信息</CardTitle>
        <CardDescription className="text-sm text-slate-200/80">
          填写租户名称、品牌标语以及展示所需的 Logo，稍后即可邀请成员加入。
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenantName" className="text-sm text-slate-200">
                租户名称
              </Label>
              <Input
                id="tenantName"
                name="tenantName"
                placeholder="例如：星航学习社群"
                autoComplete="organization"
                className="border-white/15 bg-slate-900/70 text-white placeholder:text-slate-400 focus-visible:ring-violet-500 focus-visible:ring-offset-slate-950"
                disabled={isSubmitting}
                required
              />
              {fieldErrors.tenantName && (
                <p className="text-sm text-rose-300/95">{fieldErrors.tenantName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug" className="text-sm text-slate-200">
                自定义域名 (选填)
              </Label>
              <Input
                id="tenantSlug"
                name="tenantSlug"
                placeholder="例如：xinghang"
                autoComplete="off"
                className="border-white/15 bg-slate-900/70 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 focus-visible:ring-offset-slate-950"
                disabled={isSubmitting}
              />
              {fieldErrors.tenantSlug && (
                <p className="text-sm text-rose-300/95">{fieldErrors.tenantSlug}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantTagline" className="text-sm text-slate-200">
              租户标语 (选填)
            </Label>
            <textarea
              id="tenantTagline"
              name="tenantTagline"
              placeholder="一句话介绍团队的定位与亮点"
              className="min-h-[96px] w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            />
            {fieldErrors.tenantTagline && (
              <p className="text-sm text-rose-300/95">{fieldErrors.tenantTagline}</p>
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
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-white/10 bg-white/5 px-6 py-6">
          {message && (
            <div
              className={
                message.variant === "success"
                  ? "rounded-md border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100"
                  : message.variant === "error"
                    ? "rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
                    : "rounded-md border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm text-sky-100"
              }
            >
              {message.text}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 px-6 text-base shadow-[0_18px_45px_rgba(124,58,237,0.35)] hover:from-violet-500 hover:via-fuchsia-500 hover:to-indigo-400"
              disabled={isSubmitting || isUploadingLogo}
            >
              {isSubmitting ? "提交中..." : "保存租户"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white/80 hover:text-white"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
