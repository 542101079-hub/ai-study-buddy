"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { message as antdMessage } from "antd";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/db/types";
import type { Mood } from "@/lib/coach/mood";
import { replyTemplate, type Tone } from "@/lib/coach/tone";
import { BADGE_THRESHOLDS } from "@/lib/coach/streak";

dayjs.extend(utc);
dayjs.extend(timezone);

type JournalRow = Database["public"]["Tables"]["journal_entries"]["Row"];
type BadgeRow = Database["public"]["Tables"]["badges"]["Row"];

type JournalClientProps = {
  tenant: {
    name: string;
    logo_url: string | null;
    tagline: string | null;
  } | null;
  initialEntries: JournalRow[];
  initialCursor: string | null;
  initialStats: {
    streak: number;
    level: number;
    badges: BadgeRow[];
  };
};

type MessageBubble = {
  id: string;
  role: "user" | "coach";
  content: string;
  mood: Mood;
  tone: Tone;
  createdAt: string;
};

type MoodMeta = {
  label: string;
  badgeClass: string;
  dotClass: string;
};

const MOOD_META: Record<Mood, MoodMeta> = {
  positive: {
    label: "状态：积极",
    badgeClass: "bg-emerald-900/40 text-emerald-200 border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  neutral: {
    label: "状态：平稳",
    badgeClass: "bg-slate-800/60 text-slate-200 border-white/15",
    dotClass: "bg-slate-300",
  },
  anxious: {
    label: "状态：紧张",
    badgeClass: "bg-amber-900/40 text-amber-200 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  down: {
    label: "状态：低落",
    badgeClass: "bg-rose-900/40 text-rose-200 border-rose-500/30",
    dotClass: "bg-rose-400",
  },
};

const toneOptions: Array<{ value: Tone; label: string; description: string }> = [
  {
    value: "strict",
    label: "严肃型",
    description: "像教练一样强调行动与目标，帮助你稳扎稳打推进任务。",
  },
  {
    value: "healer",
    label: "治愈型",
    description: "语气柔和、肯定努力，陪你一起缓解压力、恢复状态。",
  },
  {
    value: "social",
    label: "社交型",
    description: "像学习搭子轻松聊天，保持动力同时享受学习过程。",
  },
];

const TONE_STORAGE_KEY = "journal-tone-preference";

