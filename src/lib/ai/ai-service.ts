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
      // 初始化通义千问
      if (process.env.QIANWEN_API_KEY) {
        this.providers.set('qianwen', new QianwenProvider());
      }
    } catch (error) {
      console.error('Failed to initialize AI providers:', error);
    }
  }

  async chat(params: ChatParams, providerName?: string): Promise<string> {
    const provider = this.getProvider(providerName);
    return await provider.chat(params);
  }

  async generateLearningPlan(input: LearningPlanInput, providerName?: string) {
    const provider = this.getProvider(providerName);
    return await provider.generateLearningPlan(input);
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
}

// 导出单例实例
export const aiService = new AIServiceManager();
export { AIServiceManager };
