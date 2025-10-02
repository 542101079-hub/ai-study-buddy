// AI 问答 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';

export async function POST(request: NextRequest) {
  console.log('🤖 AI Question API called!');
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
    const { question, context, goalId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // 获取用户的租户信息
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', session.user.id)  // 修复：应该是 id 而不是 user_id
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (!profile) {
      console.log('❌ User profile not found for user:', session.user.id);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ Profile found:', profile);

    try {
      // 调试信息
      console.log('AI Question API - QIANWEN_API_KEY exists:', !!process.env.QIANWEN_API_KEY);
      console.log('AI Question API - Available providers:', aiService.getAvailableProviders());
      
      // 暂时返回一个模拟的AI回答，不调用真实的AI服务
      const mockAnswer = {
        answer: `你好！我收到了你的问题："${question}"。\n\n我是你的AI学习搭子，虽然目前我的AI服务还在调试中，但我很乐意帮助你学习！\n\n你可以问我关于学习方法、时间管理、或者任何学习相关的问题。😊`,
        category: "学习咨询",
        confidence: 0.9,
        followUpQuestions: [
          "需要我推荐一些学习方法吗？",
          "想了解如何制定学习计划吗？",
          "有其他学习问题可以继续问我！"
        ]
      };

      console.log('✅ Returning mock answer');
      return NextResponse.json({ answer: mockAnswer });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // 返回友好的错误信息和备用回答
      const fallbackAnswer = {
        answer: "抱歉，我现在有点忙，暂时无法回答你的问题。请稍后再试，或者你可以：\n\n1. 查看学习资源库中的相关资料\n2. 向同学或老师请教\n3. 在网上搜索相关信息\n\n我会尽快恢复正常服务！😊",
        category: "系统消息",
        confidence: 0.5,
        followUpQuestions: [
          "需要我推荐一些学习资源吗？",
          "有其他问题可以问我吗？"
        ]
      };

      return NextResponse.json({ 
        answer: fallbackAnswer,
        isAIUnavailable: true 
      });
    }
  } catch (error) {
    console.error('AI question answering error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 添加GET方法用于测试
export async function GET() {
  return NextResponse.json({ 
    message: 'AI Question API is working!',
    timestamp: new Date().toISOString()
  });
}
