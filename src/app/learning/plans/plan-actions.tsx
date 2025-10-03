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

  const handleDelete = async () => {
    if (!confirm(`确认要删除学习计划「${planTitle || 'AI 学习计划'}」吗？

删除后相关生成任务会一并移除。`)) {
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="border-red-500/40 text-red-300 hover:bg-red-500/10"
    >
      {isDeleting ? '删除中...' : '删除计划'}
    </Button>
  );
}
