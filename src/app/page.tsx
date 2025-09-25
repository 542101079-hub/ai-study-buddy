'use client';

import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

const FEATURES = [
  {
    title: "\u4e2a\u6027\u5316\u5b66\u4e60\u89c4\u5212",
    description: "\u6839\u636e\u9636\u6bb5\u4e0e\u76ee\u6807\u81ea\u52a8\u751f\u6210\u5468\u8ba1\u5212\u4e0e\u6bcf\u65e5\u4efb\u52a1\uff0c\u4fdd\u6301\u5faa\u5e8f\u6e10\u8fdb\u7684\u8282\u594f\u3002",
  },
  {
    title: "\u667a\u80fd\u7b54\u7591",
    description: "24/7 AI \u5b66\u4f34\u5373\u65f6\u89e3\u6790\u96be\u70b9\uff0c\u63d0\u4f9b\u77e5\u8bc6\u70b9\u5ef6\u4f38\u4e0e\u4e3e\u4e00\u53cd\u4e09\u3002",
  },
  {
    title: "\u8fdb\u5ea6\u8ffd\u8e2a",
    description: "\u591a\u7ef4\u5ea6\u8bb0\u5f55\u6253\u5361\u3001\u590d\u76d8\u4e0e\u4e60\u60ef\u6570\u636e\uff0c\u5b9e\u65f6\u53cd\u9988\u6210\u957f\u66f2\u7ebf\u3002",
  },
  {
    title: "\u60c5\u611f\u6fc0\u52b1",
    description: "\u8d34\u8fd1\u771f\u5b9e\u5bfc\u5e08\u7684\u966a\u4f34\u611f\uff0c\u7528\u6545\u4e8b\u5316\u63d0\u793a\u4e0e\u8bed\u97f3\u9f13\u52b1\u7a33\u4f4f\u52a8\u529b\u3002",
  },
  {
    title: "\u5c31\u4e1a\u8fdb\u9636",
    description: "\u751f\u6210\u4e2a\u6027\u5316\u9762\u8bd5\u811a\u672c\u4e0e\u6280\u80fd\u6e05\u5355\uff0c\u5e2e\u52a9\u4f60\u5b8c\u6210\u4ece\u5b66\u4e60\u5230\u5c31\u4e1a\u7684\u8dc3\u8fc1\u3002",
  },
];

