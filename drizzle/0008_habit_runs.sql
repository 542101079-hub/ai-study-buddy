CREATE TABLE "habit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_code" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"planned_minutes" integer NOT NULL,
	"actual_minutes" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_runs_status_allowed" CHECK ("habit_runs"."status" IN ('pending', 'doing', 'done', 'skipped')),
	CONSTRAINT "habit_runs_planned_minutes_range" CHECK ("habit_runs"."planned_minutes" BETWEEN 0 AND 1440),
	CONSTRAINT "habit_runs_actual_minutes_range" CHECK ("habit_runs"."actual_minutes" BETWEEN 0 AND 1440)
);
--> statement-breakpoint
ALTER TABLE "habit_runs" ADD CONSTRAINT "habit_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "habit_runs" ADD CONSTRAINT "habit_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "habit_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "habit_runs_user_day_code_unique" ON "habit_runs" USING btree ("user_id","date","habit_code");--> statement-breakpoint
CREATE INDEX "habit_runs_tenant_day_idx" ON "habit_runs" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE POLICY "habit_runs_user_or_admin_access" ON "habit_runs" AS PERMISSIVE FOR ALL TO "authenticated" USING (
	auth.uid() = "habit_runs"."user_id"
	OR EXISTS (
		SELECT 1
		FROM public.profiles AS admin_profiles
		WHERE admin_profiles.id = auth.uid()
			AND admin_profiles.tenant_id = "habit_runs"."tenant_id"
			AND admin_profiles.role = 'admin'
	)
) WITH CHECK (
	auth.uid() = "habit_runs"."user_id"
	OR EXISTS (
		SELECT 1
		FROM public.profiles AS admin_profiles
		WHERE admin_profiles.id = auth.uid()
			AND admin_profiles.tenant_id = "habit_runs"."tenant_id"
			AND admin_profiles.role = 'admin'
	)
);
