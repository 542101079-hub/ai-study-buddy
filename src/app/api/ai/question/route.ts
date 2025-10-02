// AI 问答 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerSession } from '@supabase/auth-helpers-nextjs';
import { aiService } from '@/lib/ai/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question, context, goalId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // 获取用户的租户信息
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    try {
      // 调用AI服务回答问题
      const answer = await aiService.answerQuestion(question, context);

      // 保存问答记录
      const { error: saveError } = await supabaseAdmin
        .from('qa_records')
        .insert({
          user_id: session.user.id,
          tenant_id: profile.tenant_id,
          goal_id: goalId || null,
          question,
          answer: answer.answer,
          category: answer.category,
          confidence: answer.confidence,
          context: context || null,
          follow_up_questions: answer.followUpQuestions
        });

      if (saveError) {
        console.error('Failed to save QA record:', saveError);
        // 不返回错误，因为AI回答已经成功
      }

      return NextResponse.json({ answer });
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
