"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
};

type Props = {
  tenants: TenantSummary[];
};

export function TenantSelector({ tenants }: Props) {
  const router = useRouter();
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTenants = tenants.length > 0;

  async function handleContinue() {
    if (!selectedTenantId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    router.replace("/dashboard");
    router.refresh();
  }

  if (!hasTenants) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-white/80">
        <p className="text-sm">没有可用的工作区，请联系管理员或重新完成注册流程。</p>
        <Button className="mt-4" onClick={() => router.replace("/admin-register")}>前往创建</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {tenants.map((tenant) => {
          const isSelected = tenant.id === selectedTenantId;
          return (
            <button
              type="button"
              key={tenant.id}
              onClick={() => setSelectedTenantId(tenant.id)}
              className={`group flex flex-col gap-4 rounded-xl border px-5 py-4 text-left text-white transition-colors ${
                isSelected
                  ? "border-emerald-500/80 bg-emerald-500/10"
                  : "border-white/10 bg-slate-900/60 hover:border-emerald-400/60 hover:bg-emerald-500/10"
              }`}
            >
              <div className="flex items-center gap-4">
                {tenant.logo_url ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white/10">
                    <img
                      src={tenant.logo_url}
                      alt={`${tenant.name} logo`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold">
                    {tenant.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">{tenant.name}</p>
                  <p className="text-xs uppercase tracking-wide text-emerald-300/80">{tenant.slug}</p>
                </div>
                <div className={`ml-auto h-4 w-4 rounded-full border ${
                  isSelected ? "border-emerald-400 bg-emerald-400" : "border-white/40"
                }`} />
              </div>
              {tenant.tagline && (
                <p className="text-sm text-white/70">{tenant.tagline}</p>
              )}
            </button>
          );
        })}
      </div>
      <Button
        onClick={handleContinue}
        disabled={!selectedTenantId || isSubmitting}
        className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-base text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-400"
      >
        {isSubmitting ? "正在进入工作区..." : "进入所选工作区"}
      </Button>
    </div>
  );
}
