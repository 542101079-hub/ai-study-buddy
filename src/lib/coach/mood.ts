export type Mood = "positive" | "neutral" | "anxious" | "down";

const keywords: Record<Exclude<Mood, "neutral">, string[]> = {
  positive: ["开心", "顺利", "完成", "自信", "不错", "棒", "收获", "进步", "解决", "轻松"],
  anxious: ["焦虑", "担心", "紧张", "慌", "卡住", "不会", "压力", "糟糕", "慌张"],
  down: ["沮丧", "难过", "低落", "想放弃", "疲惫", "累", "不想学", "崩溃", "失落"],
};

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

export function classifyMood(rawText: string): Mood {
  if (!rawText || !rawText.trim()) {
    return "neutral";
  }

  const normalized = rawText.trim();
  const haystack = normalized.toLowerCase();

  const scores: Record<Mood, number> = {
    positive: 0,
    neutral: 0,
    anxious: 0,
    down: 0,
  };

  (Object.keys(keywords) as Array<Exclude<Mood, "neutral">>).forEach((mood) => {
    const list = keywords[mood];
    scores[mood] = list.reduce((acc, token) => {
      if (!token) return acc;
      const cleaned = token.toLowerCase();
      const lowerMatches = countOccurrences(haystack, cleaned);
      const nativeMatches = countOccurrences(normalized, token);
      return acc + Math.max(lowerMatches, nativeMatches);
    }, 0);
  });

  const dominant = (["positive", "anxious", "down"] as const).reduce(
    (prev, current) => (scores[current] > scores[prev] ? current : prev),
    "positive",
  );

  if (scores[dominant] === 0) {
    return "neutral";
  }

  if (dominant === "positive" && scores.positive <= scores.anxious && scores.positive <= scores.down) {
    return "neutral";
  }

  return dominant;
}
