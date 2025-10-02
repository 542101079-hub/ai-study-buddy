"use client";

import { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function TenantSettings({ tenant, onUpdate }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [formData, setFormData] = useState({
    name: tenant.name,
    tagline: tenant.tagline || "",
    logo_url: tenant.logo_url || "",
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage({ text: "请选择图片文件", type: "error" });
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "图片文件不能超过 5MB", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', tenant.id);

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '上传失败');
      }

      setFormData(prev => ({ ...prev, logo_url: result.url }));
      setMessage({ text: "Logo 上传成功", type: "success" });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : "上传失败，请重试", 
        type: "error" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    
    if (isSubmitting) return;

    // 验证必填字段
    if (!formData.name.trim()) {
      setMessage({ text: "租户名称不能为空", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          tagline: formData.tagline.trim() || null,
          logo_url: formData.logo_url || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '更新失败');
      }

      setMessage({ text: "租户信息更新成功", type: "success" });
      onUpdate(result.tenant);
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : "更新失败，请重试", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = 
    formData.name !== tenant.name ||
    formData.tagline !== (tenant.tagline || "") ||
    formData.logo_url !== (tenant.logo_url || "");

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
      <h2 className="text-lg font-medium text-white mb-4">租户设置</h2>
      <p className="text-xs text-white/60 mb-6">
        管理租户的基本信息、Logo 和标语。
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 当前 Logo 预览 */}
        <div className="space-y-3">
          <Label className="text-sm text-white/90">当前 Logo</Label>
          <div className="flex items-center gap-4">
            {formData.logo_url ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/20 bg-white/10">
                <img
                  src={formData.logo_url}
                  alt="租户 Logo"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-sm font-semibold text-white/70">
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-white/90">{tenant.name}</p>
              <p className="text-xs text-white/60">{tenant.slug}</p>
            </div>
          </div>
        </div>

        {/* Logo 上传 */}
        <div className="space-y-3">
          <Label className="text-sm text-white/90">上传新 Logo</Label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="上传租户Logo图片"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting}
              className="border-white/20 text-white/90 hover:bg-white/10"
            >
              {isUploading ? "上传中..." : "选择图片"}
            </Button>
            <span className="text-xs text-white/60">
              支持 JPG、PNG、GIF 格式，最大 5MB
            </span>
          </div>
        </div>

        {/* 租户名称 */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-white/90">
            租户名称 *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={isSubmitting}
            className="bg-slate-700/50 border-violet-400/30 text-white placeholder:text-violet-200/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
            placeholder="请输入租户名称"
            maxLength={120}
          />
        </div>

        {/* 标语 */}
        <div className="space-y-2">
          <Label htmlFor="tagline" className="text-sm text-white/90">
            标语
          </Label>
          <Input
            id="tagline"
            value={formData.tagline}
            onChange={(e) => handleInputChange("tagline", e.target.value)}
            disabled={isSubmitting}
            className="bg-slate-700/50 border-violet-400/30 text-white placeholder:text-violet-200/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
            placeholder="请输入租户标语（可选）"
            maxLength={160}
          />
          <p className="text-xs text-white/50">
            {formData.tagline.length}/160 字符
          </p>
        </div>

        {/* 状态消息 */}
        {message && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm ${
              message.type === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/50 bg-red-500/10 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </form>
    </div>
  );
}
