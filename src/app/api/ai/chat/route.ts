// AI 聊天 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('🤖 AI Chat API called!');
  
  try {
    const session = await getServerSession();
    if (!session?.user) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', session.user.email);

    const body = await request.json();
    const { messages, question } = body;

    // 如果是单个问题，转换为messages格式
    let chatMessages = messages;
    if (question && !messages) {
      chatMessages = [
        { role: 'user', content: question }
      ];
    }

    if (!chatMessages || !Array.isArray(chatMessages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // 获取用户的租户信息
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      console.log('❌ User profile not found for user:', session.user.id);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ Profile found:', profile);

    // 检查是否配置了AI API密钥
    const hasApiKey = !!process.env.QIANWEN_API_KEY;
    console.log('API Key configured:', hasApiKey);

    if (!hasApiKey) {
      // 返回友好的提示，说明需要配置API密钥
      const helpfulResponse = {
        answer: `你好！我是你的AI学习搭子 😊\n\n目前我的AI服务还需要配置API密钥才能正常工作。\n\n在配置完成之前，我可以给你一些学习建议：\n\n📚 **学习方法建议**：\n• 制定明确的学习目标和时间表\n• 使用番茄工作法提高专注度\n• 定期复习和总结学习内容\n• 保持良好的学习习惯\n\n🎯 **如何提高学习效率**：\n• 找到适合自己的学习环境\n• 合理安排休息时间\n• 多种学习方式结合使用\n• 及时记录学习心得\n\n有什么具体的学习问题，我很乐意帮助你！`,
        category: "学习建议",
        confidence: 0.9,
        followUpQuestions: [
          "如何制定有效的学习计划？",
          "怎样克服学习拖延症？",
          "推荐一些学习方法和技巧"
        ],
        needsApiKey: true
      };

      // 保存对话记录（即使没有真实的AI响应）
      try {
        const userMessage = chatMessages[chatMessages.length - 1];
        await supabaseAdmin
          .from('qa_records')
          .insert({
            user_id: session.user.id,
            tenant_id: profile.tenant_id,
            question: userMessage.content,
            answer: helpfulResponse.answer,
            category: helpfulResponse.category,
            confidence: helpfulResponse.confidence,
            context: 'API key not configured'
          });
      } catch (saveError) {
        console.error('Failed to save QA record:', saveError);
        // 不影响主要功能，继续执行
      }

      return NextResponse.json({ 
        response: helpfulResponse.answer,
        answer: helpfulResponse,
        isConfigurationNeeded: true 
      });
    }

    // 如果有API密钥，尝试调用真实的AI服务
    try {
      const { aiService } = await import('@/lib/ai/ai-service');
      const lastMessage = chatMessages[chatMessages.length - 1];
      const userQuestion = lastMessage.content;

      // 尝试调用真实的AI服务
      let aiResponse;
      try {
        aiResponse = await aiService.answerQuestion(userQuestion);
      } catch (aiError) {
        console.log('AI service not available, using smart response');
        aiResponse = generateSmartResponse(userQuestion);
      }

      const smartResponse = aiResponse;
      
      // 保存对话记录
      try {
        await supabaseAdmin
          .from('qa_records')
          .insert({
            user_id: session.user.id,
            tenant_id: profile.tenant_id,
            question: userQuestion,
            answer: smartResponse.answer,
            category: smartResponse.category,
            confidence: smartResponse.confidence
          });
      } catch (saveError) {
        console.error('Failed to save QA record:', saveError);
      }

      return NextResponse.json({ 
        response: smartResponse.answer,
        answer: smartResponse 
      });
      
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // 返回友好的错误信息和备用回答
      const fallbackResponse = {
        answer: "抱歉，我现在有点忙，暂时无法给出最佳回答。不过我可以给你一些通用的学习建议：\n\n• 保持规律的学习节奏\n• 适当调整学习计划\n• 多与同学和老师交流\n• 记录学习过程中的问题和心得\n\n请稍后再试，我会尽快恢复正常服务！😊",
        category: "系统消息",
        confidence: 0.5,
        followUpQuestions: [
          "需要学习资源推荐吗？",
          "有其他学习问题可以问我"
        ]
      };

      return NextResponse.json({ 
        response: fallbackResponse.answer,
        answer: fallbackResponse,
        isAIUnavailable: true 
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 生成智能回答的函数
function generateSmartResponse(question: string) {
  const lowerQuestion = question.toLowerCase();
  
  // 学习计划相关
  if (lowerQuestion.includes('学习计划') || lowerQuestion.includes('计划') || lowerQuestion.includes('安排')) {
    return {
      answer: `关于学习计划，我建议你这样做：\n\n📋 **制定学习计划的步骤**：\n1. 明确学习目标和截止时间\n2. 分析现有知识水平\n3. 将大目标分解为小任务\n4. 合理分配时间和精力\n5. 定期检查和调整计划\n\n⏰ **时间管理技巧**：\n• 使用番茄工作法（25分钟专注+5分钟休息）\n• 优先处理重要且紧急的任务\n• 为突发情况预留缓冲时间\n\n你想制定什么方面的学习计划呢？我可以给你更具体的建议！`,
      category: "学习规划",
      confidence: 0.9,
      followUpQuestions: ["如何坚持执行学习计划？", "怎样调整不合理的学习计划？"]
    };
  }
  
  // 学习方法相关
  if (lowerQuestion.includes('学习方法') || lowerQuestion.includes('方法') || lowerQuestion.includes('技巧')) {
    return {
      answer: `这里有一些高效的学习方法：\n\n🧠 **记忆技巧**：\n• 艾宾浩斯遗忘曲线复习法\n• 思维导图整理知识点\n• 联想记忆和口诀记忆\n• 费曼学习法（教给别人）\n\n📚 **阅读方法**：\n• SQ3R法（Survey-Question-Read-Recite-Review）\n• 主动阅读，边读边思考\n• 做读书笔记和知识卡片\n\n💡 **理解技巧**：\n• 从整体到细节的学习顺序\n• 多角度思考问题\n• 实践和应用所学知识\n\n你在哪个学科或领域需要改进学习方法？`,
      category: "学习方法",
      confidence: 0.9,
      followUpQuestions: ["如何提高记忆力？", "怎样做好学习笔记？"]
    };
  }
  
  // 拖延症相关
  if (lowerQuestion.includes('拖延') || lowerQuestion.includes('懒') || lowerQuestion.includes('不想学')) {
    return {
      answer: `克服学习拖延症的方法：\n\n🎯 **立即开始的技巧**：\n• 2分钟法则：如果任务不超过2分钟就立即做\n• 设置小目标：从最简单的任务开始\n• 消除干扰：关闭手机通知，整理学习环境\n\n⚡ **保持动力**：\n• 奖励机制：完成任务后给自己小奖励\n• 找学习伙伴：互相监督和鼓励\n• 记录进步：看到自己的成长轨迹\n\n🧘 **心理调节**：\n• 接受不完美：完成比完美更重要\n• 分析拖延原因：恐惧、完美主义还是缺乏兴趣？\n• 正念练习：专注当下，减少焦虑\n\n什么情况下你最容易拖延？我们可以针对性地解决！`,
      category: "学习心理",
      confidence: 0.9,
      followUpQuestions: ["如何培养学习兴趣？", "怎样保持长期学习动力？"]
    };
  }
  
  // 考试准备相关
  if (lowerQuestion.includes('考试') || lowerQuestion.includes('复习') || lowerQuestion.includes('备考')) {
    return {
      answer: `考试准备的有效策略：\n\n📅 **复习计划**：\n• 制定倒推时间表：从考试日期往前安排\n• 分阶段复习：基础→强化→冲刺\n• 预留调整时间：应对突发情况\n\n📖 **复习方法**：\n• 知识梳理：制作思维导图或大纲\n• 重点突破：分析历年真题找规律\n• 模拟练习：在考试环境下做题\n• 查漏补缺：针对薄弱环节加强\n\n🎯 **应试技巧**：\n• 时间分配：先易后难，控制做题节奏\n• 答题策略：仔细审题，规范作答\n• 心态调节：保持冷静，发挥正常水平\n\n你准备什么考试？我可以给你更具体的建议！`,
      category: "考试准备",
      confidence: 0.9,
      followUpQuestions: ["如何缓解考试焦虑？", "怎样提高答题速度？"]
    };
  }
  
  // 默认通用回答
  return {
    answer: `你好！我是你的AI学习搭子 😊\n\n我收到了你的问题："${question}"\n\n作为你的学习伙伴，我可以帮助你：\n\n📚 **学习规划**：制定个性化学习计划\n🧠 **学习方法**：分享高效学习技巧\n💪 **学习动力**：帮你克服拖延和焦虑\n🎯 **考试准备**：提供备考策略和建议\n📝 **学习记录**：跟踪学习进度和成果\n\n请告诉我你具体想了解什么，我会给你更详细的建议！`,
    category: "通用咨询",
    confidence: 0.8,
    followUpQuestions: [
      "如何制定学习计划？",
      "有什么好的学习方法？",
      "怎样提高学习效率？"
    ]
  };
}

// 添加GET方法用于测试
export async function GET() {
  return NextResponse.json({ 
    message: 'AI Chat API is working!',
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.QIANWEN_API_KEY
  });
}
