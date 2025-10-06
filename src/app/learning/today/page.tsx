import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { TodayPlan } from './today-plan';

export default async function TodayLearningPlanPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-12">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-violet-300/80">Daily Focus</p>
            <h1 className="mt-1 text-3xl font-bold text-white">今日学习计划</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              聚焦今天最重要的 20%，安排、执行并追踪实时进度。可随时补充临时任务，与 AI 生成的长期学习计划保持同步。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white/90 hover:bg-white/10"
            >
              <Link href="/learning">返回学习空间</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:from-violet-700 hover:to-purple-700"
            >
              <Link href="/learning/plans">查看全部学习计划</Link>
            </Button>
          </div>
        </div>

        <TodayPlan />
      </div>
    </div>
  );
}
