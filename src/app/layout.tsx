import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50",
    template: "%s | AI\u667a\u80fd\u5b66\u4e60\u642d\u5b50",
  },
  description:
    "AI Study Buddy \u4e3a\u4f60\u63d0\u4f9b\u4e2a\u6027\u5316\u5b66\u4e60\u89c4\u5212\u3001\u667a\u80fd\u7b54\u7591\u4e0e\u8fdb\u5ea6\u8ffd\u8e2a\uff0c\u966a\u4f34\u4f60\u4ece\u5165\u95e8\u5230\u5c31\u4e1a\u8fdb\u9636\u3002",
  keywords: [
    "AI \u5b66\u4e60\u52a9\u624b",
    "\u667a\u80fd\u5b66\u4e60\u642d\u5b50",
    "\u5b66\u4e60\u89c4\u5212",
    "AI \u7b54\u7591",
    "\u5b66\u4e60\u8ffd\u8e2a",
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
                {"\u00A9 " + currentYear + " AI Study Buddy. \u4FDD\u7559\u6240\u6709\u6743\u5229\u3002"}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="mailto:hello@aistudybuddy.com"
                  className="transition-colors hover:text-white"
                >
                  {"\u8054\u7CFB hello@aistudybuddy.com"}
                </a>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  {"\u9690\u79C1\u653F\u7B56"}
                </Link>
                <Link href="/terms" className="transition-colors hover:text-white">
                  {"\u670D\u52A1\u6761\u6B3E"}
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
