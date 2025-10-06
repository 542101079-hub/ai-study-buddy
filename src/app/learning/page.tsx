import { redirect } from 'next/navigation';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

  // 如果没有档案，需要获取或创建一个默认租户
  let userProfile = profileData;
  
  if (!profileData) {
    // 查找或创建默认租户
    let { data: defaultTenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'ai-study-buddy')
      .single();
    
    if (!defaultTenant) {
      // 创建默认租户
      const { data: newTenant } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: 'AI 学习伙伴',
          slug: 'ai-study-buddy'
        })
        .select('id, name, slug')
        .single();
      
      defaultTenant = newTenant;
    }
    
    userProfile = {
      display_name: session.user.email?.split('@')[0] || '学习者',
      tenant_id: defaultTenant?.id || null,
      tenants: defaultTenant || {
        id: null,
        name: 'AI 学习伙伴',
        slug: 'ai-study-buddy'
      }
    };
  }

  // 获取用户的学习目标（只有在有有效租户ID时）
  let goals = [];
  if (userProfile?.tenant_id) {
    const { data: goalsData } = await supabaseAdmin
      .from('learning_goals')
      .select(`
        *,
        learning_plans (
          id,
          title,
          status,
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    goals = goalsData || [];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🚀 AI 智能学习空间</h1>
            <p className="text-white/70">
              欢迎回来，{userProfile.display_name || session.user.email?.split('@')[0] || '学习者'}，一起继续推进学习旅程吧。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:from-violet-700 hover:to-purple-700"
            >
              <Link href="/learning/today">查看今日计划</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white/90 hover:bg-white/10"
            >
              <Link href="/dashboard">返回仪表盘</Link>
            </Button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 items-start">
          {/* 左侧：学习仪表板和目标管理 */}
          <div className="lg:col-span-3 space-y-6">
            <div id="daily-plan"><LearningDashboard /></div>
            
            {/* 学习目标管理 */}
            <GoalManager 
              tenantId={userProfile.tenant_id}
            />
          </div>

          {/* 右侧：AI助手和计划生成 */}
          <div className="lg:col-span-2 space-y-8 self-start">
            {/* AI聊天助手 */}
            <AIChatComponent className="flex-shrink-0" />
            
            {/* AI计划生成器 */}
            <PlanGeneratorComponent 
              goals={goals || []}
              className="flex-shrink-0 lg:relative lg:z-20"
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

