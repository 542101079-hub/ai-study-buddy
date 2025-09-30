import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { TenantCreateForm } from "./tenant-create-form";

export const metadata: Metadata = {
  title: "创建新租户",
  description: "为当前工作区添加新的租户信息，包括名称、标语和品牌标识。",
};

export default function TenantCreatePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">创建新租户</h1>
            <p className="text-sm text-white/70">
              配置租户品牌与标语信息，完成后即可为团队成员开通访问权限。
            </p>
          </div>
          <Button asChild variant="ghost" className="text-white/80 hover:text-white">
            <Link href="/admin">返回控制台</Link>
          </Button>
        </div>
      </header>

      <section className="flex-1">
        <TenantCreateForm />
      </section>
    </div>
  );
}
