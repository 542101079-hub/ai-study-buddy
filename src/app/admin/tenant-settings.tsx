"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aiCard,
  aiMutedText,
  aiPrimaryBtn,
  aiProgressFill,
  aiProgressTrack,
  aiSubCard,
} from "@/components/ui/ai-surface";

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

  const hasChanges =
    formData.name.trim() !== (tenant.name ?? "") ||
    (formData.tagline ?? "") !== (tenant.tagline ?? "") ||
    (formData.logo_url ?? "") !== (tenant.logo_url ?? "");

  const handleInputChange = (field: "name" | "tagline" | "logo_url", value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setMessage(null);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "请上传图片文件", type: "error" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "图片大小不能超过 5MB", type: "error" });
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

      setMessage({ text: "空间信息已更新", type: "success" });
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

  const taglineProgress = Math.min(100, Math.round((formData.tagline.length / 160) * 100));

  return (
    <Card className={`${aiCard} p-6`}>
      <CardHeader className="space-y-2 p-0 pb-4">
        <CardTitle className="text-xl text-white">空间信息</CardTitle>
        <CardDescription className={`text-sm ${aiMutedText}`}>
          更新空间名称、品牌 Logo 与对外展示的标语。
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <CardContent className="space-y-6 p-0">
          {message && (
            <div
              role="alert"
              className={`rounded-xl border px-4 py-2 text-sm ${
                message.type === "success"
                  ? "border-emerald-400/60 bg-emerald-600/15 text-emerald-100"
                  : "border-rose-500/60 bg-rose-600/15 text-rose-100"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className={`${aiSubCard} p-4 space-y-3`}>
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
                <p className={`text-xs ${aiMutedText}`}>{tenant.slug}</p>
              </div>
            </div>
          </section>

          <section className={`${aiSubCard} p-4 space-y-3`}>
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
                className={`${aiPrimaryBtn} px-4`}
              >
                {isUploading ? "上传中..." : "选择图片"}
              </Button>
              <span className={`text-xs ${aiMutedText}`}>支持 JPG / PNG / GIF，最大 5MB</span>
            </div>
          </section>

          <section className={`${aiSubCard} space-y-3 p-4`}>
            <div className="space-y-2">
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
                placeholder="填写空间名称"
              />
            </div>

            <div className="space-y-2">
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
                placeholder="写一句向学习者展示空间定位的标语"
              />
              <div className="space-y-1">
                <div className={aiProgressTrack}>
                  <div className={aiProgressFill} style={{ width: `${taglineProgress}%` }} />
                </div>
                <p className={`text-xs ${aiMutedText}`}>{formData.tagline.length}/160 字符</p>
              </div>
            </div>
          </section>
        </CardContent>

        <CardFooter className="justify-end p-0 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className={`${aiPrimaryBtn} px-5 py-2`}
          >
            {isSubmitting ? "保存中..." : "保存更新"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
