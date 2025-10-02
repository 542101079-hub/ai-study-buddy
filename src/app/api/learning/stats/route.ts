// 学习统计 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerSession } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7'; // 默认7天

    // 计算时间范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 获取学习记录统计
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('learning_records')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (recordsError) {
      console.error('Failed to fetch learning records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch learning records' },
        { status: 500 }
      );
    }

    // 获取任务完成统计
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('learning_tasks')
      .select('status, completed_at, estimated_minutes, actual_minutes')
      .eq('user_id', session.user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (tasksError) {
      console.error('Failed to fetch tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // 获取学习目标统计
    const { data: goals, error: goalsError } = await supabaseAdmin
      .from('learning_goals')
      .select('status, type, current_level, target_level')
      .eq('user_id', session.user.id);

    if (goalsError) {
      console.error('Failed to fetch goals:', goalsError);
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      );
    }

    // 计算统计数据
    const stats = {
      // 学习时间统计
      totalStudyTime: records.reduce((sum, record) => sum + (record.duration_minutes || 0), 0),
      averageStudyTime: records.length > 0 
        ? Math.round(records.reduce((sum, record) => sum + (record.duration_minutes || 0), 0) / records.length)
        : 0,
      studyDays: new Set(records.map(record => new Date(record.created_at).toDateString())).size,
      
      // 任务完成统计
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.status === 'completed').length,
      completionRate: tasks.length > 0 
        ? Math.round((tasks.filter(task => task.status === 'completed').length / tasks.length) * 100)
        : 0,
      
      // 目标统计
      totalGoals: goals.length,
      activeGoals: goals.filter(goal => goal.status === 'active').length,
      completedGoals: goals.filter(goal => goal.status === 'completed').length,
      
      // 效率统计
      averageProductivity: records.length > 0 && records.some(r => r.productivity_score)
        ? Math.round(records
            .filter(r => r.productivity_score)
            .reduce((sum, record) => sum + (record.productivity_score || 0), 0) / 
          records.filter(r => r.productivity_score).length * 10) / 10
        : null,
      
      // 情绪统计
      averageMood: records.length > 0 && records.some(r => r.mood_score)
        ? Math.round(records
            .filter(r => r.mood_score)
            .reduce((sum, record) => sum + (record.mood_score || 0), 0) / 
          records.filter(r => r.mood_score).length * 10) / 10
        : null,
      
      // 每日学习时间分布
      dailyStudyTime: calculateDailyStudyTime(records, parseInt(period)),
      
      // 学习类型分布
      studyTypeDistribution: calculateStudyTypeDistribution(records),
      
      // 本周目标
      weeklyGoal: 300, // 可以从用户配置中获取
      weeklyProgress: calculateWeeklyProgress(records)
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Learning stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

}

// 辅助函数
function calculateDailyStudyTime(records: any[], days: number) {
  const dailyTime: { [key: string]: number } = {};
  const today = new Date();
  
  // 初始化每一天为0
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyTime[dateStr] = 0;
  }
  
  // 累加每天的学习时间
  records.forEach(record => {
    const dateStr = new Date(record.created_at).toISOString().split('T')[0];
    if (dailyTime.hasOwnProperty(dateStr)) {
      dailyTime[dateStr] += record.duration_minutes || 0;
    }
  });
  
  return Object.entries(dailyTime)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({ date, minutes }));
}

function calculateStudyTypeDistribution(records: any[]) {
  const typeCount: { [key: string]: number } = {};
  
  records.forEach(record => {
    const type = record.session_data?.task_type || record.session_type || 'other';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  
  return Object.entries(typeCount).map(([type, count]) => ({ type, count }));
}

function calculateWeeklyProgress(records: any[]) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周开始
  weekStart.setHours(0, 0, 0, 0);
  
  const weeklyMinutes = records
    .filter(record => new Date(record.created_at) >= weekStart)
    .reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
  
  return weeklyMinutes;
}
