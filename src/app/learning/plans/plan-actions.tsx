
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface PlanActionsProps {
  planId: string;
  planTitle: string;
  isActive: boolean;
}

export function PlanActions({ planId, planTitle, isActive }: PlanActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/daily/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        console.error('Failed to generate daily plan from learning plan');
        return;
      }

      await response.json().catch(() => undefined);
      router.push('/learning#daily-plan');
    } catch (error) {
      console.error('Error generating daily plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除学习计划「${planTitle || 'AI 学习计划'}」吗？

删除后相关任务也会一并移除。`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/learning/plans/${planId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(`删除计划失败: ${errorData.error || '未知错误'}`);
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('learningGoals:updated'));
      }

      if (isActive) {
        router.replace('/learning/plans');
      }
      router.refresh();
      alert('计划已删除');
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('删除计划失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="border-violet-300/40 text-violet-200 hover:bg-violet-500/10"
      >
        {isGenerating ? '生成中...' : '生成今日计划'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="border-red-500/40 text-red-300 hover:bg-red-500/10"
      >
        {isDeleting ? '删除中...' : '删除计划'}
      </Button>
    </div>
  );
}
