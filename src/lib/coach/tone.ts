import type { Mood } from "./mood";

export type Tone = "strict" | "healer" | "social";

const opening: Record<Tone, string> = {
  strict: "教练模式启动：",
  healer: "温柔提醒：",
  social: "搭子上线啦：",
};

const moodSnippets: Record<Tone, Partial<Record<Mood, string>>> = {
  strict: {
    positive: "保持这种节奏，别放松，下一步记得把收获沉淀为题目或总结。",
    neutral: "既然已经投入时间，就用明确目标把今天的学习打磨得更扎实。",
    anxious: "先把问题拆成更小的步骤，给我一个具体的行动，再执行。",
    down: "状态低也得交出最低限度的成果，列三个必须完成的小任务。",
  },
  healer: {
    positive: "感受到了你的闪光点，记得奖励自己一个小憩～",
    neutral: "慢慢来没关系，把注意力放在当下，你已经在路上。",
    anxious: "紧张说明你在乎结果，先深呼吸两次，然后挑最容易的点开个头。",
    down: "允许自己脆弱，但别忘了，有我陪你，先写下此刻最想感谢的事吧。",
  },
  social: {
    positive: "太棒啦！这一刻必须点赞，等着看你炫成果。",
    neutral: "搭子听得懂你！要不要一起设个小目标？我随时 online。",
    anxious: "别慌，我们并肩冲，先说说卡住哪一步，搭子帮你出主意。",
    down: "抱抱你～把难过告诉我，顺便安排个轻松任务当缓冲。",
  },
};

const followUp: Record<Tone, string> = {
  strict: "写完日志后，用 10 分钟复盘今天最关键的一个知识点，立刻执行。",
  healer: "给自己一点缓冲，喝口水或伸展一下，再决定下一步小行动。",
  social: "记得来和我继续汇报战况，我们一起把学习热度保持住！",
};

export function replyTemplate(tone: Tone, mood: Mood, summary?: string): string {
  const intro = opening[tone];
  const moodLine =
    moodSnippets[tone][mood] ??
    "你的状态我已经收到啦，我们一起把今天安排得更有力量。";
  const summaryLine = summary ? `我记下了：${summary}` : undefined;
  const outro = followUp[tone];

  return [intro, summaryLine, moodLine, outro]
    .filter(Boolean)
    .map((line) => String(line))
    .join("\n\n");
}
