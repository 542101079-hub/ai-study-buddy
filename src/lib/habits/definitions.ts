import type { Json } from "@/db/types";

export const HABIT_TIMEZONE = "Asia/Tokyo";

export type HabitCode = "review" | "tidy" | "pomodoro" | "cool_down";

export type HabitStatus = "pending" | "doing" | "done" | "skipped";

export type HabitAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type HabitTimerConfig = {
  focusMinutes: number;
  breakMinutes?: number;
};

export type HabitDefinition = {
  code: HabitCode;
  title: string;
  description: string;
  plannedMinutes: number;
  order: number;
  actions?: HabitAction[];
  timer?: HabitTimerConfig;
  hints?: string[];
};

export const HABIT_DEFINITIONS: HabitDefinition[] = [
  {
    code: "review",
    title: "10 分钟快速回顾",
    description: "回看昨日要点，找出仍然模糊的地方，形成今日关注点。",
    plannedMinutes: 10,
    order: 1,
    actions: [
      {
        label: "快速回顾",
        href: "/journal?mode=quick-review",
        variant: "primary",
      },
    ],
    hints: [
      "检查昨日待办是否完成",
      "写下 1-2 个仍然未解决的问题",
    ],
  },
  {
    code: "tidy",
    title: "整理昨日笔记",
    description: "梳理昨日笔记结构，补充公式和关键结论，为今天打好基础。",
    plannedMinutes: 10,
    order: 2,
    actions: [
      {
        label: "整理笔记",
        href: "/journal?mode=tidy",
        variant: "secondary",
      },
    ],
    hints: [
      "把零散记录合并成清晰段落",
      "标注仍需补充的材料或例题",
    ],
  },
  {
    code: "pomodoro",
    title: "25+5 番茄专注",
    description: "25 分钟沉浸攻克重点，之后 5 分钟总结与拉伸，保持节奏感。",
    plannedMinutes: 30,
    order: 3,
    timer: {
      focusMinutes: 25,
      breakMinutes: 5,
    },
    hints: [
      "从最重要的任务开始",
      "记录过程中遇到的卡点",
    ],
  },
  {
    code: "cool_down",
    title: "收尾复盘",
    description: "整理今日收获与待办，把状态留到下一次练习。",
    plannedMinutes: 5,
    order: 4,
    hints: [
      "写下一个最值得保留的解题思路",
      "列出明日优先级最高的 1-2 件事",
    ],
  },
];

export const HABIT_CODE_SET = new Set<HabitCode>(
  HABIT_DEFINITIONS.map((habit) => habit.code),
);

export const HABIT_CODES = HABIT_DEFINITIONS.map((habit) => habit.code);

export function getHabitDefinition(code: HabitCode): HabitDefinition | undefined {
  return HABIT_DEFINITIONS.find((habit) => habit.code === code);
}

export function buildDefaultMeta(code: HabitCode): Json {
  const definition = getHabitDefinition(code);
  if (!definition) {
    return {};
  }

  return {
    title: definition.title,
    description: definition.description,
    hints: definition.hints ?? [],
    actions: definition.actions ?? [],
    timer: definition.timer ?? null,
  };
}
