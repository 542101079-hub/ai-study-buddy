"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAIUnavailable?: boolean;
}

interface Props {
  goalId?: string;
  className?: string;
}

export function AIChatComponent({ goalId, className = "" }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是你的AI学习搭子，有什么学习问题可以问我哦～ 😊\n\n我可以帮你：\n• 解答学习中的疑问\n• 提供学习建议和方法\n• 推荐学习资源\n• 制定学习计划\n\n有什么想问的吗？',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          goalId: goalId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI API Error:', response.status, errorData);
        
        // 添加错误消息到聊天
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: '抱歉，我现在遇到了一些技术问题，请稍后再试。如果问题持续存在，请联系管理员。',
          timestamp: new Date(),
          isAIUnavailable: true
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer?.answer || data.response || '收到了您的消息，但回复内容为空。',
        timestamp: new Date(),
        isAIUnavailable: false
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 如果有后续问题建议，可以显示快捷按钮
      if (data.answer.followUpQuestions && data.answer.followUpQuestions.length > 0) {
        // 可以在这里添加快捷问题按钮的逻辑
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，我现在遇到了一些技术问题，请稍后再试。如果问题持续存在，请联系管理员。',
        timestamp: new Date(),
        isAIUnavailable: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // 重新聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const quickQuestions = [
    "如何制定有效的学习计划？",
    "怎样提高学习效率？",
    "如何克服学习拖延症？",
    "推荐一些学习方法"
  ];

  return (
    <div className={`flex flex-col bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-indigo-900/90 rounded-xl border border-violet-500/30 backdrop-blur shadow-2xl relative z-10 ${className}`}>
      {/* 聊天头部 */}
      <div className="flex items-center gap-3 p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-600/20 to-purple-600/20">
        <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-sm font-bold">🤖</span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg">AI学习搭子</h3>
          <p className="text-violet-200/80 text-sm">智能学习助手，随时为你答疑解惑</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMessages([{
              role: 'assistant',
              content: '你好！我是你的AI学习搭子，有什么学习问题可以问我哦～ 😊',
              timestamp: new Date()
            }]);
          }}
          className="text-violet-200/70 hover:text-white hover:bg-violet-500/20 border border-violet-400/30 hover:border-violet-300/50 transition-all duration-200 relative z-20 cursor-pointer"
        >
          🗑️ 清空对话
        </Button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '300px', maxHeight: 'calc(100% - 140px)' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 shadow-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border border-violet-400/30'
                  : message.isAIUnavailable
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-100 border border-orange-400/40'
                  : 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 text-white border border-slate-600/40'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === 'user' 
                  ? 'text-violet-100/80' 
                  : message.isAIUnavailable 
                  ? 'text-orange-200/70'
                  : 'text-slate-300/70'
              }`}>
                {message.timestamp.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 border border-slate-600/40 rounded-lg px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-slate-200 text-sm">AI正在思考中...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p className="text-violet-200/70 text-sm mb-3 font-medium">💡 快速开始：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="text-xs px-3 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 text-violet-100 hover:text-white rounded-full border border-violet-400/30 hover:border-violet-300/50 transition-all duration-200 shadow-sm relative z-20 cursor-pointer"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-violet-500/20 bg-gradient-to-r from-slate-800/50 to-slate-900/50 relative z-20">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="有什么学习问题想问我吗？"
            disabled={isLoading}
            className="flex-1 bg-slate-700/50 border-violet-400/30 text-white placeholder:text-violet-200/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 rounded-lg relative z-30"
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow-lg border border-violet-400/30 transition-all duration-200 relative z-30"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              '发送'
            )}
          </Button>
        </div>
        <p className="text-xs text-violet-200/50 mt-2">
          {input.length}/500 字符
        </p>
      </form>
    </div>
  );
}
