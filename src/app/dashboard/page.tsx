"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { clearSession, getSession } from "@/lib/session";

interface SessionInfo {
  email: string;
  displayName?: string;
}

const HIGHLIGHTS = [
  {
    title: "\u672c\u5468\u5b66\u4e60\u8fdb\u5ea6",
    value: "68%",
    description: "\u4e0e\u4e0a\u5468\u6bd4\u63d0\u5347 12%\u3002",
  },
  {
    title: "\u8fde\u7eed\u6253\u5361\u5929\u6570",
    value: "5",
    description: "\u4fdd\u6301\u673a\u68b0\u5305\u4e2d\u52a0\u6cb9\uff0c\u8bd5\u7740\u521b\u9020\u65b0\u7684\u8fde\u7eed\u8bb0\u5f55\u3002",
  },
  {
    title: "\u4eca\u5929\u4e88\u5b9a\u65f6\u957f",
    value: "2.5h",
    description: "\u518d\u5b8c\u6210 1 \u4e2a\u4efb\u52a1\u5c31\u53ef\u8fbe\u6210\u76ee\u6807\u3002",
  },
];

const QUICK_ACTIONS = [
  {
    title: "\u4eca\u65e5\u4efb\u52a1",
    description: "\u6839\u636e\u4f60\u7684\u8ba1\u5212\u53d1\u6398\u4eca\u65e5\u9700\u91cd\u70b9\u7834\u96c6\u7684\u77e5\u8bc6\u70b9\u3002",
    cta: "\u67e5\u770b\u8ba1\u5212",
  },
  {
    title: "\u4e0b\u4e00\u4e2a\u590d\u76d8",
    description: "\u53cd\u601d\u672c\u5468\u7684\u6700\u4f73\u5b66\u4e60\u6a21\u5f0f\uff0c\u51c6\u5907\u542f\u52a8\u65b0\u4e00\u8f6e\u7684\u8fdb\u9636\u8ba1\u5212\u3002",
    cta: "\u6253\u5f00\u590d\u76d8",
  },
  {
    title: "\u7ec3\u4e60\u76ee\u6807",
    description: "\u524d\u7f6e\u4e0b\u5468\u91cd\u70b9\u4efb\u52a1\uff0c\u786e\u8ba4\u9700\u6df1\u8010\u7684\u6280\u80fd\u548c\u77e5\u8bc6\u6a21\u5757\u3002",
    cta: "\u7f16\u8f91\u8def\u7ebf",
  },
];

export default function DashboardPage() {
  useAuthRedirect({ when: "unauthenticated", redirectTo: "/" });

  const router = useRouter();
  const [session, setSessionState] = useState<SessionInfo | null>(null);

  useEffect(() => {
    setSessionState(getSession());
  }, []);

  function handleSignOut() {
    clearSession();
    router.replace("/");
  }

  const displayName = session?.displayName || session?.email?.split("@")[0] || "Learner";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.16),_rgba(2,6,23,0.98))]" />
        <div className="absolute left-1/3 top-1/4 h-[460px] w-[460px] rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/5 h-[380px] w-[380px] rounded-full bg-indigo-500/25 blur-[160px]" />
      </div>
      <div className="container mx-auto flex min-h-screen flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <BrandLogo subtitle="AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50" />
          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-slate-200">
              <p>\u6b22\u8fce\u56de\u6765\uff0c{displayName}\uff01</p>
              <p className="text-xs text-slate-400">\u4eca\u5929\u4e5f\u4e00\u8d77\u4fdd\u6301\u52a8\u529b\u3002</p>
            </div>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={handleSignOut}>
              \u9000\u51fa
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 pb-12">
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <Card key={item.title} className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-200">
                    {item.title}
                  </CardTitle>
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-slate-300">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">
                    \u8def\u5f84\u9759\u731c\u8c03\u6574
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-300">
                    \u6839\u636e\u6700\u65b0\u8fdb\u5ea6\u4e0e\u4f18\u5148\u7ea7\uff0c\u63d0\u524d\u5b89\u6392\u7684\u7b56\u7565\u5efa\u8bae\u5df2\u5230\u8fbe\u3002
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-sky-500/90 hover:bg-sky-500">
                  \u66f4\u65b0\u8ba1\u5212
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <h3 className="text-base font-semibold text-white">
                      {action.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {action.description}
                    </p>
                    <Button variant="ghost" size="sm" className="mt-4 px-1 text-sky-300">
                      {action.cta}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-white/10 bg-gradient-to-br from-white/10 to-sky-500/20 text-white backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-semibold">
                  \u52a8\u529b\u4f53\u7cfb
                </CardTitle>
                <CardDescription className="text-sm text-slate-200">
                  \u60a8\u7684\u53cd\u9988\u5e2e\u52a9 AI \u642d\u5b50\u8c03\u6574\u52a8\u529b\u65b9\u5411\uff0c\u7ef4\u6301\u957f\u671f\u5b66\u4e60\u6548\u7387\u3002
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-100">
                <p>
                  \u672c\u5468\u60c5\u7eea\u503e\u5411\uff1a
                  <span className="underline">\u4f18\u52bf\u6d3b\u529b</span>
                </p>
                <p>
                  \u63d0\u9192\u5efa\u8bae\uff1a\u6309\u65f6\u7ee7\u7eed\u4fdd\u6301 25 \u5206\u949f\u5b66\u4e60 + 5 \u5206\u949f\u590d\u76d8\u7684\u8282\u594f\u3002
                </p>
                <Button variant="outline" className="border-white/40 text-white hover:bg-white/10" size="sm">
                  \u8bbe\u5b9a\u63d0\u9192
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
