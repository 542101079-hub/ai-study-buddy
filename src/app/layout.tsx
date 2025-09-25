import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI智能学习搭子",
    template: "%s | AI智能学习搭子",
  },
  description:
    "AI Study Buddy 为你提供个性化学习规划、智能答疑与进度追踪，陪伴你从入门到就业进阶。",
  keywords: [
    "AI 学习助手",
    "智能学习搭子",
    "学习规划",
    "AI 答疑",
    "学习追踪",
  ],
  metadataBase: new URL("https://ai-study-buddy.local"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "bg-slate-950 text-slate-100 antialiased",
        )}
      >
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/10 bg-slate-950/80 px-6 py-8 text-sm text-slate-300 sm:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-200">
                {"© " + currentYear + " AI Study Buddy. 保留所有权利。"}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="mailto:hello@aistudybuddy.com"
                  className="transition-colors hover:text-white"
                >
                  {"联系 hello@aistudybuddy.com"}
                </a>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  {"隐私政策"}
                </Link>
                <Link href="/terms" className="transition-colors hover:text-white">
                  {"服务条款"}
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