export default function HomePage() {
  useAuthRedirect({ when: "authenticated", redirectTo: "/dashboard" });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.18)_0%,rgba(56,189,248,0.08)_38%,transparent_76%)] opacity-70" />
        <div className="absolute left-[-10%] top-1/4 h-[420px] w-[420px] rounded-full bg-sky-400/35 blur-[170px]" />
        <div className="absolute right-[-8%] top-1/3 h-[360px] w-[360px] rounded-full bg-indigo-500/35 blur-[200px]" />
        <div className="absolute bottom-[-18%] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[240px]" />
      </div>

      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
          <BrandLogo subtitle="AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50" />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-slate-200 hover:text-white">
              <Link href="/signin">\u767b\u5f55</Link>
            </Button>
            <Button asChild className="shadow-[0_12px_40px_rgba(59,130,246,0.32)]">
              <Link href="/signup">\u7acb\u5373\u6ce8\u518c</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 py-12 sm:px-10 sm:py-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-sky-200">
              AI Study Buddy
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                \u4f60\u7684 AI \u667a\u80fd\u5b66\u4e60\u642d\u5b50
              </h1>
              <p className="max-w-xl text-base text-slate-200 sm:text-lg">
                \u4ece\u89c4\u5212\u5230\u7b54\u7591\uff0c\u4ece\u8fdb\u5ea6\u8ffd\u8e2a\u5230\u5c31\u4e1a\u8fdb\u9636\uff0c\u4e00\u4f4d\u59cb\u7ec8\u5728\u7ebf\u7684 AI \u5b66\u4f34\uff0c\u5e2e\u52a9\u4f60\u628a\u6bcf\u4e00\u6b21\u7ec3\u4e60\u90fd\u5bf9\u51c6\u76ee\u6807\u3002
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="px-7 text-base shadow-[0_18px_45px_rgba(79,70,229,0.35)]">
                <Link href="/signup">\u514d\u8d39\u5f00\u542f\u6211\u7684\u5b66\u4e60\u65c5\u7a0b</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/signin">\u6211\u5df2\u6709\u8d26\u53f7\uff0c\u7acb\u5373\u767b\u5f55</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-300">
              <div>
                <p className="text-3xl font-semibold text-white">92%</p>
                <p>\u575a\u6301\u6253\u5361 4 \u5468\u4ee5\u4e0a\u7684\u5b66\u5458\u5b8c\u6210\u4e3b\u8981\u9636\u6bb5\u76ee\u6807</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">30min</p>
                <p>\u5e73\u5747\u8282\u7701\u6bcf\u65e5\u89c4\u5212\u4e0e\u590d\u76d8\u65f6\u95f4</p>
              </div>
            </div>
          </div>
          <Card className="border-white/10 bg-white/5 text-white shadow-[0_25px_80px_rgba(79,70,229,0.18)]">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">\u6bcf\u5929\u90fd\u6709\u4f19\u4f34\u5728\u4f60\u8eab\u65c1</CardTitle>
              <CardDescription className="text-base text-slate-200">
                \u8d34\u5408\u8282\u594f\u7684\u5b66\u4e60\u642d\u5b50\uff0c\u770b\u677f\u5f0f\u638c\u63e1\u8fdb\u5c55\uff0c\u590d\u76d8\u63d0\u9192\u548c\u60c5\u7eea\u64ad\u62a5\u968f\u65f6\u8ddf\u8fdb\u3002
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">\u4eca\u65e5\u4eae\u70b9</p>
                <p className="mt-2 text-lg text-white">\u4efb\u52a1\u5b8c\u6210\u5ea6 82%</p>
                <p className="text-slate-300">\u4e0b\u4e00\u4e2a\u5efa\u8bae\uff1a\u5b8c\u6210\u9762\u8bd5\u884c\u4e3a\u9898\u6f14\u7ec3 1 \u8f6e\u3002</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">\u60c5\u611f\u64ad\u62a5</p>
                <p className="mt-2 text-lg text-white">\u4fdd\u6301\u826f\u597d\u72b6\u6001\uff0c\u518d\u8d70\u4e00\u6b65\u5c31\u80fd\u5b8c\u6210\u672c\u5468\u8ba1\u5212\u3002</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-white">AI \u5b66\u4f34\u7684 5 \u5927\u80fd\u529b</h2>
            <p className="max-w-2xl text-base text-slate-300">
              \u5c06\u5b66\u4e60\u8def\u5f84\u62c6\u6210\u53ef\u6267\u884c\u7684\u884c\u52a8\uff0c\u7528\u6570\u636e\u4e0e\u53cd\u9988\u4f34\u968f\u4f60\u575a\u6301\u4e0b\u53bb\u3002
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className={cn(
                  "border-white/10 bg-white/5 text-white transition-all duration-300",
                  "hover:border-indigo-200/60 hover:bg-white/10 hover:shadow-[0_25px_60px_rgba(79,70,229,0.25)]",
                )}
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-200">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 px-8 py-12 text-white shadow-[0_35px_90px_rgba(79,70,229,0.2)] sm:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">\u4eca\u5929\u5f00\u59cb\uff0c\u8ba9 AI \u966a\u4f60\u628a\u76ee\u6807\u9010\u4e00\u5b9e\u73b0</h3>
              <p className="max-w-xl text-sm text-slate-200">
                \u9009\u62e9\u9002\u5408\u4f60\u7684\u9636\u6bb5\uff0c15 \u79d2\u5b8c\u6210\u6ce8\u518c\uff0c\u7acb\u5373\u540c\u6b65\u5b66\u4e60\u8282\u594f\u4e0e\u966a\u4f34\u63d0\u9192\u3002
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-6 shadow-[0_12px_35px_rgba(59,130,246,0.32)]">
                <Link href="/signup">\u514d\u8d39\u6ce8\u518c</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/signin">\u6211\u5148\u4f53\u9a8c\u767b\u5f55</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

