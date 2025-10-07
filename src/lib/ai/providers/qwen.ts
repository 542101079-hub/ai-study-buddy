import { z } from "zod";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const envSchema = z.object({
  QWEN_API_KEY: z.string().min(10),
  QWEN_BASE_URL: z.string().default("https://dashscope.aliyuncs.com/compatible-mode/v1"),
  QWEN_MODEL: z.string().default("qwen-plus"),
});

const env = envSchema.parse({
  QWEN_API_KEY: process.env.QWEN_API_KEY,
  QWEN_BASE_URL: process.env.QWEN_BASE_URL,
  QWEN_MODEL: process.env.QWEN_MODEL,
});

type QwenChoice = {
  message?: {
    role?: string;
    content?: string;
  };
};

type QwenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type QwenResponse = {
  choices?: QwenChoice[];
  usage?: QwenUsage;
};

export async function qwenChat(messages: ChatMessage[]) {
  const response = await fetch(`${env.QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.QWEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.QWEN_MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Qwen error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as QwenResponse;
  const text = data?.choices?.[0]?.message?.content ?? "";
  return {
    text,
    usage: data?.usage ?? {},
  };
}
