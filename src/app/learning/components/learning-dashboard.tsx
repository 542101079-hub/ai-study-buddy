"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface LearningTask {
  id: string;
  title: string;
  description: string;
  type: 'reading' | 'practice' | 'quiz' | 'project' | 'review';
  difficulty: number;
  estimated_minutes: number;
  actual_minutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  due_date: string;
  learning_goals?: {
    id: string;
    title: string;
    type: string;
  };
}

interface LearningStats {
  totalStudyTime: number;
  studyDays: number;
  completedTasks: number;
  completionRate: number;
  weeklyProgress: number;
  weeklyGoal: number;
  averageProductivity?: number;
  averageMood?: number;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  total_estimated_minutes: number;
  completed_minutes: number;
}

export function LearningDashboard() {
  const [todayTasks, setTodayTasks] = useState<LearningTask[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 并行加载今日任务和学习统计
      const [tasksResponse, statsResponse] = await Promise.all([
        fetch('/api/learning/tasks/today'),
        fetch('/api/learning/stats?period=7')
      ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTodayTasks(tasksData.tasks || []);
        setTaskStats(tasksData.stats || null);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setLearningStats(statsData.stats || null);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string, actualMinutes?: number) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await fetch('/api/learning/tasks/today', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          actual_minutes: actualMinutes
        }),
      });

      if (response.ok) {
        // 重新加载数据
        await loadDashboardData();
      } else {
        console.error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskTitle = todayTasks.find(task => task.id === taskId)?.title || '当前任务';
    if (!confirm(`确认要删除「${taskTitle}」吗？\n\n删除后该任务将不再出现在今日列表中。`)) {
      return;
    }

    setDeletingTaskId(taskId);
    try {
      const response = await fetch(`/api/learning/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete task:', errorData);
        alert(`删除任务失败: ${errorData.error || '未知错误'}`);
        return;
      }

      await loadDashboardData();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('删除任务失败，请稍后重试');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    const value = Number.isFinite(difficulty) ? difficulty : 0;
    if (value <= 0) return 'text-gray-400';
    if (value <= 2) return 'text-green-400';
    if (value <= 4) return 'text-blue-400';
    if (value <= 6) return 'text-yellow-400';
    if (value <= 8) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'practice': return '✏️';
      case 'quiz': return '❓';
      case 'project': return '🚀';
      case 'review': return '🔄';
      default: return '📝';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">已完成</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">进行中</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">待开始</span>;
      case 'skipped':
        return <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">已跳过</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/10 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl p-3 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">📚 学习仪表板</h2>
          <span className="text-sm font-normal text-violet-200/70 bg-violet-500/20 px-3 py-1 rounded-full">实时数据</span>
        </div>
        <Button
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
          className="border-violet-400/30 text-violet-200 hover:bg-violet-500/20 hover:border-violet-300/50 transition-all duration-200"
        >
          🔄 刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 今日任务 */}
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-blue-400 text-lg">📋</span>
            </div>
            <div>
              <p className="text-white/60 text-sm">今日任务</p>
              <p className="text-white text-xl font-semibold">
                {taskStats?.completed || 0}/{taskStats?.total || 0}
              </p>
            </div>
          </div>
          {taskStats && (
            <div className="mt-3">
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: taskStats.total > 0 ? `${(taskStats.completed / taskStats.total) * 100}%` : '0%'
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* 学习时长 */}
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-green-400 text-lg">⏱️</span>
            </div>
            <div>
              <p className="text-white/60 text-sm">今日学习</p>
              <p className="text-white text-xl font-semibold">
                {Math.round((taskStats?.completed_minutes || 0) / 60 * 10) / 10}h
              </p>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-2">
            预计: {Math.round((taskStats?.total_estimated_minutes || 0) / 60 * 10) / 10}h
          </p>
        </div>

        {/* 本周进度 */}
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 text-lg">📈</span>
            </div>
            <div>
              <p className="text-white/60 text-sm">本周进度</p>
              <p className="text-white text-xl font-semibold">
                {Math.round((learningStats?.weeklyProgress || 0) / 60 * 10) / 10}h
              </p>
            </div>
          </div>
          {learningStats && (
            <div className="mt-3">
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: learningStats.weeklyGoal > 0 
                      ? `${Math.min((learningStats.weeklyProgress / learningStats.weeklyGoal) * 100, 100)}%` 
                      : '0%'
                  }}
                ></div>
              </div>
              <p className="text-white/50 text-xs mt-1">
                目标: {Math.round(learningStats.weeklyGoal / 60 * 10) / 10}h
              </p>
            </div>
          )}
        </div>

        {/* 连续学习 */}
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-orange-400 text-lg">🔥</span>
            </div>
            <div>
              <p className="text-white/60 text-sm">连续学习</p>
              <p className="text-white text-xl font-semibold">
                {learningStats?.studyDays || 0}天
              </p>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-2">
            完成率: {learningStats?.completionRate || 0}%
          </p>
        </div>
      </div>

      {/* 今日任务列表 */}
      <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
        <h3 className="text-lg font-medium text-white mb-4">📅 今日学习任务</h3>
        
        {todayTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-white/60">今天没有安排学习任务</p>
            <p className="text-white/40 text-sm mt-1">可以休息一下，或者创建新的学习目标</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  task.status === 'completed'
                    ? 'border-green-500/30 bg-green-500/5'
                    : task.status === 'in_progress'
                    ? 'border-blue-500/30 bg-blue-500/5'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getTypeIcon(task.type)}</span>
                      <h4 className="text-white font-medium">{task.title}</h4>
                      {getStatusBadge(task.status)}
                      <span className={`text-xs font-medium ${getDifficultyColor(task.difficulty)}`}>
                        难度 {task.difficulty}/10
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-white/70 text-sm mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>⏱️ 预计 {task.estimated_minutes} 分钟</span>
                      {task.learning_goals && (
                        <span>🎯 {task.learning_goals.title}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {task.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}
                          disabled={updatingTaskId === task.id}
                          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          开始
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTaskStatusUpdate(task.id, 'completed', task.estimated_minutes)}
                          disabled={updatingTaskId === task.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          完成
                        </Button>
                      </>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleTaskStatusUpdate(task.id, 'completed', task.estimated_minutes)}
                        disabled={updatingTaskId === task.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {updatingTaskId === task.id ? '更新中...' : '完成'}
                      </Button>
                    )}
                    
                    {task.status === 'completed' && (
                      <div className="flex items-center gap-2 text-green-400">
                        <span className="text-lg">✅</span>
                        <span className="text-xs">
                          {task.actual_minutes ? `用时 ${task.actual_minutes}分钟` : '已完成'}
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deletingTaskId === task.id}
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      {deletingTaskId === task.id ? '删除中...' : '删除'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 学习建议 */}
      {learningStats && (
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
          <h3 className="text-lg font-medium text-white mb-4">💡 学习建议</h3>
          <div className="space-y-3">
            {learningStats.completionRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <span className="text-orange-400 text-lg">⚠️</span>
                <div>
                  <p className="text-orange-400 font-medium text-sm">任务完成率偏低</p>
                  <p className="text-white/70 text-xs">建议调整学习计划或减少每日任务量</p>
                </div>
              </div>
            )}
            
            {learningStats.weeklyProgress < learningStats.weeklyGoal * 0.5 && (
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <span className="text-blue-400 text-lg">📊</span>
                <div>
                  <p className="text-blue-400 font-medium text-sm">本周进度需要加速</p>
                  <p className="text-white/70 text-xs">距离周目标还有一定差距，建议增加学习时间</p>
                </div>
              </div>
            )}
            
            {learningStats.studyDays >= 7 && (
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-green-400 text-lg">🎉</span>
                <div>
                  <p className="text-green-400 font-medium text-sm">学习习惯很棒！</p>
                  <p className="text-white/70 text-xs">连续学习{learningStats.studyDays}天，继续保持！</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
