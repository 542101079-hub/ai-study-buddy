-- 创建 daily_plans 表
CREATE TABLE "daily_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"date" date NOT NULL,
	"target_minutes" integer DEFAULT 120 NOT NULL,
	"actual_minutes" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_plans_status_allowed" CHECK ("daily_plans"."status" IN ('draft', 'in_progress', 'completed', 'skipped')),
	CONSTRAINT "daily_plans_target_minutes_range" CHECK ("daily_plans"."target_minutes" BETWEEN 0 AND 1440),
	CONSTRAINT "daily_plans_actual_minutes_range" CHECK ("daily_plans"."actual_minutes" BETWEEN 0 AND 1440)
);

-- 创建 daily_tasks 表
CREATE TABLE "daily_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"daily_plan_id" uuid NOT NULL,
	"phase_id" uuid,
	"topic" text NOT NULL,
	"estimated_minutes" integer DEFAULT 30 NOT NULL,
	"actual_minutes" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"order_num" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_tasks_estimated_minutes_range" CHECK ("daily_tasks"."estimated_minutes" BETWEEN 5 AND 480),
	CONSTRAINT "daily_tasks_actual_minutes_range" CHECK ("daily_tasks"."actual_minutes" BETWEEN 0 AND 1440),
	CONSTRAINT "daily_tasks_status_allowed" CHECK ("daily_tasks"."status" IN ('pending', 'in_progress', 'completed', 'skipped'))
);

-- 启用行级安全
ALTER TABLE "daily_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_tasks" ENABLE ROW LEVEL SECURITY;

-- 添加外键约束
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;

-- 创建索引
CREATE UNIQUE INDEX "daily_plans_user_date_unique" ON "daily_plans" USING btree ("user_id","date");
CREATE INDEX "idx_daily_plans_user_date" ON "daily_plans" USING btree ("user_id","date");
CREATE INDEX "idx_daily_plans_tenant_date" ON "daily_plans" USING btree ("tenant_id","date");

CREATE UNIQUE INDEX "daily_tasks_plan_order_unique" ON "daily_tasks" USING btree ("daily_plan_id","order_num");
CREATE INDEX "idx_daily_tasks_plan_order" ON "daily_tasks" USING btree ("daily_plan_id","order_num");
CREATE INDEX "idx_daily_tasks_status" ON "daily_tasks" USING btree ("status");

-- 创建RLS策略
CREATE POLICY "daily_plans_tenant_access" ON "daily_plans" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "daily_plans"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "daily_plans"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "daily_plans"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "daily_plans"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));

CREATE POLICY "daily_tasks_tenant_access" ON "daily_tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
      SELECT 1
      FROM daily_plans dp
      WHERE dp.id = "daily_tasks"."daily_plan_id"
        AND (
          dp.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.profiles AS admin_profiles
            WHERE admin_profiles.id = auth.uid()
              AND admin_profiles.tenant_id = dp.tenant_id
              AND admin_profiles.role = 'admin'
          )
        )
    )) WITH CHECK (EXISTS (
      SELECT 1
      FROM daily_plans dp
      WHERE dp.id = "daily_tasks"."daily_plan_id"
        AND (
          dp.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.profiles AS admin_profiles
            WHERE admin_profiles.id = auth.uid()
              AND admin_profiles.tenant_id = dp.tenant_id
              AND admin_profiles.role = 'admin'
          )
        )
    ));

-- ============================
-- ���� AI ���Ա����Ի���
-- ============================

CREATE TABLE IF NOT EXISTS public.assistant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE cascade,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE cascade,
  title text NOT NULL DEFAULT '新的对话',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE cascade,
  session_id uuid NOT NULL REFERENCES public.assistant_sessions(id) ON DELETE cascade,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE cascade,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content jsonb NOT NULL,
  tokens int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  order_num int GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX IF NOT EXISTS idx_assistant_sessions_tenant_user
  ON public.assistant_sessions(tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_session
  ON public.assistant_messages(session_id, order_num);

ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- ͬ�⻧�Լ���д�Լ����Ự
CREATE POLICY assistant_sessions_rw_self
ON public.assistant_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- �⻧����Ա�ɶ���⻧ȫ������
CREATE POLICY assistant_sessions_r_admin
ON public.assistant_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = public.assistant_sessions.tenant_id
      AND admin_profiles.role = 'admin'
  )
);

-- ͬ�Ự�Լ���д��Ϣ
CREATE POLICY assistant_messages_rw_self
ON public.assistant_messages
FOR ALL
TO authenticated
USING (
  session_id IN (
    SELECT id
    FROM public.assistant_sessions s
    WHERE s.user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id
    FROM public.assistant_sessions s
    WHERE s.user_id = auth.uid()
  )
);

-- �⻧����Ա�ɶ���⻧ȫ����Ϣ
CREATE POLICY assistant_messages_r_admin
ON public.assistant_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = public.assistant_messages.tenant_id
      AND admin_profiles.role = 'admin'
  )
);
