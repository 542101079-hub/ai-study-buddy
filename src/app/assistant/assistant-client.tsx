"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { message as antdMessage } from "antd";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import type { Database } from "@/db/types";

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
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUserQuestion, setLastUserQuestion] = useState<string | null>(null);

  const sessionCount = sessions.length;

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
      router.replace(
        queryString ? `${pathname}?${queryString}` : pathname,
        { scroll: false },
      );
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
    if (sessionsLoading) {
      return;
    }

    if (!selectedSessionId) {
      const querySession = searchParams.get("s");
      if (querySession && sessions.some((s) => s.id === querySession)) {
        setSelectedSessionId(querySession);
        return;
      }

      const mostRecent = sessions[0]?.id ?? null;
      if (mostRecent) {
        setSelectedSessionId(mostRecent);
        updateQueryString(mostRecent);
      }
    } else {
      const exists = sessions.some((session) => session.id === selectedSessionId);
      if (!exists) {
        setSelectedSessionId(null);
        updateQueryString(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, sessionsLoading]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    updateQueryString(selectedSessionId);
    void loadMessages(selectedSessionId);
  }, [selectedSessionId, loadMessages, updateQueryString]);

  const handleCreateSession = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setSidebarOpen(false);
        messageApi.success("已创建新的对话。");
      }
    } catch (error) {
      console.error("[assistant] create session failed", error);
      messageApi.error("创建对话失败，请稍后再试。");
    }
  }, [messageApi]);

  const handleRenameSession = useCallback(
    async (sessionId: string, title: string) => {
      try {
        const trimmed = title.trim();
        if (!trimmed) {
          messageApi.warning("标题不能为空。");
          return;
        }

        const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: trimmed }),
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
    [messageApi],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
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
    [messageApi, selectedSessionId],
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

      const displayText = options?.followUp
        ? `${trimmed}\n\n（我还没完全理解，请换个角度说明。）`
        : trimmed;

      const optimisticId = `temp-${Date.now()}`;
      const optimisticMessage: AssistantMessage = {
        id: optimisticId,
        tenant_id: "",
        session_id: targetSessionId,
        user_id: "",
        role: "user",
        content: { text: displayText },
        tokens: null,
        created_at: new Date().toISOString(),
        order_num: Number.MAX_SAFE_INTEGER,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      if (!options?.followUp) {
        setLastUserQuestion(trimmed);
      }
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
      } catch (error) {
        console.error("[assistant] send message failed", error);
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        messageApi.error("发送失败，请稍后再试。");
      } finally {
        setSending(false);
        setInput("");
      }
    },
    [selectedSessionId, sending, messageApi, loadMessages, loadSessions],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleFollowUp = useCallback(async () => {
    const question = lastUserQuestion ?? "我还没懂，请换个角度再解释。";
    await sendMessage(question, { followUp: true });
  }, [lastUserQuestion, sendMessage]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const headerTitle = tenant?.name ?? "AI 学习搭子";
  const headerTagline = tenant?.tagline ?? "与你同行的智能学习助教";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-50">
      {contextHolder}

      <div className="pointer-events-none absolute inset-0 -z-10 blur-[180px] opacity-60">
        <div className="absolute left-[20%] top-10 h-56 w-56 rounded-full bg-purple-700/30" />
        <div className="absolute right-[25%] top-[40%] h-64 w-64 rounded-full bg-violet-500/25" />
        <div className="absolute left-[10%] bottom-[20%] h-60 w-60 rounded-full bg-indigo-600/20" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 lg:flex-row lg:px-10">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 flex w-full flex-col bg-slate-950/95 px-4 pb-6 pt-24 shadow-2xl transition-transform duration-200 lg:static lg:w-80 lg:px-0 lg:pb-0 lg:pt-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-2 pb-4 lg:hidden">
            <h2 className="text-lg font-semibold text-white/90">历史对话</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              关闭
            </Button>
          </div>

          <div className="flex items-center justify-between px-2 pb-3 lg:px-6">
            <div>
              <p className="text-sm text-white/60">对话列表</p>
              <h3 className="text-xl font-semibold text-white">
                共 {sessionCount} 条
              </h3>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:from-violet-500 hover:to-purple-500"
              onClick={handleCreateSession}
            >
              新建对话
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 lg:px-4">
            {sessionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-white/5"
                  />
                ))}
              </div>
            ) : sessionCount === 0 ? (
              <Card className="border border-dashed border-violet-500/40 bg-white/5 p-4 text-sm text-white/70 backdrop-blur">
                <p>还没有任何对话，点击「新建对话」开始向学习搭子提问吧！</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const isActive = session.id === selectedSessionId;
                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setSidebarOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedSessionId(session.id);
                          setSidebarOpen(false);
                        }
                      }}
                      className={[
                        "w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/60",
                        isActive
                          ? "border-violet-400/70 bg-violet-500/20 text-white shadow-lg"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white",
                      ].join(" ")}
                    >
                      <p className="line-clamp-1 text-sm font-semibold">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {tokyoFormatter.format(new Date(session.updated_at))}
                      </p>
                      <div className="mt-3 flex gap-2 text-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-black/20 text-white/60 hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            const newTitle = prompt("输入新的对话标题", session.title);
                            if (newTitle && newTitle !== session.title) {
                              void handleRenameSession(session.id, newTitle);
                            }
                          }}
                        >
                          重命名
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-black/20 text-white/60 hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            const confirmed = confirm("确定要删除这段对话吗？");
                            if (confirmed) {
                              void handleDeleteSession(session.id);
                            }
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex w-full flex-1 flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-white">{headerTitle}</h1>
                <p className="mt-2 text-sm text-white/60">{headerTagline}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:from-violet-500 hover:to-purple-500"
                  onClick={handleCreateSession}
                >
                  新建对话
                </Button>
                <Button
                  variant="outline"
                  className="border-violet-400/40 text-violet-200 hover:bg-violet-500/10 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  浏览历史
                </Button>
              </div>
            </div>
            {currentSession && (
              <p className="text-xs text-white/60">
                当前会话更新时间：{tokyoFormatter.format(new Date(currentSession.updated_at))}
              </p>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            <section className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between px-2 pb-3">
                <h2 className="text-lg font-semibold text-white">对话窗口</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-400/50 text-violet-200 hover:bg-violet-500/10"
                  disabled={!lastUserQuestion || sending || !selectedSessionId}
                  onClick={() => void handleFollowUp()}
                >
                  还没懂？
                </Button>
              </div>

              <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 bg-black/20">
                <div className="h-full max-h-[520px] space-y-4 overflow-y-auto px-4 py-6 lg:max-h-[620px]">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex gap-3"
                        >
                          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                          <div className="flex-1 space-y-3">
                            <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-white/60">
                      <p className="text-lg font-semibold text-white/80">
                        还没有任何消息
                      </p>
                      <p className="max-w-sm text-sm">
                        提问任何学习上的难点、考试准备、或学习计划问题，AI 学习搭子会以清晰的结构化答案回复你。
                      </p>
                      <Button
                        className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:from-violet-500 hover:to-purple-500"
                        onClick={() => {
                          if (!selectedSessionId) {
                            void handleCreateSession();
                          }
                        }}
                      >
                        开始第一个问题
                      </Button>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.role === "user";
                      const displayTime = tokyoFormatter.format(new Date(message.created_at));
                      return (
                        <div
                          key={message.id}
                          className={[
                            "flex w-full gap-3",
                            isUser ? "justify-end" : "justify-start",
                          ].join(" ")}
                        >
                          {!isUser && (
                            <Avatar className="h-10 w-10 shrink-0 bg-violet-600 text-white/90">
                              搭
                            </Avatar>
                          )}
                          <div
                            className={[
                              "max-w-[82%] rounded-2xl border px-4 py-3 shadow-lg transition-all",
                              isUser
                                ? "border-violet-400/60 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                                : "border-white/10 bg-white/10 text-white/80",
                            ].join(" ")}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content.text || "（空消息）"}
                            </p>
                            <p
                              className={[
                                "mt-3 text-xs",
                                isUser ? "text-white/70" : "text-white/50",
                              ].join(" ")}
                            >
                              {displayTime}
                            </p>
                            {message.role === "assistant" && (
                              <div className="mt-4 rounded-xl border border-white/5 bg-black/10 p-3">
                                <p className="text-xs font-semibold text-white/70">
                                  来源 / 参考资料
                                </p>
                                {message.content.citations &&
                                message.content.citations.length > 0 ? (
                                  <ul className="mt-2 space-y-2 text-xs text-white/60">
                                    {message.content.citations.map((citation, index) => (
                                      <li key={`${message.id}-citation-${index}`}>
                                        {citation.url ? (
                                          <a
                                            href={citation.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-violet-300 hover:text-violet-200"
                                          >
                                            {citation.title}
                                          </a>
                                        ) : (
                                          <span>{citation.title}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-xs text-white/40">暂无参考资料</p>
                                )}
                              </div>
                            )}
                          </div>
                          {isUser && (
                            <Avatar className="h-10 w-10 shrink-0 bg-indigo-600 text-white/90">
                              我
                            </Avatar>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="告诉我你遇到的学习问题或目标..."
                    disabled={sending}
                    className="flex-1 border-violet-400/40 bg-white/10 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-500/40"
                    maxLength={800}
                  />
                  <Button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="h-11 bg-gradient-to-r from-violet-600 to-purple-600 px-6 text-white shadow-lg hover:from-violet-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? "发送中..." : "发送"}
                  </Button>
                </div>
                <p className="text-right text-xs text-white/40">
                  {input.length}/800 字符 ・ 默认时区：Asia/Tokyo
                </p>
              </form>
            </section>

            <aside className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:w-96">
              <Card className="border-violet-500/30 bg-violet-500/10 p-4 text-sm text-white/80">
                <p className="font-semibold text-violet-100">推荐补充资源</p>
                <p className="mt-2 text-white/60">
                  这里将展示与回答相关的文章、课程或题库。当知识库接入后，会自动在此列出推荐内容。
                </p>
              </Card>

              <Card className="border-white/10 bg-black/20 p-4 text-sm text-white/70">
                <p className="font-semibold text-white/80">使用小提示</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                  <li>问题描述越具体，答案越精准。</li>
                  <li>通过「还没懂？」按钮，可以追问并获得不同角度的解释。</li>
                  <li>稍后支持引用真实资料，帮助快速定位原始来源。</li>
                </ul>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
