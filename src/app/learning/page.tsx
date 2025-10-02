import { redirect } from 'next/navigation';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';
import { LearningDashboard } from './components/learning-dashboard';
import { GoalManager } from './components/goal-manager';
import { AIChatComponent } from './components/ai-chat';
import { PlanGeneratorComponent } from './components/plan-generator';

export default async function LearningPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/signin');
  }

  // 获取用户档案和租户信息
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select(`
      *,
      tenants (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', session.user.id)
    .single();

  // 如果没有档案，使用默认值继续运行，不强制重定向
  const userProfile = profileData || {
    display_name: session.user.email?.split('@')[0] || '学习者',
    tenant_id: 'default',
    tenants: {
      id: 'default',
      name: 'AI 学习伙伴',
      slug: 'ai-study-buddy'
    }
  };

  // 获取用户的学习目标
  const { data: goals } = await supabaseAdmin
    .from('learning_goals')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎓 AI智能学习空间
          </h1>
          <p className="text-white/70">
            欢迎回来，{userProfile.display_name || session.user.email?.split('@')[0] || '学习者'}！
            让我们一起开始今天的学习之旅。
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧：学习仪表板 */}
          <div className="xl:col-span-2 space-y-6">
            <LearningDashboard />
            
            {/* 学习目标管理 */}
            <GoalManager 
              tenantId={userProfile.tenant_id}
            />
          </div>

          {/* 右侧：AI助手和计划生成 */}
          <div className="space-y-6">
            {/* AI聊天助手 */}
            <AIChatComponent className="h-96" />
            
            {/* AI计划生成器 */}
            <PlanGeneratorComponent 
              goals={goals || []}
            />
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 p-4 bg-slate-900/60 rounded-xl border border-white/10 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-white font-medium">学习小贴士</h3>
              <p className="text-white/70 text-sm">
                定期与AI学习搭子交流，制定合理的学习计划，保持学习的连续性。记住，每一小步都是向目标迈进！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
