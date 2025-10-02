"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function QuickFix() {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleQuickFix = async () => {
    setIsFixing(true);
    setResult('');

    try {
      const response = await fetch('/api/admin/database/simple-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          setResult('✅ 数据库表已存在！现在可以创建学习目标了。');
          // 3秒后刷新页面
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          setResult('✅ 检查完成！');
        }
      } else {
        if (data.sql) {
          setResult(`❌ 需要手动创建数据库表！\n\n请按以下步骤操作：\n1. 打开Supabase控制台\n2. 进入SQL编辑器\n3. 执行项目根目录的 CREATE_LEARNING_TABLES.sql 文件\n4. 刷新此页面`);
        } else {
          setResult('❌ 检查失败: ' + data.error);
        }
      }
    } catch (error) {
      setResult('❌ 请求失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <span className="text-red-400 text-xl">⚠️</span>
          <div>
            <h3 className="text-red-300 font-medium text-sm">数据库表缺失</h3>
            <p className="text-red-200/70 text-xs mt-1">
              学习目标功能需要数据库表支持
            </p>
            
            <Button
              onClick={handleQuickFix}
              disabled={isFixing}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 h-auto"
            >
              {isFixing ? '修复中...' : '🔧 一键修复'}
            </Button>
            
            {result && (
              <p className={`text-xs mt-2 ${result.startsWith('✅') ? 'text-green-300' : 'text-red-300'}`}>
                {result}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
