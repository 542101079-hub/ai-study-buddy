// AI 服务管理器
import { QianwenProvider } from './providers/qianwen';
import { AIProvider, ChatParams, LearningPlanInput, QuestionAnswer, LearningAnalysisInput } from './types';

class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map();
  private fallbackOrder = ['qianwen'];
  private defaultProvider = 'qianwen';

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      console.log('Initializing AI providers...');
      console.log('QIANWEN_API_KEY exists:', !!process.env.QIANWEN_API_KEY);
      
      // 初始化通义千问
      if (process.env.QIANWEN_API_KEY) {
        console.log('Creating QianwenProvider...');
        this.providers.set('qianwen', new QianwenProvider());
        console.log('QianwenProvider created successfully');
      } else {
        console.log('QIANWEN_API_KEY not found, skipping Qianwen provider');
      }
      
      console.log('Available providers:', Array.from(this.providers.keys()));
    } catch (error) {
      console.error('Failed to initialize AI providers:', error);
    }
  }

  async chat(params: ChatParams, providerName?: string): Promise<string> {
    const provider = this.getProvider(providerName);
    return await provider.chat(params);
  }

  async generateLearningPlan(input: LearningPlanInput, providerName?: string) {
    try {
      const provider = this.getProvider(providerName);
      return await provider.generateLearningPlan(input);
    } catch (error) {
      console.warn('AI service unavailable, using fallback plan generator:', error);
      return this.generateFallbackLearningPlan(input);
    }
  }

  async answerQuestion(question: string, context?: string, providerName?: string): Promise<QuestionAnswer> {
    const provider = this.getProvider(providerName);
    return await provider.answerQuestion(question, context);
  }

  async analyzeLearningData(data: LearningAnalysisInput, providerName?: string) {
    const provider = this.getProvider(providerName);
    return await provider.analyzeLearningData(data);
  }

  private getProvider(providerName?: string): AIProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);
    
    if (!provider) {
      throw new Error(`AI provider '${name}' not available. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  private generateFallbackLearningPlan(input: LearningPlanInput) {
    const { goal, preferences } = input;
    const duration = preferences?.total_duration_weeks || preferences?.weekly_goal || 8;
    const difficulty = preferences?.difficulty_level || 5;
    
    console.log('Generating fallback plan with:', { duration, difficulty, preferences });
    
    // 根据目标类型生成不同的学习计划
    const planTemplates = {
      exam: {
        overview: `针对${goal.title}的系统性备考计划，从基础知识梳理到模拟练习，全面提升应试能力。`,
        phases: [
          { name: '基础知识复习', weeks: Math.ceil(duration * 0.4), focus: ['理论学习', '概念理解', '基础练习'] },
          { name: '强化训练', weeks: Math.ceil(duration * 0.4), focus: ['专项练习', '难点突破', '错题分析'] },
          { name: '冲刺模拟', weeks: Math.ceil(duration * 0.2), focus: ['模拟考试', '时间管理', '心理调适'] }
        ]
      },
      skill: {
        overview: `${goal.title}技能提升计划，通过理论学习和实践练习，逐步掌握核心技能。`,
        phases: [
          { name: '理论学习', weeks: Math.ceil(duration * 0.3), focus: ['基础概念', '核心原理', '最佳实践'] },
          { name: '实践练习', weeks: Math.ceil(duration * 0.5), focus: ['动手实践', '项目练习', '技能应用'] },
          { name: '进阶提升', weeks: Math.ceil(duration * 0.2), focus: ['高级技巧', '优化改进', '经验总结'] }
        ]
      },
      career: {
        overview: `${goal.title}职业发展规划，结合行业趋势和个人特长，制定系统的能力提升路径。`,
        phases: [
          { name: '职业认知', weeks: Math.ceil(duration * 0.2), focus: ['行业了解', '岗位分析', '技能盘点'] },
          { name: '技能建设', weeks: Math.ceil(duration * 0.6), focus: ['核心技能', '软技能', '项目经验'] },
          { name: '求职准备', weeks: Math.ceil(duration * 0.2), focus: ['简历优化', '面试技巧', '作品展示'] }
        ]
      }
    };

    const template = planTemplates[goal.type] || planTemplates.skill;
    
    return {
      plan_overview: template.overview,
      total_duration_weeks: duration,
      difficulty_level: difficulty,
      learning_phases: template.phases.map((phase, index) => ({
        phase_name: phase.name,
        duration_weeks: phase.weeks,
        focus_areas: phase.focus,
        weekly_tasks: Array.from({ length: phase.weeks }, (_, week) => ({
          week: week + 1,
          tasks: [
            {
              title: `${phase.name} - 第${week + 1}周任务`,
              type: 'study',
              estimated_minutes: preferences?.daily_time_minutes || 60,
              difficulty: difficulty,
              description: `完成${phase.focus[week % phase.focus.length]}相关的学习任务`,
              resources: ['在线教程', '相关书籍', '实践练习']
            }
          ]
        }))
      })),
      success_metrics: [
        '按时完成每周学习任务',
        '掌握核心知识点',
        '通过阶段性测试',
        '完成实践项目'
      ],
      adjustment_triggers: [
        '学习进度明显滞后',
        '理解困难需要额外辅导',
        '目标发生变化',
        '时间安排需要调整'
      ]
    };
  }
}

// 导出单例实例
export const aiService = new AIServiceManager();
export { AIServiceManager };
