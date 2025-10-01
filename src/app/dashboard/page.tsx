
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient, getServerSession } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

const HIGHLIGHTS = [
  {
    title: "Focus time",
    value: "6.8h",
    description: "Up 12% compared to last week",
  },
  {
    title: "Plans completed",
    value: "5",
    description: "You are ahead of the weekly target",
  },
  {
    title: "Average session",
    value: "2.5h",
    description: "Daily streak maintained for 9 days",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Review study plan",
    description: "Check upcoming focus areas and adjust your schedule.",
    cta: "View plan",
  },
  {
    title: "Start next session",
    description: "Jump into the next AI-guided practice block.",
    cta: "Begin session",
  },
  {
    title: "Capture insights",
    description: "Record key takeaways to reinforce long-term memory.",
    cta: "Add note",
  },
];

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  const supabase = createServerSupabaseClient();
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url, role, tenant_id")
    .eq("id", session.user.id)
    .maybeSingle<{
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      role: "user" | "admin";
      tenant_id: string | null;
    }>();

  if (profileError) {
    console.error("[dashboard] load profile failed", profileError);
  }

  let tenantSummary: TenantSummary | null = null;

  if (profileData?.tenant_id) {
    try {
      tenantSummary = await loadTenantSummary(supabase, profileData.tenant_id);
    } catch (tenantError) {
      console.error("[dashboard] load tenant failed", tenantError);
    }
  }

  const tenantDisplayName = tenantSummary?.name ?? "AI Study Buddy";
  const tenantTagline = tenantSummary?.tagline ?? "AI Study Companion";
  const tenantLogoUrl = tenantSummary?.logo_url ?? null;
  const displayName =
    profileData?.full_name ||
    profileData?.username ||
    session.user.email?.split("@")[0] ||
    "Learner";

  const isAdmin = profileData?.role === "admin";
  const roleLabel = isAdmin ? "Administrator" : "Member";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),_rgba(2,6,23,0.98))]" />
        <div className="absolute left-1/3 top-1/4 h-[460px] w-[460px] rounded-full bg-purple-500/24 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/5 h-[380px] w-[380px] rounded-full bg-indigo-500/25 blur-[160px]" />
      </div>
      <div className="container mx-auto flex min-h-screen flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {tenantLogoUrl ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/20 bg-white/10">
                <img
                  src={tenantLogoUrl}
                  alt={`${tenantDisplayName} logo`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <BrandLogo showText={false} />
            )}
            <div className="space-y-1">
              <p className="text-xl font-semibold text-white/95">{tenantDisplayName}</p>
              <p className="text-sm text-white/70">{tenantTagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {isAdmin && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/20"
              >
                <Link href="/admin">Manage workspace</Link>
              </Button>
            )}
            <div className="text-right text-sm text-white/92">
              <p>Welcome back, {displayName}</p>
              <p className="text-xs text-white/75">{roleLabel}</p>
            </div>
            <LogoutButton className="border-violet-700/60 text-white/85 hover:bg-violet-900/70" />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 pb-12">
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <Card
                key={item.title}
                className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl"
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-sm font-medium text-white/92">
                    {item.title}
                  </CardTitle>
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-white/90">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">Today&apos;s focus</CardTitle>
                  <CardDescription className="text-sm text-white/90">
                    Stay aligned with your goal for the week and balance study blocks with rest.
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-violet-900/70 hover:bg-violet-700">
                  Adjust plan
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-violet-700/60 bg-violet-800/55 p-4 text-white/90"
                  >
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="mt-2 text-sm text-white/85">{action.description}</p>
                    <Button variant="ghost" size="sm" className="mt-4 px-1 text-white/85">
                      {action.cta}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-violet-800/60 bg-gradient-to-br from-violet-900/75 via-purple-800/65 to-indigo-900/75 text-white backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-semibold">Daily ritual</CardTitle>
                <CardDescription className="text-sm text-white/92">
                  Pair deep work sprints with quick reviews to reinforce retention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/90">
                <p>
                  Start with a <span className="underline">10 minute recap</span> of yesterday&apos;s notes.
                </p>
                <p>Schedule blocks of 25 minutes study + 5 minutes reflection to stay fresh.</p>
                <Button
                  variant="outline"
                  className="border-violet-700/60 text-white/85 hover:bg-violet-900/70"
                  size="sm"
                >
                  View checklist
                </Button>
              </CardContent>
            </Card>
          </section>

          {isAdmin && (
            <Card className="border-emerald-600/50 bg-gradient-to-br from-emerald-900/70 via-emerald-800/60 to-slate-900/80 text-white backdrop-blur-xl">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">Workspace insights</CardTitle>
                  <CardDescription className="text-sm text-white/85">
                    Review team progress and update member permissions when necessary.
                  </CardDescription>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/20"
                >
                  <Link href="/admin">Open admin console</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-white/85">
                <p>
                  Members inherit access based on their role. Promote trusted collaborators to
                  administrators to help manage the workspace.
                </p>
                <p>Only administrators can see this section.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
