import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface StudyBuddyIllustrationProps {
  className?: string;
}

const AVATAR_COLORS = [
  "from-sky-400 to-blue-600",
  "from-fuchsia-400 to-violet-600",
  "from-emerald-400 to-teal-600",
];

const AVATAR_INITIALS = ["AI", "小智", "Buddy"];

export function StudyBuddyIllustration({
  className,
}: StudyBuddyIllustrationProps) {
  return (
    <div
      className={cn(
        "relative flex w-full max-w-[420px] flex-col items-center gap-6 rounded-3xl border border-white/15 bg-white/5 p-6 text-white shadow-[0_18px_60px_-32px_rgba(56,189,248,0.65)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="absolute inset-x-6 top-4 h-28 rounded-3xl bg-gradient-to-br from-sky-500/25 via-indigo-500/20 to-violet-500/25 blur-2xl" aria-hidden />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm uppercase tracking-[0.3em] text-slate-200/80">
            学习搭子在线
          </span>
          <h3 className="text-xl font-semibold leading-tight">
            随时回应的 AI 学伴
          </h3>
          <p className="text-sm text-slate-200/80">
            通过实时情绪检测与计划调整，陪你保持节奏、共同成长。
          </p>
        </div>
        <div className="relative flex -space-x-4">
          {AVATAR_INITIALS.map((label, index) => (
            <Avatar
              key={label}
              className={cn(
                "h-14 w-14 border-white/30 bg-gradient-to-br text-sm",
                AVATAR_COLORS[index % AVATAR_COLORS.length],
              )}
            >
              {label}
            </Avatar>
          ))}
        </div>
      </div>
      <div className="relative flex w-full items-center gap-6 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-200">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/30 text-base font-semibold text-white">
          ⚡
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-white">今日陪伴计划</span>
          <span className="text-xs text-slate-200/80">
            25 分钟算法训练 · 15 分钟作品集复盘 · 晚间求职问答
          </span>
        </div>
      </div>
    </div>
  );
}
