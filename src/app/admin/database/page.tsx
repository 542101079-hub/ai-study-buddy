import { getServerSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DatabaseManager } from './database-manager';

export default async function DatabasePage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🛠️ 数据库管理工具
          </h1>
          <p className="text-white/70">
            管理和创建学习系统数据库表
          </p>
        </div>

        <DatabaseManager />
      </div>
    </div>
  );
}
