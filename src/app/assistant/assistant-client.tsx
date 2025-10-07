"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { message as antdMessage } from "antd";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/db/types";

import { ChatMessageItem } from "./chat-message-item";

type AssistantSession = Database["public"]["Tables"]["assistant_sessions"]["Row"];
type AssistantMessageRow = Database["public"]["Tables"]["assistant_messages"]["Row"];

type Citation = {
  title: string;
  url?: string;
};

type MessageContent = {
  text: string;
  citations?: Citation[];
  extra?: Record<string, unknown>;
};

type AssistantMessage = Omit<AssistantMessageRow, "content"> & {
  content: MessageContent;
};

type TenantMeta = {
  name: string;
  logo_url: string | null;
  tagline: string | null;
};

type AssistantClientProps = {
  tenant: TenantMeta | null;
  initialSessionId?: string | null;
};

const tokyoFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

function normalizeMessage(row: AssistantMessageRow): AssistantMessage {
  const raw = row.content as unknown;
  const base =
    raw && typeof raw === "object"
      ? (raw as { text?: unknown; citations?: unknown; extra?: unknown })
      : {};

  const citations = Array.isArray(base.citations)
    ? base.citations
        .map((item) => {
          if (item && typeof item === "object") {
            const record = item as { title?: unknown; url?: unknown };
            const title = typeof record.title === "string" ? record.title : null;
            const url = typeof record.url === "string" ? record.url : undefined;
            if (title) {
              return { title, url };
            }
          }
          return null;
        })
        .filter(Boolean) as Citation[]
    : [];

  return {
    ...row,
    content: {
      text: typeof base.text === "string" ? base.text : String(base.text ?? ""),
      citations,
      extra: (base.extra as Record<string, unknown> | undefined) ?? undefined,
    },
  };
}

