"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function DatabaseManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const createTables = async () => {
    setIsCreating(true);
    setResult('');
    setError('');

    try {
      const response = await fetch('/api/admin/database/create-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult('✅ 数据库表创建成功！\n\n' + data.message);
      } else {
        setError('❌ 创建失败: ' + data.error);
      }
    } catch (err) {
      setError('❌ 请求失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsCreating(false);
    }
  };

  const checkTables = async () => {
    setIsCreating(true);
    setResult('');
    setError('');

    try {
      const response = await fetch('/api/admin/database/check-tables', {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setResult('📊 数据库表状态:\n\n' + data.tables.map((table: any) => 
          `${table.exists ? '✅' : '❌'} ${table.name}`
        ).join('\n'));
      } else {
        setError('❌ 检查失败: ' + data.error);
      }
    } catch (err) {
      setError('❌ 请求失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作按钮 */}
      <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold text-white mb-4">数据库操作</h2>
        
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={checkTables}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreating ? '检查中...' : '检查表状态'}
          </Button>
          
          <Button
            onClick={createTables}
            disabled={isCreating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isCreating ? '创建中...' : '创建数据库表'}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400">⚠️</span>
            <div className="text-yellow-300 text-sm">
              <p className="font-medium">注意事项：</p>
              <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                <li>创建表操作是安全的，使用 CREATE TABLE IF NOT EXISTS</li>
                <li>不会删除或修改现有数据</li>
                <li>如果表已存在，操作会被跳过</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 结果显示 */}
      {(result || error) && (
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4">执行结果</h3>
          
          {result && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <pre className="text-green-300 text-sm whitespace-pre-wrap font-mono">
                {result}
              </pre>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <pre className="text-red-300 text-sm whitespace-pre-wrap font-mono">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SQL 预览 */}
      <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">将要执行的表</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            'learning_goals',
            'user_assessments', 
            'learning_plans',
            'learning_tasks',
            'learning_records',
            'learning_resources',
            'plan_adjustments',
            'qa_records',
            'user_achievements',
            'study_buddy_config'
          ].map((table) => (
            <div key={table} className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-violet-400">📋</span>
                <span className="text-white text-sm font-medium">{table}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
