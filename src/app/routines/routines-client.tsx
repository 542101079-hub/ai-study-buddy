"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { message as antdMessage } from "antd";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HabitSummaryResponse, HabitSummaryItem } from "@/lib/habits/summary";
import type { HabitCode } from "@/lib/habits/definitions";

type ActionKind = "start" | "complete" | "skip";

type TimerPhase = "focus" | "break" | "completed";

type TimerState = {
  habitCode: HabitCode;
  phase: TimerPhase;
  remainingSeconds: number;
  focusMinutes: number;
  breakMinutes: number;
  isPaused: boolean;
};

type LoadingState = {
  code: HabitCode;
  action: ActionKind;
} | null;

const STATUS_LABELS: Record<HabitSummaryItem["status"], string> = {
  pending: "未开始",
  doing: "进行中",
  done: "已完成",
  skipped: "已跳过",
};

const STATUS_STYLE: Record<HabitSummaryItem["status"], string> = {
  pending: "border-white/20 bg-slate-950/70 text-slate-200",
  doing: "border-violet-400/60 bg-violet-600/25 text-violet-100",
  done: "border-emerald-400/60 bg-emerald-600/25 text-emerald-100",
  skipped: "border-amber-400/60 bg-amber-600/25 text-amber-100",
};

function formatTwoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${formatTwoDigits(mins)}:${formatTwoDigits(secs)}`;
}

function calcPomodoroActualMinutes(item: HabitSummaryItem, timer: TimerState | null): number {
  if (!timer || timer.habitCode !== "pomodoro") {
    return item.plannedMinutes;
  }

  const focusSeconds = timer.focusMinutes * 60;
  const breakSeconds = timer.breakMinutes * 60;

  if (timer.phase === "focus") {
    const elapsed = Math.max(0, focusSeconds - timer.remainingSeconds);
    return Math.max(1, Math.round(elapsed / 60));
  }

  if (timer.phase === "break") {
    const elapsedBreak = Math.max(0, breakSeconds - timer.remainingSeconds);
    const totalElapsed = focusSeconds + elapsedBreak;
    return Math.max(1, Math.round(totalElapsed / 60));
  }

  return timer.focusMinutes + timer.breakMinutes;
}

const HABIT_REFRESH_ERROR =
  "刷新习惯清单失败，请稍后重试。";

export function RoutinesClient({ initialSummary }: { initialSummary: HabitSummaryResponse }) {
  const router = useRouter();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const [summary, setSummary] = useState<HabitSummaryResponse>(initialSummary);
  const [actionLoading, setActionLoading] = useState<LoadingState>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const autoCompleteRef = useRef(false);
  const currentDateRef = useRef(initialSummary.date);

  const orderedItems = useMemo(
    () => [...summary.items].sort((a, b) => a.order - b.order),
    [summary.items],
  );

  const pomodoroItem = useMemo(
    () => orderedItems.find((item) => item.code === "pomodoro") ?? null,
    [orderedItems],
  );

  const isActionLoading = (code: HabitCode, action: ActionKind) =>
    actionLoading?.code === code && actionLoading.action === action;

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const search = new URLSearchParams({ date: currentDateRef.current });
      const response = await fetch(`/api/habits/today?${search.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "unknown_error");
      }
      currentDateRef.current = data.date ?? currentDateRef.current;
      setSummary(data);
    } catch (error) {
      console.error("[habits] refresh failed", error);
      messageApi.error(HABIT_REFRESH_ERROR);
    } finally {
      setIsRefreshing(false);
    }
  };

  const executeAction = async (
    code: HabitCode,
    action: ActionKind,
    payload?: Record<string, unknown>,
  ) => {
    setActionLoading({ code, action });
    try {
      const response = await fetch(`/api/habits/run/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          habitCode: code,
          date: currentDateRef.current,
          ...payload,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) {
        throw new Error(data?.error ?? "unknown_error");
      }

      if (action === "start") {
        messageApi.success("已开始执行");
      } else if (action === "complete") {
        messageApi.success("已完成");
      } else {
        messageApi.info("已标记为跳过");
      }

      await refresh();
    } catch (error) {
      console.error(`[habits] ${action} failed`, error);
      messageApi.error("操作失败，请稍后再试");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = (code: HabitCode) => executeAction(code, "start");
  const handleSkip = (code: HabitCode) => executeAction(code, "skip");
  const handleComplete = (code: HabitCode, actualMinutes?: number) =>
    executeAction(code, "complete", actualMinutes !== undefined ? { actualMinutes } : undefined);

  useEffect(() => {
    const pomodoro = summary.items.find((item) => item.code === "pomodoro");
    setTimerState((previous) => {
      if (!pomodoro || !pomodoro.timer || pomodoro.status !== "doing") {
        return null;
      }

      const focusMinutes = pomodoro.timer.focusMinutes;
      const breakMinutes = pomodoro.timer.breakMinutes ?? 0;
      const totalFocusSeconds = focusMinutes * 60;
      const totalBreakSeconds = breakMinutes * 60;
      const startedAt = pomodoro.startedAt
        ? new Date(pomodoro.startedAt).getTime()
        : Date.now();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));

      let nextPhase: TimerPhase = "focus";
      let remainingSeconds = totalFocusSeconds - elapsedSeconds;

      if (remainingSeconds <= 0) {
        const breakElapsed = elapsedSeconds - totalFocusSeconds;
        if (breakMinutes > 0 && breakElapsed < totalBreakSeconds) {
          nextPhase = "break";
          remainingSeconds = totalBreakSeconds - breakElapsed;
        } else {
          nextPhase = "completed";
          remainingSeconds = 0;
        }
      }

      const isPaused = previous?.isPaused ?? false;

      return {
        habitCode: "pomodoro",
        phase: nextPhase,
        remainingSeconds: Math.max(0, remainingSeconds),
        focusMinutes,
        breakMinutes,
        isPaused: nextPhase === "completed" ? true : isPaused,
      };
    });
  }, [summary]);

  useEffect(() => {
    if (!timerState || timerState.isPaused || timerState.phase === "completed") {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimerState((prev) => {
        if (!prev || prev.isPaused) {
          return prev;
        }

        if (prev.remainingSeconds > 1) {
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1,
          };
        }

        if (prev.phase === "focus" && prev.breakMinutes > 0) {
          return {
            ...prev,
            phase: "break",
            remainingSeconds: prev.breakMinutes * 60,
          };
        }

        return {
          ...prev,
          phase: "completed",
          remainingSeconds: 0,
          isPaused: true,
        };
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [timerState?.isPaused, timerState?.phase, timerState?.remainingSeconds]);

  useEffect(() => {
    if (timerState?.phase !== "completed" || autoCompleteRef.current) {
      return;
    }
    autoCompleteRef.current = true;

    const totalMinutes = timerState.focusMinutes + timerState.breakMinutes;

    (async () => {
      await handleComplete("pomodoro", totalMinutes);
      messageApi.success("番茄钟已完成，记得短暂休息哦");
      autoCompleteRef.current = false;
      setTimerState(null);
    })();
  }, [timerState?.phase]);

  const pauseTimer = () =>
    setTimerState((prev) => (prev ? { ...prev, isPaused: true } : prev));
  const resumeTimer = () =>
    setTimerState((prev) =>
      prev && prev.phase !== "completed" ? { ...prev, isPaused: false } : prev,
    );

  const cancelTimer = () => {
    setTimerState(null);
  };

  const totalProgress = summary.totals.progressPercent;

  const renderHabitCard = (item: HabitSummaryItem) => {
    const statusLabel = STATUS_LABELS[item.status];
    const statusStyle = STATUS_STYLE[item.status];
    const showStartButton = item.status === "pending" || item.status === "skipped" || item.status === "done";
    const showCompleteButton = item.status === "doing";
    const showSkipButton = item.status === "pending" || item.status === "doing";

    return (
      <Card
        key={item.code}
        className="border-white/12 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-indigo-950/80 text-slate-100 shadow-[0_28px_80px_rgba(76,29,149,0.4)] transition hover:border-violet-400/50"
      >
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl text-white">{item.title}</CardTitle>
            <CardDescription className="text-sm text-slate-200">
              {item.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}>
              {statusLabel}
            </span>
            <button
              type="button"
              aria-label="拖动排序（即将支持）"
              className="cursor-grab rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-300"
              disabled
            >
              Drag
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-200">
            <span>计划 {item.plannedMinutes} 分钟</span>
            {item.status === "done" ? (
              <span className="text-emerald-200">
                实际 {item.actualMinutes || item.plannedMinutes} 分钟
              </span>
            ) : null}
            {item.currentTask ? (
              <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs text-violet-100">
                当前任务：{item.currentTask.title}
              </span>
            ) : null}
          </div>

          {item.hints.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-300">
              {item.hints.map((hint) => (
                <li key={hint}>• {hint}</li>
              ))}
            </ul>
          ) : null}

          {item.actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.actions.map((action) => (
                <Button
                  key={`${item.code}-${action.href}`}
                  asChild
                  size="sm"
                  variant={action.variant === "primary" ? "default" : "outline"}
                  className={
                    action.variant === "primary"
                      ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-[0_12px_30px_rgba(76,29,149,0.45)] hover:from-violet-500 hover:via-indigo-500 hover:to-purple-500"
                      : "border-violet-400/40 bg-slate-900/60 text-slate-200 hover:bg-violet-900/30"
                  }
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {showStartButton ? (
              <Button
                onClick={() => handleStart(item.code)}
                disabled={isActionLoading(item.code, "start")}
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-4 text-white shadow-[0_12px_30px_rgba(76,29,149,0.45)] hover:from-violet-500 hover:via-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActionLoading(item.code, "start") ? "启动中..." : item.status === "done" ? "重新开始" : "开始"}
              </Button>
            ) : null}

            {showCompleteButton ? (
              <Button
                variant="outline"
                className="border-emerald-400/60 bg-emerald-600/20 text-emerald-100 hover:bg-emerald-500/25"
                disabled={isActionLoading(item.code, "complete")}
                onClick={() => {
                  if (item.code === "pomodoro") {
                    const actual = calcPomodoroActualMinutes(item, timerState);
                    cancelTimer();
                    handleComplete(item.code, actual);
                  } else {
                    handleComplete(item.code);
                  }
                }}
              >
                {isActionLoading(item.code, "complete") ? "提交中..." : "完成"}
              </Button>
            ) : null}

            {showSkipButton ? (
              <Button
                variant="outline"
                className="border-white/20 bg-slate-900/60 text-slate-300 hover:bg-slate-800/70"
                disabled={isActionLoading(item.code, "skip")}
                onClick={() => {
                  if (item.code === "pomodoro") {
                    cancelTimer();
                  }
                  handleSkip(item.code);
                }}
              >
                {isActionLoading(item.code, "skip") ? "处理中..." : "跳过"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  const timerDisplay = timerState && pomodoroItem && timerState.phase !== "completed"
    ? (() => {
        const phaseLabel = timerState.phase === "focus" ? "专注中" : "休息中";
        const totalSeconds =
          timerState.focusMinutes * 60 + timerState.breakMinutes * 60;
        const elapsedSeconds =
          totalSeconds -
          (timerState.phase === "break"
            ? timerState.remainingSeconds
            : timerState.remainingSeconds + timerState.breakMinutes * 60);
        const progressValue =
          totalSeconds > 0 ? Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalSeconds) * 100))) : 0;

        return (
          <div className="fixed bottom-6 left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-violet-600/60 bg-slate-950/95 p-4 shadow-[0_20px_60px_rgba(76,29,149,0.55)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-violet-200">番茄计时</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {phaseLabel} · {formatCountdown(timerState.remainingSeconds)}
                </h3>
                <p className="text-xs text-slate-400">
                  已完成 {formatTwoDigits(Math.floor(elapsedSeconds / 60))} 分钟
                </p>
              </div>
              <div className="flex flex-col gap-2 md:max-w-xs">
                <Progress value={progressValue} className="h-2 bg-slate-700" />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-slate-200 hover:bg-slate-800/60"
                    onClick={timerState.isPaused ? resumeTimer : pauseTimer}
                  >
                    {timerState.isPaused ? "继续" : "暂停"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-violet-400/60 text-violet-200 hover:bg-violet-500/20"
                    onClick={() => {
                      cancelTimer();
                      handleComplete("pomodoro");
                    }}
                  >
                    直接完成
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()
    : null;

  return (
    <>
      {contextHolder}
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.32),_rgba(15,23,42,0.96))]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(76,29,149,0.22)_0%,rgba(30,64,175,0.18)_38%,transparent_76%)]" />
          <div className="absolute left-[-12%] top-1/3 h-[420px] w-[420px] rounded-full bg-violet-600/25 blur-[160px]" />
          <div className="absolute right-[-10%] top-1/4 h-[360px] w-[360px] rounded-full bg-indigo-500/25 blur-[200px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="border-white/15 bg-slate-950/70 text-white/80 hover:bg-slate-900/70"
              >
                返回
              </Button>
              <span className="text-xs text-slate-300">
                {summary.date} · {summary.timezone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                className="border-violet-400/60 text-violet-100 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? "刷新中..." : "刷新清单"}
              </Button>
            </div>
          </div>

          <Card className="border-white/12 bg-slate-950/70 text-slate-100 shadow-[0_28px_90px_rgba(76,29,149,0.4)] backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl text-white">今日习惯清单</CardTitle>
                  <CardDescription className="text-sm text-slate-200">
                    将高效专注、复盘整理与放松收尾结合，保持稳定节奏。
                  </CardDescription>
                </div>
                <div className="rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-sm text-violet-100">
                  完成 {summary.totals.completedCount}/{summary.totals.totalCount} · 进度 {totalProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={totalProgress} className="h-2 bg-slate-800" />
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <span>计划时长 {summary.totals.plannedMinutes} 分钟</span>
                  <span>已完成 {summary.totals.actualMinutes} 分钟</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderedItems.map(renderHabitCard)}
            </CardContent>
          </Card>
        </div>
      </div>

      {timerDisplay}
    </>
  );
}
