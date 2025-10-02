"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  type: 'exam' | 'skill' | 'career';
  current_level: number;
  target_level: number;
  target_date?: string;
}

interface GeneratedPlan {
  plan_overview: string;
  learning_phases: Array<{
    phase_name: string;
    duration_weeks: number;
    focus_areas: string[];
    weekly_tasks: Array<{
      week: number;
      tasks: Array<{
        title: string;
        type: string;
        estimated_minutes: number;
        difficulty: number;
        description: string;
        resources: string[];
      }>;
    }>;
  }>;
  success_metrics: string[];
  adjustment_triggers: string[];
}

interface Props {
  goals: LearningGoal[];
  className?: string;
}

export function PlanGeneratorComponent({ goals, className = "" }: Props) {
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [preferences, setPreferences] = useState({
    daily_time_minutes: 60,
    weekly_goal: 5,
    difficulty_level: 3,
    preferred_time: 'evening',
    learning_style: 'mixed'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedGoalId) {
      setError('请先选择一个学习目标');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch('/api/learning/plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId: selectedGoalId,
          preferences
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成计划失败');
      }

      setGeneratedPlan(data.planData);
    } catch (error) {
      console.error('Plan generation error:', error);
      setError(error instanceof Error ? error.message : '生成计划失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedGoal = goals.find(goal => goal.id === selectedGoalId);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exam': return '考试准备';
      case 'skill': return '技能提升';
      case 'career': return '职业发展';
      default: return type;
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return '很简单';
      case 2: return '简单';
      case 3: return '适中';
      case 4: return '有挑战';
      case 5: return '很有挑战';
      default: return '适中';
    }
  };

  const getTimeLabel = (time: string) => {
    switch (time) {
      case 'morning': return '早上';
      case 'afternoon': return '下午';
      case 'evening': return '晚上';
      case 'flexible': return '灵活安排';
      default: return time;
    }
  };

  const getStyleLabel = (style: string) => {
    switch (style) {
      case 'visual': return '视觉型（图表、图像）';
      case 'auditory': return '听觉型（音频、讲解）';
      case 'kinesthetic': return '动手型（实践、操作）';
      case 'mixed': return '混合型';
      default: return style;
    }
  };

  return (
    <div className={`bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur ${className}`}>
      <h3 className="text-lg font-medium text-white mb-4">🎯 AI智能学习计划生成</h3>
      
      <div className="space-y-4">
        {/* 选择学习目标 */}
        <div>
          <Label className="text-white/90">选择学习目标 *</Label>
          <select
            value={selectedGoalId}
            onChange={(e) => {
              setSelectedGoalId(e.target.value);
              setError(null);
              setGeneratedPlan(null);
            }}
            className="w-full mt-1 rounded-md border border-white/20 bg-slate-800/60 px-3 py-2 text-white"
            title="选择学习目标"
          >
            <option value="">请选择一个学习目标</option>
            {goals.filter(goal => goal.status === 'active').map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title} ({getTypeLabel(goal.type)})
              </option>
            ))}
          </select>
          {selectedGoal && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/70 text-sm">{selectedGoal.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                <span>📊 当前水平: {selectedGoal.current_level}/10</span>
                <span>🎯 目标水平: {selectedGoal.target_level}/10</span>
                {selectedGoal.target_date && (
                  <span>📅 目标日期: {new Date(selectedGoal.target_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 学习偏好设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white/90">每日学习时间（分钟）</Label>
            <Input
              type="number"
              value={preferences.daily_time_minutes}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                daily_time_minutes: parseInt(e.target.value) || 60
              }))}
              className="bg-slate-800/60 border-white/20 text-white"
              min="15"
              max="480"
            />
            <p className="text-xs text-white/50 mt-1">建议: 30-120分钟</p>
          </div>
          
          <div>
            <Label className="text-white/90">每周学习天数</Label>
            <Input
              type="number"
              value={preferences.weekly_goal}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                weekly_goal: parseInt(e.target.value) || 5
              }))}
              className="bg-slate-800/60 border-white/20 text-white"
              min="1"
              max="7"
            />
            <p className="text-xs text-white/50 mt-1">建议: 3-6天</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white/90">难度偏好</Label>
            <select
              value={preferences.difficulty_level}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                difficulty_level: parseInt(e.target.value)
              }))}
              className="w-full rounded-md border border-white/20 bg-slate-800/60 px-3 py-2 text-white"
              title="选择难度偏好"
            >
              <option value={1}>很简单</option>
              <option value={2}>简单</option>
              <option value={3}>适中</option>
              <option value={4}>有挑战</option>
              <option value={5}>很有挑战</option>
            </select>
            <p className="text-xs text-white/50 mt-1">当前: {getDifficultyLabel(preferences.difficulty_level)}</p>
          </div>
          
          <div>
            <Label className="text-white/90">偏好学习时间</Label>
            <select
              value={preferences.preferred_time}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                preferred_time: e.target.value
              }))}
              className="w-full rounded-md border border-white/20 bg-slate-800/60 px-3 py-2 text-white"
              title="选择偏好学习时间"
            >
              <option value="morning">早上</option>
              <option value="afternoon">下午</option>
              <option value="evening">晚上</option>
              <option value="flexible">灵活安排</option>
            </select>
            <p className="text-xs text-white/50 mt-1">当前: {getTimeLabel(preferences.preferred_time)}</p>
          </div>
        </div>

        <div>
          <Label className="text-white/90">学习风格</Label>
          <select
            value={preferences.learning_style}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              learning_style: e.target.value
            }))}
            className="w-full rounded-md border border-white/20 bg-slate-800/60 px-3 py-2 text-white"
            title="选择学习风格"
          >
            <option value="visual">视觉型（图表、图像）</option>
            <option value="auditory">听觉型（音频、讲解）</option>
            <option value="kinesthetic">动手型（实践、操作）</option>
            <option value="mixed">混合型</option>
          </select>
          <p className="text-xs text-white/50 mt-1">当前: {getStyleLabel(preferences.learning_style)}</p>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedGoalId || isGenerating}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              正在生成个性化学习计划...
            </div>
          ) : (
            '🚀 生成AI学习计划'
          )}
        </Button>

        {/* 生成的计划预览 */}
        {generatedPlan && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h4 className="text-green-400 font-medium mb-3">✅ 学习计划生成成功！</h4>
            
            <div className="space-y-3">
              <div>
                <h5 className="text-white font-medium text-sm mb-1">📋 计划概述</h5>
                <p className="text-white/70 text-sm">{generatedPlan.plan_overview}</p>
              </div>

              <div>
                <h5 className="text-white font-medium text-sm mb-2">📚 学习阶段 ({generatedPlan.learning_phases.length}个)</h5>
                <div className="space-y-2">
                  {generatedPlan.learning_phases.map((phase, index) => (
                    <div key={index} className="p-2 bg-white/5 rounded border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/90 text-sm font-medium">{phase.phase_name}</span>
                        <span className="text-white/60 text-xs">{phase.duration_weeks}周</span>
                      </div>
                      <p className="text-white/60 text-xs">
                        重点: {phase.focus_areas.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-white font-medium text-sm mb-1">🎯 成功指标</h5>
                <ul className="text-white/70 text-sm space-y-1">
                  {generatedPlan.success_metrics.map((metric, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      {metric}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-white/50 text-xs">
                  💡 计划已保存到你的学习空间，可以在学习仪表板中查看详细任务安排
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
