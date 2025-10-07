import { useMemo } from "react";

import type { Database } from "@/db/types";

type AssistantMessageRow = Database["public"]["Tables"]["assistant_messages"]["Row"];

type ChatMessageItemProps = {
  message: AssistantMessageRow & {
    content: {
      text: string;
      citations?: Array<{ title: string; url?: string }>;
    };
  };
  timestamp: string;
};

type ParsedBlock =
  | { type: "code"; content: string }
  | { type: "text"; content: string };

function parseContent(text: string): ParsedBlock[] {
  const segments = text.split(/```/g);
  const blocks: ParsedBlock[] = [];

  segments.forEach((segment, index) => {
    if (index % 2 === 1) {
      blocks.push({ type: "code", content: segment.trim() });
    } else if (segment.trim().length > 0) {
      blocks.push({ type: "text", content: segment.trim() });
    }
  });

  return blocks;
}

function renderTextBlock(block: string) {
  const paragraphs = block.split(/\n{2,}/g);

  return paragraphs.map((paragraph, idx) => (
    <p
      key={`paragraph-${idx}`}
      className="text-sm leading-relaxed text-slate-200/90 whitespace-pre-line"
    >
      {paragraph}
    </p>
  ));
}

function renderCodeBlock(block: string) {
  return (
    <pre className="not-prose mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200 overflow-x-auto">
      <code className="whitespace-pre">{block}</code>
    </pre>
  );
}

export function ChatMessageItem({ message, timestamp }: ChatMessageItemProps) {
  const isUser = message.role === "user";
  const parsedBlocks = useMemo(() => parseContent(message.content.text ?? ""), [message.content.text]);

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[72ch] rounded-2xl border px-4 py-3 shadow-lg transition",
          isUser
            ? "border-violet-400/20 bg-violet-600/25 text-violet-100"
            : "border-white/10 bg-slate-800/70 text-slate-100",
        ].join(" ")}
      >
        <div className="space-y-3">
          {parsedBlocks.length > 0
            ? parsedBlocks.map((block, idx) =>
                block.type === "code" ? (
                  <div key={`code-${idx}`}>{renderCodeBlock(block.content)}</div>
                ) : (
                  <div key={`text-${idx}`}>{renderTextBlock(block.content)}</div>
                ),
              )
            : (
              <p className="text-sm leading-relaxed text-slate-200/90 whitespace-pre-line">
                {message.content.text || "（空消息）"}
              </p>
            )}
        </div>

        {!isUser && message.content.citations && message.content.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.content.citations.map((citation, index) => (
              <span
                key={`${message.id}-citation-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
              >
                参考：{citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-violet-300"
                  >
                    {citation.title}
                  </a>
                ) : (
                  citation.title
                )}
              </span>
            ))}
          </div>
        )}
        <p
          className={[
            "mt-2 text-xs",
            isUser ? "text-violet-200/70 text-right" : "text-slate-400/70",
          ].join(" ")}
        >
          {timestamp}
        </p>
      </div>
    </div>
  );
}
