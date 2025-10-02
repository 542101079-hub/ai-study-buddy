import { redirect } from "next/navigation";

import { CreateProfileForm } from "./create-profile-form";
import { loadTenantScopedProfile } from "@/lib/auth/tenant-context";
import { createServerSupabaseClient, getServerSession } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CreateProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  // 检查用户是否已经有profile
  const supabase = createServerSupabaseClient();
  let existingProfile = null;
  
  try {
    existingProfile = await loadTenantScopedProfile(supabase, session.user.id);
    if (existingProfile) {
      console.log("[create-profile] user already has profile, redirecting to dashboard");
      redirect("/dashboard");
    }
  } catch (error) {
    console.log("[create-profile] profile check failed:", error);
  }

  // 如果到达这里，说明用户确实没有profile
  console.log("[create-profile] no existing profile found, showing creation form");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.3),_rgba(15,23,42,0.95))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.2)_0%,rgba(56,189,248,0.1)_45%,transparent_85%)] opacity-70" />
        <div className="absolute left-[-12%] top-1/3 h-[380px] w-[380px] rounded-full bg-indigo-500/35 blur-[190px]" />
        <div className="absolute right-[-10%] top-1/4 h-[440px] w-[440px] rounded-full bg-purple-600/35 blur-[210px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[250px]" />
      </div>

      <header className="border-b border-white/10 bg-slate-950/80 px-6 py-6 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <BrandLogo subtitle="AI智能学习搭子" />
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="text-white/85 hover:text-white">
              <Link href="/dashboard">返回首页</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-12 sm:px-10 sm:py-20">
        <Card className="w-full border-violet-800/50 bg-gradient-to-br from-slate-950/80 via-violet-950/70 to-slate-900/80 text-white shadow-[0_28px_70px_rgba(99,102,241,0.25)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-white">完善你的学习档案</CardTitle>
            <CardDescription className="text-base text-slate-200/90">
              欢迎回来！创建学习档案可以解锁更多功能，但这是<strong className="text-amber-300">完全可选的</strong>。
              您也可以直接跳过继续使用基本功能。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreateProfileForm 
              userEmail={session.user.email || ""} 
              userName={session.user.user_metadata?.full_name || ""} 
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
