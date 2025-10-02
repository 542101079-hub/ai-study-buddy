import { NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tables = [
      'learning_goals',
      'user_assessments', 
      'learning_plans',
      'learning_tasks',
      'learning_records',
      'learning_resources',
      'plan_adjustments',
      'qa_records',
      'user_achievements',
      'study_buddy_config'
    ];

    const tableStatus = [];

    for (const tableName of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(0);

        tableStatus.push({
          name: tableName,
          exists: !error,
          error: error?.message || null
        });
      } catch (err) {
        tableStatus.push({
          name: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      tables: tableStatus,
      summary: {
        total: tables.length,
        existing: tableStatus.filter(t => t.exists).length,
        missing: tableStatus.filter(t => !t.exists).length
      }
    });

  } catch (error) {
    console.error('Check tables error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
