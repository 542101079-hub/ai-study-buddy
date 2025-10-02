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
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  created_at: string;
  learning_plans?: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
  }>;
}

interface Props {
  tenantId: string;
}

export function GoalManager({ tenantId }: Props) {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'skill' as 'exam' | 'skill' | 'career',
    current_level: 1,
    target_level: 10,
    target_date: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/learning/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/learning/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenant_id: tenantId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newGoal = data.goal;
        setGoals(prev => [newGoal, ...prev]);
        setFormData({
          title: '',
          description: '',
          type: 'skill',
          current_level: 1,
          target_level: 10,
          target_date: ''
        });
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        alert(`创建目标失败: ${errorData.error || '未知错误'}\n\n详细信息: ${errorData.details || '无'}\n错误代码: ${errorData.code || '无'}`);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('创建目标失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exam': return '考试准备';
      case 'skill': return '技能提升';
      case 'career': return '职业发展';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exam': return '📝';
      case 'skill': return '🛠️';
      case 'career': return '💼';
      default: return '🎯';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">进行中</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">已完成</span>;
      case 'paused':
        return <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">已暂停</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">已取消</span>;
      default:
        return null;
    }
  };

  const handleViewDetails = (goal: LearningGoal) => {
    const planInfo = goal.learning_plans && goal.learning_plans.length > 0 
      ? `\n\n📋 学习计划 (${goal.learning_plans.length}个):\n${goal.learning_plans.map(plan => `• ${plan.title} (${plan.status})`).join('\n')}`
      : '\n\n📋 学习计划：暂无';
    
    alert(`查看目标详情：\n\n标题：${goal.title}\n描述：${goal.description || '无'}\n类型：${getTypeLabel(goal.type)}\n当前水平：${goal.current_level}\n目标水平：${goal.target_level}\n目标日期：${goal.target_date ? new Date(goal.target_date).toLocaleDateString() : '无'}\n状态：${goal.status}${planInfo}`);
  };

  const handleViewPlan = async (goal: LearningGoal) => {
    if (!goal.learning_plans || goal.learning_plans.length === 0) {
      alert('该目标暂无学习计划');
      return;
    }

    try {
      // 获取最新的学习计划详情
      const planId = goal.learning_plans[0].id;
      const response = await fetch(`/api/learning/plans/${planId}`);
      
      if (response.ok) {
        const data = await response.json();
        const plan = data.plan;
        
        // 格式化显示计划内容
        let planContent = `📋 ${plan.title}\n\n`;
        planContent += `📖 计划概述：\n${plan.description || '暂无描述'}\n\n`;
        
        // 从plan_data中获取持续时间和难度
        let duration = '未设定';
        let difficulty = '未设定';
        if (plan.plan_data) {
          try {
            const planData = typeof plan.plan_data === 'string' 
              ? JSON.parse(plan.plan_data) 
              : plan.plan_data;
            
            console.log('Plan data for display:', planData);
            
            duration = planData.total_duration_weeks ? `${planData.total_duration_weeks}周` : '未设定';
            difficulty = planData.difficulty_level ? `${planData.difficulty_level}/10` : '未设定';
            
            console.log('Extracted duration:', duration, 'difficulty:', difficulty);
          } catch (e) {
            console.log('Failed to parse plan_data:', e);
          }
        }
        
        planContent += `⏱️ 持续时间：${duration}\n`;
        planContent += `📊 难度等级：${difficulty}\n`;
        planContent += `📅 创建时间：${new Date(plan.created_at).toLocaleDateString()}\n`;
        planContent += `🎯 状态：${plan.status}\n\n`;
        
        if (plan.plan_content) {
          try {
            const content = typeof plan.plan_content === 'string' 
              ? JSON.parse(plan.plan_content) 
              : plan.plan_content;
            
            if (content.plan_overview) {
              planContent += `📝 学习概览：\n${content.plan_overview}\n\n`;
            }
            
            if (content.learning_phases && content.learning_phases.length > 0) {
              planContent += `📚 学习阶段：\n`;
              content.learning_phases.forEach((phase: any, index: number) => {
                planContent += `${index + 1}. ${phase.phase_name} (${phase.duration_weeks}周)\n`;
                if (phase.focus_areas) {
                  planContent += `   重点：${phase.focus_areas.join(', ')}\n`;
                }
              });
            }
          } catch (e) {
            planContent += `📄 计划内容：${plan.plan_content}\n`;
          }
        }
        
        alert(planContent);
      } else {
        alert('获取计划详情失败，请重试');
      }
    } catch (error) {
      console.error('Failed to fetch plan details:', error);
      alert('获取计划详情失败，请重试');
    }
  };

  const handleGeneratePlan = async (goal: LearningGoal) => {
    console.log('Generating plan for goal:', goal);
    try {
      const response = await fetch('/api/learning/plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId: goal.id,
          preferences: {
            daily_time: 60,
            weekly_frequency: 5,
            difficulty: 'moderate',
            preferred_time: 'evening',
            learning_style: 'mixed'
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`学习计划生成成功！\n\n${data.plan?.title || '新学习计划'}\n\n请刷新页面查看详细计划。`);
        // 重新加载目标列表
        loadGoals();
      } else {
        const errorData = await response.json();
        alert(`生成计划失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Failed to generate plan:', error);
      alert('生成计划失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">🎯 学习目标</h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          + 新建目标
        </Button>
      </div>

      {/* 创建目标表单 */}
      {showCreateForm && (
        <div className="mb-4 p-4 border border-white/20 rounded-lg bg-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">目标标题 *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：掌握 React 开发"
                  className="bg-slate-600/70 border-violet-400/40 text-slate-100 placeholder:text-violet-300/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 shadow-sm"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white/90">目标类型</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full rounded-md border border-violet-400/40 bg-slate-600/70 px-3 py-2 text-slate-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 shadow-sm"
                  title="选择目标类型"
                >
                  <option value="skill">技能提升</option>
                  <option value="exam">考试准备</option>
                  <option value="career">职业发展</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-white/90">目标描述</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="详细描述你的学习目标..."
                className="w-full rounded-md border border-violet-400/40 bg-slate-600/70 px-3 py-2 text-slate-100 placeholder:text-violet-300/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 resize-none shadow-sm"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white/90">当前水平 (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.current_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_level: parseInt(e.target.value) || 1 }))}
                  className="bg-slate-600/70 border-violet-400/40 text-slate-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 shadow-sm"
                />
              </div>
              
              <div>
                <Label className="text-white/90">目标水平 (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.target_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_level: parseInt(e.target.value) || 10 }))}
                  className="bg-slate-600/70 border-violet-400/40 text-slate-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 shadow-sm"
                />
              </div>
              
              <div>
                <Label className="text-white/90">目标日期</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  className="bg-slate-600/70 border-violet-400/40 text-slate-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isCreating || !formData.title.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreating ? '创建中...' : '创建目标'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="border-white/20 text-white/90 hover:bg-white/10"
              >
                取消
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 目标列表 */}
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-white/60">还没有学习目标</p>
          <p className="text-white/40 text-sm mt-1">创建你的第一个学习目标开始学习之旅</p>
          
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(goal.type)}</span>
                  <div>
                    <h4 className="text-white font-medium">{goal.title}</h4>
                    <p className="text-white/50 text-sm">{getTypeLabel(goal.type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(goal.status)}
                </div>
              </div>

              {goal.description && (
                <p className="text-white/70 text-sm mb-3">{goal.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span>📊 水平: {goal.current_level} → {goal.target_level}</span>
                  {goal.target_date && (
                    <span>📅 {new Date(goal.target_date).toLocaleDateString()}</span>
                  )}
                  {goal.learning_plans && goal.learning_plans.length > 0 && (
                    <span>📋 {goal.learning_plans.length} 个计划</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/90 hover:bg-white/10"
                    onClick={() => handleViewDetails(goal)}
                  >
                    查看详情
                  </Button>
                  {goal.learning_plans && goal.learning_plans.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-400/30 text-green-400 hover:bg-green-400/10"
                      onClick={() => handleViewPlan(goal)}
                    >
                      查看计划
                    </Button>
                  )}
                  {goal.status === 'active' && (
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => handleGeneratePlan(goal)}
                    >
                      {goal.learning_plans && goal.learning_plans.length > 0 ? '重新生成' : '生成计划'}
                    </Button>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>学习进度</span>
                  <span>{Math.round(((goal.current_level - 1) / (goal.target_level - 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((goal.current_level - 1) / (goal.target_level - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
