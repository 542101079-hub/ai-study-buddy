CREATE TABLE "daily_plan_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_plan_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mood_score" integer,
	"energy_score" integer,
	"summary" text,
	"blockers" text,
	"wins" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_plan_reflections_mood_score_range" CHECK ("daily_plan_reflections"."mood_score" BETWEEN 1 AND 5),
	CONSTRAINT "daily_plan_reflections_energy_score_range" CHECK ("daily_plan_reflections"."energy_score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "daily_plan_reflections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "daily_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "daily_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"target_level" integer DEFAULT 10 NOT NULL,
	"target_date" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_goals_type_allowed" CHECK ("learning_goals"."type" IN ('exam', 'skill', 'career')),
	CONSTRAINT "learning_goals_current_level_range" CHECK ("learning_goals"."current_level" BETWEEN 1 AND 10),
	CONSTRAINT "learning_goals_target_level_range" CHECK ("learning_goals"."target_level" BETWEEN 1 AND 10),
	CONSTRAINT "learning_goals_status_allowed" CHECK ("learning_goals"."status" IN ('active', 'completed', 'paused', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "learning_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"plan_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_plans_status_allowed" CHECK ("learning_plans"."status" IN ('active', 'completed', 'paused', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "learning_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid,
	"goal_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(20) DEFAULT 'study' NOT NULL,
	"difficulty" integer DEFAULT 5 NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"actual_minutes" integer DEFAULT 0,
	"resources" text[] DEFAULT '{}'::text[],
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_tasks_type_allowed" CHECK ("learning_tasks"."type" IN ('study', 'reading', 'practice', 'quiz', 'project', 'review', 'coding')),
	CONSTRAINT "learning_tasks_difficulty_range" CHECK ("learning_tasks"."difficulty" BETWEEN 1 AND 10),
	CONSTRAINT "learning_tasks_estimated_minutes_range" CHECK ("learning_tasks"."estimated_minutes" BETWEEN 5 AND 480),
	CONSTRAINT "learning_tasks_status_allowed" CHECK ("learning_tasks"."status" IN ('pending', 'in_progress', 'completed', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "learning_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_role_allowed";--> statement-breakpoint
DROP INDEX "app_users_email_unique";--> statement-breakpoint
DROP INDEX "app_users_tenant_id_idx";--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "daily_plan_reflections" ADD CONSTRAINT "daily_plan_reflections_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_reflections" ADD CONSTRAINT "daily_plan_reflections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_reflections" ADD CONSTRAINT "daily_plan_reflections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_goal_id_learning_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."learning_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_tasks" ADD CONSTRAINT "learning_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_tasks" ADD CONSTRAINT "learning_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_tasks" ADD CONSTRAINT "learning_tasks_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_tasks" ADD CONSTRAINT "learning_tasks_goal_id_learning_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."learning_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_daily_plan_reflections_plan" ON "daily_plan_reflections" USING btree ("daily_plan_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_user_date_unique" ON "daily_plans" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_daily_plans_user_date" ON "daily_plans" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_daily_plans_tenant_date" ON "daily_plans" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_tasks_plan_order_unique" ON "daily_tasks" USING btree ("daily_plan_id","order_num");--> statement-breakpoint
CREATE INDEX "idx_daily_tasks_plan_order" ON "daily_tasks" USING btree ("daily_plan_id","order_num");--> statement-breakpoint
CREATE INDEX "idx_daily_tasks_status" ON "daily_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_learning_goals_user_tenant" ON "learning_goals" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "idx_learning_goals_status" ON "learning_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_learning_plans_user_goal" ON "learning_plans" USING btree ("user_id","goal_id");--> statement-breakpoint
CREATE INDEX "idx_learning_plans_status" ON "learning_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_learning_tasks_plan_status" ON "learning_tasks" USING btree ("plan_id","status");--> statement-breakpoint
CREATE INDEX "idx_learning_tasks_user_due" ON "learning_tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "app_users" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_allowed" CHECK ("profiles"."role" in ('user', 'admin', 'editor', 'viewer'));--> statement-breakpoint
CREATE POLICY "daily_plan_reflections_tenant_access" ON "daily_plan_reflections" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "daily_plan_reflections"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "daily_plan_reflections"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "daily_plan_reflections"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "daily_plan_reflections"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));--> statement-breakpoint
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
    ));--> statement-breakpoint
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
    ));--> statement-breakpoint
CREATE POLICY "learning_goals_tenant_access" ON "learning_goals" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "learning_goals"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_goals"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "learning_goals"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_goals"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));--> statement-breakpoint
CREATE POLICY "learning_plans_tenant_access" ON "learning_plans" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "learning_plans"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_plans"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "learning_plans"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_plans"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));--> statement-breakpoint
CREATE POLICY "learning_tasks_tenant_access" ON "learning_tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "learning_tasks"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_tasks"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "learning_tasks"."user_id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "learning_tasks"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));