function summarizeText(text: string): string {
  if (!text) return "";
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function entryToMessages(entry: JournalRow): [MessageBubble, MessageBubble] {
  const tone = (entry.tone ?? "healer") as Tone;
  const mood = (entry.mood ?? "neutral") as Mood;
  const summary = summarizeText(entry.content);

  return [
    {
      id: `${entry.id}-user`,
      role: "user",
      content: entry.content,
      mood,
      tone,
      createdAt: entry.created_at,
    },
    {
      id: `${entry.id}-coach`,
      role: "coach",
      content: replyTemplate(tone, mood, summary),
      mood,
      tone,
      createdAt: entry.created_at,
    },
  ];
}

export function JournalClient({
  tenant,
  initialEntries,
  initialCursor,
  initialStats,
}: JournalClientProps) {
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const [tone, setTone] = useState<Tone>("healer");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [entries, setEntries] = useState<JournalRow[]>(() =>
    [...initialEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  );
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [streak, setStreak] = useState(initialStats.streak);
  const [level, setLevel] = useState(initialStats.level);
  const [badges, setBadges] = useState<BadgeRow[]>(initialStats.badges);
  const [toneHover, setToneHover] = useState<Tone | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TONE_STORAGE_KEY) as Tone | null;
    if (stored && ["strict", "healer", "social"].includes(stored)) {
      setTone(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TONE_STORAGE_KEY, tone);
  }, [tone]);

  const messages = useMemo<MessageBubble[]>(() => {
    return entries.flatMap(entryToMessages);
  }, [entries]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || sending) return;

      setSending(true);
      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed, tone }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[journal] post failed", errorText);
          throw new Error("failed");
        }

        const json = await res.json();
        const newEntry: JournalRow = json.data.entry;
        setEntries((prev) =>
          [...prev, newEntry].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          ),
        );
        setStreak(json.data.streak ?? 1);
        setLevel(json.data.level ?? 1);

        if (Array.isArray(json.data.awardedBadges) && json.data.awardedBadges.length > 0) {
          setBadges((prev) => [
            ...prev,
            ...json.data.awardedBadges.filter(
              (badge: BadgeRow) => !prev.some((existing) => existing.code === badge.code),
            ),
          ]);
          messageApi.success("恭喜解锁新徽章！");
        }

        messageApi.success("日志已保存");
        setInput("");
      } catch (error) {
        console.error("[journal] send error", error);
        messageApi.error("提交失败，请稍后重试");
      } finally {
        setSending(false);
      }
    },
    [input, sending, tone, messageApi],
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/journal?cursor=${encodeURIComponent(nextCursor)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("failed");
      }
      const json = await res.json();
      const newEntries: JournalRow[] = json.data.entries ?? [];
      const merged = [...newEntries, ...entries].reduce<JournalRow[]>((acc, entry) => {
        if (!acc.some((item) => item.id === entry.id)) {
          acc.push(entry);
        }
        return acc;
      }, []);
      merged.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setEntries(merged);
      setNextCursor(json.data.nextCursor ?? null);
    } catch (error) {
      console.error("[journal] load more failed", error);
      messageApi.error("加载更多日志失败");
    } finally {
      setLoadingMore(false);
    }
  }, [entries, messageApi, nextCursor]);

  const tenantName = tenant?.name ?? "学习空间";
  const tenantTagline = tenant?.tagline ?? "坚持记录感受与收获，让学习更扎实。";

  const nextBadge = useMemo(
    () => BADGE_THRESHOLDS.find((item) => item.days > streak) ?? BADGE_THRESHOLDS[BADGE_THRESHOLDS.length - 1],
    [streak],
  );

  const progressMax = nextBadge.days;
  const progressValue = Math.min(streak, progressMax);

  const badgeStates = useMemo(
    () =>
      BADGE_THRESHOLDS.map((item) => ({
        ...item,
        unlocked: badges.some((badge) => badge.code === item.code),
      })),
    [badges],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0e0b1a] to-[#141129] text-slate-100">
      {contextHolder}
      <div className="container mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
        <aside className="col-span-12 hidden lg:col-span-4 lg:block">
          <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/80 p-4">
              <Avatar className="h-12 w-12 bg-violet-600/80 text-white">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenantName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  tenantName.slice(0, 2)
                )}
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white">我的成就面板</p>
                <p className="text-xs text-slate-400">持续记录，让习惯稳步养成</p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-slate-800/80 p-4 shadow-inner">
              <div>
                <p className="text-sm text-slate-400">连续打卡天数</p>
                <p className="mt-1 text-3xl font-semibold text-white">{streak}</p>
              </div>
              <Progress
                value={progressValue}
                max={progressMax}
                className="bg-slate-700"
                indicatorClassName="bg-violet-500"
              />
              <p className="text-xs text-slate-400">
                {streak >= nextBadge.days
                  ? "你已经达成最高档位，继续保持！"
                  : `再坚持 ${nextBadge.days - streak} 天解锁 ${nextBadge.name}`}
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-slate-800/80 p-4 shadow-inner">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">徽章收藏</h3>
                <Badge variant="outline" className="border-violet-400/30 text-violet-200">
                  等级 {level}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {badgeStates.map((badge) => (
                  <BadgeCard key={badge.code} label={badge.name} unlocked={badge.unlocked} />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8">
          <div className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl border-white/15 bg-slate-800/70 px-4 py-2 text-sm text-slate-200 hover:border-white/25 hover:bg-slate-700/60 hover:text-white"
              >
                <span aria-hidden="true">←</span>
                返回
              </Button>
            </div>
            <header className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-800/70 px-5 py-4 shadow-inner md:flex-row md:items-center">
              <div>
                <p className="text-sm font-medium text-white">{tenantName}</p>
                <p className="text-xs text-slate-400">{tenantTagline}</p>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <span className="text-sm">欢迎回来，准备好一起记录今天了吗？</span>
              </div>
            </header>

            <div className="rounded-2xl border border-white/10 bg-slate-800/70">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
                <span className="text-sm text-slate-200">人格语气</span>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((option) => {
                    const active = tone === option.value;
                    const hovering = toneHover === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTone(option.value)}
                        onMouseEnter={() => setToneHover(option.value)}
                        onMouseLeave={() => setToneHover(null)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs transition",
                          active
                            ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                            : "border-white/10 bg-slate-800/60 text-slate-300 hover:border-white/20",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="px-5 pb-3 text-xs text-slate-400">
                {(toneHover
                  ? toneOptions.find((opt) => opt.value === toneHover)
                  : toneOptions.find((opt) => opt.value === tone)
                )?.description ?? "选择适合当下的语气，让学习搭子的回应更贴合你的心情。"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-800/70">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-sm text-slate-200">
                <span>学习日志</span>
                {nextCursor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="border-white/15 text-slate-300 hover:bg-white/5"
                  >
                    {loadingMore ? "加载中..." : "加载更多"}
                  </Button>
                )}
              </div>
              <div
                ref={containerRef}
                className="h-[calc(100vh-320px)] space-y-4 overflow-y-auto px-5 py-6"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-200">还没有日志记录</p>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                      可以尝试从「今天学了什么」「遇到的困难」「下一步计划」三个角度记录，越具体越好～
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const moodMeta = MOOD_META[message.mood];
                    if (message.role === "user") {
                      return (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[72ch] rounded-2xl border border-violet-400/20 bg-violet-600/25 px-5 py-4 text-sm text-violet-50 shadow-lg shadow-violet-900/40">
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            <p className="mt-2 text-right text-xs text-violet-200/80">
                              {dayjs(message.createdAt).tz("Asia/Tokyo").format("MM-DD HH:mm")}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className="flex justify-start">
                        <div className="max-w-[72ch] space-y-3 rounded-2xl border border-white/10 bg-slate-800/70 px-5 py-4 text-sm text-slate-100 shadow-lg shadow-slate-900/40">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${moodMeta.dotClass}`} />
                            <Badge className={moodMeta.badgeClass}>{moodMeta.label}</Badge>
                          </div>
                          <article className="prose prose-invert prose-sm max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          </article>
                          <p className="text-xs text-slate-400/80">
                            {dayjs(message.createdAt).tz("Asia/Tokyo").format("MM-DD HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={(event) => void handleSend(event)}>
                <div className="sticky bottom-0 z-10 rounded-b-2xl border-t border-white/10 bg-slate-900/80 px-5 py-4 backdrop-blur-md">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="例如：今天刷完二叉树，虽然一度卡住，但总结后终于理解。"
                      className="min-h-[90px] flex-1 resize-none rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      disabled={sending}
                    />
                    <div className="flex flex-row gap-2 md:flex-col md:items-end">
                      <Button
                        type="submit"
                        disabled={sending || input.trim().length === 0}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-white shadow-md hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sending ? "发送中..." : "发送"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Tip：写下你的收获、疑问或心情，搭子会给你鼓励并同步更新成就面板。
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function BadgeCard({ label, unlocked }: { label: string; unlocked?: boolean }) {
  return (
    <div
      className={[
        "rounded-xl border p-3 text-center shadow-sm select-none transition",
        unlocked
          ? "bg-gradient-to-b from-violet-600/30 to-violet-600/10 border-violet-400/30 text-violet-100"
          : "bg-slate-800/60 border-white/10 text-slate-400",
      ].join(" ")}
    >
      <span className="text-sm font-semibold">{label}</span>
      {unlocked ? (
        <div className="mt-1 text-[10px] text-violet-200/80">已解锁</div>
      ) : (
        <div className="mt-1 text-[10px]">未解锁</div>
      )}
    </div>
  );
}
