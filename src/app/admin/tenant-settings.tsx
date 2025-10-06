"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
};

type Props = {
  tenant: TenantInfo;
  onUpdate: (updatedTenant: TenantInfo) => void;
};

type MessageState = { text: string; type: "success" | "error" } | null;

export function TenantSettings({ tenant, onUpdate }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [formData, setFormData] = useState({
    name: tenant.name,
    tagline: tenant.tagline ?? "",
    logo_url: tenant.logo_url ?? "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: "name" | "tagline" | "logo_url", value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setMessage(null);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "请选择图片文件", type: "error" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "图片文件不能超过 5MB", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("tenantId", tenant.id);

      const response = await fetch("/api/admin/upload-logo", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "上传失败");
      }

      setFormData((previous) => ({ ...previous, logo_url: result.url }));
      setMessage({ text: "Logo 上传成功", type: "success" });
    } catch (error) {
      console.error("[TenantSettings] upload logo failed", error);
      setMessage({
        text: error instanceof Error ? error.message : "上传失败，请稍后再试",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!formData.name.trim()) {
      setMessage({ text: "空间名称不能为空", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          tagline: formData.tagline.trim() || null,
          logo_url: formData.logo_url || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "更新失败");
      }

      setMessage({ text: "空间信息更新成功", type: "success" });
      onUpdate(result.tenant as TenantInfo);
    } catch (error) {
      console.error("[TenantSettings] update tenant failed", error);
      setMessage({
        text: error instanceof Error ? error.message : "更新失败，请稍后再试",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges =
    formData.name !== tenant.name ||
    formData.tagline !== (tenant.tagline ?? "") ||
    formData.logo_url !== (tenant.logo_url ?? "");

  return (
    <Card className="border-white/10 bg-slate-950/80 text-white shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold text-white">空间信息</CardTitle>
        <CardDescription className="text-sm text-slate-200/80">
          更新空间名称、品牌 Logo 以及对外展示的标语。
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <CardContent className="space-y-6">
          {message && (
            <div
              role="alert"
              className={`rounded-lg border px-4 py-2 text-sm ${
                message.type === "success"
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/60 bg-rose-500/10 text-rose-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="space-y-3">
            <Label className="text-sm text-slate-200">当前 Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/20 bg-white/5">
                  <img
                    src={formData.logo_url}
                    alt="空间 Logo"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-white/80">
                  {tenant.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{tenant.name}</p>
                <p className="text-xs text-white/60">{tenant.slug}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-sm text-slate-200">上传新 Logo</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {isUploading ? "上传中..." : "选择图片"}
              </Button>
              <span className="text-xs text-white/60">支持 JPG / PNG / GIF，最大 5MB</span>
            </div>
          </section>

          <section className="space-y-2">
            <Label htmlFor="tenant-name" className="text-sm text-slate-200">
              空间名称
            </Label>
            <Input
              id="tenant-name"
              value={formData.name}
              onChange={(event) => handleInputChange("name", event.target.value)}
              disabled={isSubmitting}
              maxLength={120}
              className="border-white/15 bg-slate-900/70 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
              placeholder="请输入空间名称"
            />
          </section>

          <section className="space-y-2">
            <Label htmlFor="tenant-tagline" className="text-sm text-slate-200">
              空间标语（可选）
            </Label>
            <Input
              id="tenant-tagline"
              value={formData.tagline}
              onChange={(event) => handleInputChange("tagline", event.target.value)}
              disabled={isSubmitting}
              maxLength={160}
              className="border-white/15 bg-slate-900/70 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
              placeholder="写一句帮助学习伙伴快速了解空间的介绍"
            />
            <div className="space-y-1">
              <Progress
                value={formData.tagline.length}
                max={160}
                className="bg-white/10"
                indicatorClassName="from-emerald-400 via-sky-500 to-violet-500"
              />
              <p className="text-xs text-white/50">{formData.tagline.length}/160 字符</p>
            </div>
          </section>
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 text-white hover:from-emerald-400 hover:via-sky-400 hover:to-indigo-400"
          >
            {isSubmitting ? "保存中..." : "保存设置"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}


