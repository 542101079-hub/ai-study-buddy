// 学习计划生成 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';

// 学习计划生成器类
class LearningPlanGenerator {
  static async generateLearningPath(goal: any, assessment: any, preferences: any) {
    // 使用 AI 服务生成学习计划
    return await aiService.generateLearningPlan({
      goal,
      assessment,
      preferences
    });
  }

  static async generateDailyTasks(planData: any, planId: string, userId: string, tenantId: string, goalId: string) {
    const tasks = [];
    
    if (!planData.learning_phases || !Array.isArray(planData.learning_phases)) {
      console.log('No learning phases found in plan data');
      return tasks;
    }
    
    for (const phase of planData.learning_phases) {
      if (!phase.weekly_tasks || !Array.isArray(phase.weekly_tasks)) {
        continue;
      }
      
      for (const weeklyTask of phase.weekly_tasks) {
        if (!weeklyTask.tasks || !Array.isArray(weeklyTask.tasks)) {
          continue;
        }
        
        for (const task of weeklyTask.tasks) {
          // 计算任务的到期日期
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (weeklyTask.week - 1) * 7);
          
          // 确保difficulty值在有效范围内 (1-10)
          let taskDifficulty = task.difficulty;
          if (typeof taskDifficulty !== 'number' || taskDifficulty < 1 || taskDifficulty > 10) {
            taskDifficulty = 5; // 默认中等难度
          }
          
          // 确保estimated_minutes在合理范围内 (1-480)
          let estimatedMinutes = task.estimated_minutes;
          if (typeof estimatedMinutes !== 'number' || estimatedMinutes < 1 || estimatedMinutes > 480) {
            estimatedMinutes = 60; // 默认60分钟
          }
          
          tasks.push({
            user_id: userId,
            tenant_id: tenantId,
            plan_id: planId,
            goal_id: goalId,
            title: task.title || '学习任务',
            description: task.description || '',
            type: task.type || 'study',
            difficulty: taskDifficulty,
            estimated_minutes: estimatedMinutes,
            resources: Array.isArray(task.resources) ? task.resources : [],
            due_date: dueDate.toISOString(),
            status: 'pending'
          });
        }
      }
    }
    
    console.log(`Generated ${tasks.length} learning tasks`);
    return tasks;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Generate Plan API Started ===');
    
    const session = await getServerSession();
    if (!session?.user) {
      console.log('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { goalId, preferences } = body;
    
    console.log('Generate plan request body:', body);
    console.log('Extracted goalId:', goalId);
    console.log('User ID:', session.user.id);

    if (!goalId) {
      console.log('Missing goalId in request');
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // 获取学习目标
    console.log('Fetching goal with ID:', goalId);
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('learning_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', session.user.id)
      .single();

    if (goalError) {
      console.error('Goal fetch error:', goalError);
      return NextResponse.json(
        { error: 'Goal not found', details: goalError.message },
        { status: 404 }
      );
    }

    if (!goal) {
      console.log('Goal not found for ID:', goalId);
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    console.log('Found goal:', goal.title);

    // 获取用户最新的评估（如果存在）
    const { data: assessment } = await supabaseAdmin
      .from('user_assessments')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 设置默认偏好
    const defaultPreferences = {
      daily_time_minutes: 60,
      weekly_goal: 5,
      difficulty_level: 3,
      preferred_time: 'evening',
      learning_style: 'mixed'
    };

    const finalPreferences = { ...defaultPreferences, ...preferences };

    // 生成学习计划
    console.log('Generating learning plan with preferences:', finalPreferences);
    const planData = await LearningPlanGenerator.generateLearningPath(
      goal,
      assessment,
      finalPreferences
    );
    console.log('Generated plan data:', planData);

    // 保存学习计划到数据库
    const { data: savedPlan, error: saveError } = await supabaseAdmin
      .from('learning_plans')
      .insert({
        user_id: session.user.id,
        tenant_id: goal.tenant_id,
        goal_id: goalId,
        title: `${goal.title} - 学习计划`,
        description: planData.plan_overview,
        plan_data: planData,
        status: 'active'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save learning plan:', saveError);
      return NextResponse.json(
        { error: 'Failed to save learning plan' },
        { status: 500 }
      );
    }

    // 生成并保存学习任务
    const tasks = await LearningPlanGenerator.generateDailyTasks(
      planData,
      savedPlan.id,
      session.user.id,
      goal.tenant_id,
      goalId
    );

    if (tasks.length > 0) {
      const { error: tasksError } = await supabaseAdmin
        .from('learning_tasks')
        .insert(tasks);

      if (tasksError) {
        console.error('Failed to save learning tasks:', tasksError);
        // 不返回错误，因为计划已经保存成功
      }
    }

    return NextResponse.json({ 
      plan: savedPlan,
      planData,
      tasksCount: tasks.length
    });
  } catch (error) {
    console.error('=== Generate learning plan error ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    // 如果是 AI 服务错误，返回更友好的错误信息
    if (error instanceof Error && error.message.includes('QIANWEN_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact administrator.', details: error.message },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate learning plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
