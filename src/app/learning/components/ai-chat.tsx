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
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer.answer,
        timestamp: new Date(),
        isAIUnavailable: data.isAIUnavailable
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
    <div className={`flex flex-col bg-slate-900/60 rounded-xl border border-white/10 backdrop-blur ${className}`}>
      {/* 聊天头部 */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">AI</span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium">AI学习搭子</h3>
          <p className="text-white/60 text-xs">随时为你答疑解惑</p>
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
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          🗑️ 清空
        </Button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 min-h-[300px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : message.isAIUnavailable
                  ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
                  : 'bg-white/10 text-white/90'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-violet-200' : 'text-white/50'
              }`}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-white/50 text-xs mb-2">💡 快捷问题：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-all duration-200"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="有什么学习问题想问我吗？"
            disabled={isLoading}
            className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-violet-400"
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              '发送'
            )}
          </Button>
        </div>
        <p className="text-xs text-white/40 mt-1">
          {input.length}/500 字符
        </p>
      </form>
    </div>
  );
}
