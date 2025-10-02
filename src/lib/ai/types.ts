// AI 服务的基础类型定义
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIProvider {
  name: string;
  chat(params: ChatParams): Promise<string>;
  generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput>;
  answerQuestion(question: string, context?: string): Promise<QuestionAnswer>;
  analyzeLearningData(data: LearningAnalysisInput): Promise<LearningInsights>;
}

// 学习计划相关类型
export interface LearningPlanInput {
  goal: {
    id: string;
    title: string;
    description: string;
    type: 'exam' | 'skill' | 'career';
    current_level: number;
    target_level: number;
    target_date?: string;
  };
  assessment?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
  };
  preferences: {
    daily_time_minutes: number;
    weekly_goal: number;
    difficulty_level: number;
    preferred_time: string;
    learning_style: string;
  };
  historicalData?: any[];
}

export interface LearningPlanOutput {
  plan_overview: string;
  learning_phases: LearningPhase[];
  success_metrics: string[];
  adjustment_triggers: string[];
}

export interface LearningPhase {
  phase_name: string;
  duration_weeks: number;
  focus_areas: string[];
  weekly_tasks: WeeklyTask[];
}

export interface WeeklyTask {
  week: number;
  tasks: LearningTask[];
}

export interface LearningTask {
  title: string;
  type: 'reading' | 'practice' | 'quiz' | 'project';
  estimated_minutes: number;
  difficulty: number;
  description: string;
  resources: string[];
}

// 问答相关类型
export interface QuestionAnswer {
  answer: string;
  category: string;
  confidence: number;
  followUpQuestions: string[];
  resources?: string[];
}

// 学习分析相关类型
export interface LearningAnalysisInput {
  records: any[];
  tasks: any[];
  goals: any[];
}

export interface LearningInsights {
  overall_score: number;
  insights: string;
  recommendations: string[];
  next_actions: string[];
}
