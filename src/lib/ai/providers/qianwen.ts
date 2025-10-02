// 通义千问 API 提供商
import { AIProvider, ChatParams, LearningPlanInput, LearningPlanOutput, QuestionAnswer, LearningAnalysisInput, LearningInsights } from '../types';

export class QianwenProvider implements AIProvider {
  name = 'qianwen';
  private apiKey: string;
  private baseURL = 'https://dashscope.aliyuncs.com/api/v1';

  constructor() {
    this.apiKey = process.env.QIANWEN_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('QIANWEN_API_KEY is required');
    }
  }

  async chat(params: ChatParams): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: params.messages
          },
          parameters: {
            temperature: params.temperature || 0.7,
            max_tokens: params.max_tokens || 1000,
            result_format: 'message'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Qianwen API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.output?.choices?.[0]?.message?.content) {
        return data.output.choices[0].message.content;
      } else if (data.output?.text) {
        return data.output.text;
      } else {
        throw new Error('Invalid response format from Qianwen API');
      }
    } catch (error) {
      console.error('Qianwen API call failed:', error);
      throw error;
    }
  }

  async generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput> {
    const prompt = this.buildLearningPlanPrompt(input);
    
    const response = await this.chat({
      messages: [
        {
          role: 'system',
          content: `你是一位专业的学习规划师，擅长为学生制定个性化学习计划。
          请根据用户的学习目标、当前水平、学习偏好和历史数据，生成一个详细的学习计划。
          
          返回格式必须是有效的JSON，不要包含任何其他文本：
          {
            "plan_overview": "计划概述",
            "learning_phases": [
              {
                "phase_name": "阶段名称",
                "duration_weeks": 4,
                "focus_areas": ["重点1", "重点2"],
                "weekly_tasks": [
                  {
                    "week": 1,
                    "tasks": [
                      {
                        "title": "任务标题",
                        "type": "reading",
                        "estimated_minutes": 60,
                        "difficulty": 3,
                        "description": "任务描述",
                        "resources": ["资源1", "资源2"]
                      }
                    ]
                  }
                ]
              }
            ],
            "success_metrics": ["成功指标1", "成功指标2"],
            "adjustment_triggers": ["调整触发条件1", "调整触发条件2"]
          }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return this.parseLearningPlanResponse(response);
  }

  async answerQuestion(question: string, context?: string): Promise<QuestionAnswer> {
    const prompt = `
作为AI学习搭子，请回答学生的问题。

${context ? `**问题上下文**：\n${context}\n` : ''}

**当前问题**：
${question}

请提供：
1. 清晰准确的答案
2. 相关的学习建议
3. 推荐的学习资源
4. 可能的后续问题

回答要求：
- 语言亲切友好，符合学习搭子的人设
- 提供实用的学习建议
- 鼓励学生继续学习
`;

    const response = await this.chat({
      messages: [
        { 
          role: 'system', 
          content: '你是一位耐心、专业的AI学习搭子，擅长解答各种学习问题。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    return {
      answer: response,
      category: await this.categorizeQuestion(question),
      confidence: 0.85, // 可以后续优化为动态计算
      followUpQuestions: await this.generateFollowUpQuestions(question, response)
    };
  }

  async analyzeLearningData(data: LearningAnalysisInput): Promise<LearningInsights> {
    const analysisPrompt = `
分析以下学习数据，提供个性化的学习建议：

**学习记录统计**：
- 记录数量：${data.records.length}
- 任务数量：${data.tasks.length}
- 目标数量：${data.goals.length}

**数据概览**：
${JSON.stringify(data, null, 2)}

请提供：
1. 学习表现总体评价（1-10分）
2. 发现的问题和改进建议
3. 学习计划调整建议
4. 激励和鼓励的话语

请以JSON格式返回：
{
  "overall_score": 8,
  "insights": "详细分析",
  "recommendations": ["建议1", "建议2"],
  "next_actions": ["行动1", "行动2"]
}
`;

    const response = await this.chat({
      messages: [
        { 
          role: 'system', 
          content: '你是专业的学习数据分析师，善于从学习数据中发现规律和问题。' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.6,
      max_tokens: 1500
    });

    return this.parseAnalysisResponse(response);
  }

  private buildLearningPlanPrompt(input: LearningPlanInput): string {
    return `
请为以下学习者制定个性化学习计划：

**学习目标**：
- 类型：${input.goal.type} (${input.goal.type === 'exam' ? '考试准备' : input.goal.type === 'skill' ? '技能提升' : '就业准备'})
- 标题：${input.goal.title}
- 描述：${input.goal.description}
- 当前水平：${input.goal.current_level}/10
- 目标水平：${input.goal.target_level}/10
- 截止日期：${input.goal.target_date || '3个月后'}

**能力评估**：
- 总体得分：${input.assessment?.score || 'N/A'}/100
- 优势领域：${input.assessment?.strengths?.join(', ') || '待评估'}
- 薄弱环节：${input.assessment?.weaknesses?.join(', ') || '待评估'}

**学习偏好**：
- 每日学习时间：${input.preferences.daily_time_minutes}分钟
- 每周学习天数：${input.preferences.weekly_goal}天
- 难度偏好：${input.preferences.difficulty_level}/5
- 学习时间：${input.preferences.preferred_time}
- 学习风格：${input.preferences.learning_style}

**历史表现**：
${input.historicalData ? `历史数据：${JSON.stringify(input.historicalData)}` : '无历史数据'}

请生成一个循序渐进、科学合理的学习计划。
    `;
  }

  private parseLearningPlanResponse(response: string): LearningPlanOutput {
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      console.error('Failed to parse AI plan response:', error);
      // 返回备用计划
      return this.generateFallbackPlan();
    }
  }

  private parseAnalysisResponse(response: string): LearningInsights {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in analysis response');
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return {
        overall_score: 7,
        insights: "数据分析暂时不可用，请继续保持学习习惯。",
        recommendations: ["保持规律的学习节奏", "适当调整学习计划"],
        next_actions: ["继续完成今日任务", "回顾昨日学习内容"]
      };
    }
  }

  private async categorizeQuestion(question: string): Promise<string> {
    // 简单的关键词分类，可以后续优化为AI分类
    const categories = {
      '概念理解': ['什么是', '如何理解', '概念', '定义', '原理'],
      '解题方法': ['怎么做', '如何解', '步骤', '方法', '技巧'],
      '学习策略': ['如何学', '怎么学', '学习方法', '复习', '记忆'],
      '考试技巧': ['考试', '题型', '答题', '备考', '复习'],
      '资源推荐': ['推荐', '资料', '书籍', '课程', '视频']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => question.includes(keyword))) {
        return category;
      }
    }
    return '其他';
  }

  private async generateFollowUpQuestions(question: string, answer: string): Promise<string[]> {
    // 简化版本，可以后续用AI生成
    return [
      "还有什么不清楚的地方吗？",
      "需要更详细的解释吗？",
      "想了解相关的其他知识点吗？"
    ];
  }

  private generateFallbackPlan(): LearningPlanOutput {
    return {
      plan_overview: "基础学习计划 - 由于AI服务暂时不可用，为您生成了一个通用的学习计划。",
      learning_phases: [
        {
          phase_name: "基础阶段",
          duration_weeks: 4,
          focus_areas: ["基础知识掌握", "学习习惯养成"],
          weekly_tasks: [
            {
              week: 1,
              tasks: [
                {
                  title: "基础知识学习",
                  type: "reading",
                  estimated_minutes: 60,
                  difficulty: 3,
                  description: "学习基础概念和原理",
                  resources: ["教材第1-3章", "在线视频课程"]
                }
              ]
            }
          ]
        }
      ],
      success_metrics: ["完成每日学习任务", "掌握基础概念"],
      adjustment_triggers: ["学习进度落后", "理解困难"]
    };
  }
}