function initialsFromName(name?: string | null) {
  if (!name) return "AI";
  const trimmed = name.trim();
  if (!trimmed) return "AI";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AssistantClient({ tenant, initialSessionId }: AssistantClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId ?? null,
  );
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  const [lastUserQuestion, setLastUserQuestion] = useState<string | null>(null);

  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const tenantName = tenant?.name ?? "AI 学习搭子";
  const tenantTagline = tenant?.tagline ?? "围绕你的学习路径，精准辅助每一步";

  const updateQueryString = useCallback(
    (sessionId: string | null) => {
      const currentParam = searchParams.get("s");
      if (sessionId === currentParam) {
        return;
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (sessionId) {
        params.set("s", sessionId);
      } else {
        params.delete("s");
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/assistant/sessions");
      if (!res.ok) {
        throw new Error("failed");
      }
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (error) {
      console.error("[assistant] load sessions failed", error);
      messageApi.error("无法加载对话列表，请稍后重试。");
    } finally {
      setSessionsLoading(false);
    }
  }, [messageApi]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/assistant/messages?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = await res.json();
        const normalized = Array.isArray(data.messages)
          ? (data.messages as AssistantMessageRow[]).map(normalizeMessage)
          : [];
        setMessages(normalized);
      } catch (error) {
        console.error("[assistant] load messages failed", error);
        messageApi.error("加载消息失败，请稍后再试。");
      } finally {
        setMessagesLoading(false);
      }
    },
    [messageApi],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!sessionsLoading) {
      if (!selectedSessionId && sessions.length > 0) {
        const fallbackId =
          initialSessionId && sessions.some((session) => session.id === initialSessionId)
            ? initialSessionId
            : sessions[0]?.id ?? null;
        if (fallbackId) {
          setSelectedSessionId(fallbackId);
          updateQueryString(fallbackId);
        }
      } else if (
        selectedSessionId &&
        !sessions.some((session) => session.id === selectedSessionId)
      ) {
        setSelectedSessionId(null);
        updateQueryString(null);
      }
    }
  }, [
    sessions,
    sessionsLoading,
    selectedSessionId,
    updateQueryString,
    initialSessionId,
  ]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }
    updateQueryString(selectedSessionId);
    void loadMessages(selectedSessionId);
  }, [selectedSessionId, loadMessages, updateQueryString]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, messagesLoading]);

  const handleCreateSession = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error("failed");
      }
      const data = await res.json();
      const session: AssistantSession | undefined = data.session;
      if (session) {
        setSessions((prev) => [session, ...prev]);
        setSelectedSessionId(session.id);
        messageApi.success("已创建新的对话。");
      }
    } catch (error) {
      console.error("[assistant] create session failed", error);
      messageApi.error("创建对话失败，请稍后再试。");
    }
  }, [messageApi]);

  const handleRenameSession = useCallback(
    async (sessionId: string) => {
      const target = sessions.find((session) => session.id === sessionId);
      if (!target) return;

      const newTitle = prompt("输入新的对话标题", target.title);
      if (!newTitle || newTitle.trim() === target.title) {
        return;
      }

      try {
        const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle.trim() }),
        });
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = await res.json();
        const updated: AssistantSession | undefined = data.session;
        if (updated) {
          setSessions((prev) =>
            prev.map((session) => (session.id === sessionId ? updated : session)),
          );
          messageApi.success("已更新对话名称。");
        }
      } catch (error) {
        console.error("[assistant] rename session failed", error);
        messageApi.error("重命名失败，请稍后再试。");
      }
    },
    [messageApi, sessions],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const target = sessions.find((session) => session.id === sessionId);
      if (!target) return;

      const confirmed = confirm(`确定要删除「${target.title}」这段对话吗？`);
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("failed");
        }
        setSessions((prev) => prev.filter((session) => session.id !== sessionId));
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        messageApi.success("已删除对话。");
      } catch (error) {
        console.error("[assistant] delete session failed", error);
        messageApi.error("删除对话失败，请稍后再试。");
      }
    },
    [messageApi, selectedSessionId, sessions],
  );

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) =>
      session.title.toLowerCase().includes(term),
    );
  }, [sessions, searchTerm]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const sendMessage = useCallback(
    async (rawText: string, options?: { followUp?: boolean }) => {
      const targetSessionId = selectedSessionId;
      if (!targetSessionId) {
        messageApi.warning("请先创建或选择一个对话。");
        return;
      }

      const trimmed = rawText.trim();
      if (!trimmed || sending) {
        return;
      }

      const optimisticId = `temp-${Date.now()}`;
      const optimisticMessage: AssistantMessage = {
        id: optimisticId,
        tenant_id: activeSession?.tenant_id ?? "",
        session_id: targetSessionId,
        user_id: "",
        role: "user",
        content: { text: trimmed },
        tokens: null,
        created_at: new Date().toISOString(),
        order_num: Number.MAX_SAFE_INTEGER,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const res = await fetch("/api/assistant/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: targetSessionId,
            text: trimmed,
            followUp: options?.followUp ?? false,
          }),
        });

        if (!res.ok) {
          throw new Error(`status_${res.status}`);
        }

        await loadMessages(targetSessionId);
        await loadSessions();
        if (!options?.followUp) {
          setLastUserQuestion(trimmed);
        }
      } catch (error) {
        console.error("[assistant] send message failed", error);
        messageApi.error("发送失败，请稍后再试。");
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      } finally {
        setSending(false);
        setInput("");
      }
    },
    [
      selectedSessionId,
      sending,
      messageApi,
      loadMessages,
      loadSessions,
      activeSession?.tenant_id,
    ],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleTextareaKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  const handleFollowUp = useCallback(async () => {
    const question = lastUserQuestion ?? "我还没懂，请换个角度再解释。";
    await sendMessage(question, { followUp: true });
  }, [lastUserQuestion, sendMessage]);

  const sessionListContent = () => {
    if (sessionsLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-12 w-full animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      );
    }

    if (filteredSessions.length === 0) {
      return (
        <Card className="border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
          {sessions.length === 0
            ? "还没有任何对话，点击「新建对话」开始提问吧。"
            : "没有匹配的对话，换个关键词试试。"}
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {filteredSessions.map((session) => {
          const isActive = session.id === selectedSessionId;
          const label = tokyoFormatter.format(new Date(session.updated_at));

          return (
            <div
              key={session.id}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setSelectedSessionId(session.id)}
                className={[
                  "w-full rounded-xl border border-white/10 bg-slate-900/40 p-3 text-left transition flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-violet-400/40",
                  isActive
                    ? "border-violet-400/40 bg-violet-600/15 text-slate-100"
                    : "hover:bg-white/5 text-slate-200",
                ].join(" ")}
              >
                <span className="line-clamp-1 text-sm">{session.title}</span>
                <span className="ml-auto text-xs text-slate-500">{label}</span>
              </button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-white/10 bg-slate-950/50 text-xs text-slate-300 hover:bg-white/5 hover:text-slate-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleRenameSession(session.id);
                  }}
                >
                  重命名
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-white/10 bg-slate-950/50 text-xs text-slate-300 hover:bg-white/5 hover:text-rose-300"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteSession(session.id);
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const chatContent = () => {
    if (messagesLoading) {
      return (
        <div className="space-y-4 text-slate-500">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-800/40"
            />
          ))}
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
          <p className="text-base font-medium text-slate-300">还没有任何消息</p>
          <p className="mt-2 max-w-md text-sm">
            提问学习上的疑惑、备考策略或学习计划，我会以结构化的答案给你灵感。
          </p>
          <Button
            className="mt-5 bg-violet-600 text-white hover:bg-violet-500"
            onClick={() => void handleCreateSession()}
          >
            新建对话
          </Button>
        </div>
      );
    }

    return messages.map((message) => {
      const timestamp = tokyoFormatter.format(new Date(message.created_at));
      return (
        <ChatMessageItem
          key={message.id}
          message={message}
          timestamp={timestamp}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0e0b1a] to-[#141129]">
      {contextHolder}
      <div className="container mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <aside className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <Avatar className="h-11 w-11 bg-violet-600/80 text-white">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenantName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initialsFromName(tenantName)
                )}
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">{tenantName}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{tenantTagline}</p>
              </div>
            </div>

            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索对话标题或关键字"
              className="bg-slate-950/70 text-slate-200 placeholder:text-slate-500 border-white/10 focus-visible:ring-violet-400/40"
            />

            <Button
              className="w-full bg-violet-600 text-white hover:bg-violet-500"
              onClick={() => void handleCreateSession()}
            >
              新建对话
            </Button>

            <div className="space-y-3">{sessionListContent()}</div>
          </aside>
        </div>

        <div className="col-span-12 md:col-span-8 lg:col-span-9">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-100">
                  {activeSession?.title ?? "智能学习搭子"}
                </h1>
                <p className="text-sm text-slate-400">{tenantTagline}</p>
              </div>
              <Button
                className="bg-violet-600 text-white hover:bg-violet-500"
                onClick={() => void handleCreateSession()}
              >
                新建对话
              </Button>
            </header>

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/40">
                <div
                  ref={messageContainerRef}
                  className="h-[calc(100vh-220px)] overflow-y-auto px-4 pt-4 pb-24 space-y-4"
                >
                  {chatContent()}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="sticky bottom-0 rounded-b-2xl border-t border-white/10 bg-slate-900/70 px-4 py-3 backdrop-blur-md">
                    <div className="flex items-end gap-3">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        disabled={sending}
                        className="min-h-[56px] max-h-[200px] resize-none bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
                        placeholder="输入你的问题，如：‘贪心与动态规划的区别是什么？’"
                        maxLength={1200}
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          type="submit"
                          disabled={sending || !input.trim()}
                          className="px-5 bg-violet-600 text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sending ? "发送中…" : "发送"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedSessionId || sending || messages.length === 0}
                          className="border-white/15 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void handleFollowUp()}
                        >
                          还没懂？
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Tip：你可以粘贴题目截图或代码，我会更快定位问题。
                    </p>
                  </div>
                </form>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-slate-300">
                  <h3 className="mb-2 text-sm font-medium text-slate-200">
                    推荐补充资源
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="opacity-70">对接后自动展示，当前为空~</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-slate-300">
                  <h3 className="mb-2 text-sm font-medium text-slate-200">使用小提示</h3>
                  <ul className="space-y-2 text-sm leading-relaxed">
                    <li>问题描述越具体，答案越精准。</li>
                    <li>通过「还没懂？」按钮，可以追问并获得不同角度的解释。</li>
                    <li>稍后支持引用真实资料，再助你快速定位原始来源。</li>
                  </ul>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
