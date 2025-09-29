
CREATE TABLE "tenants" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(120) NOT NULL,
    "slug" varchar(64) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP INDEX "profiles_username_unique";
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_sessions" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
INSERT INTO "tenants" ("name", "slug")
VALUES ('Default Tenant', 'default')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
WITH default_tenant AS (
  SELECT id FROM "tenants" WHERE slug = 'default' LIMIT 1
)
UPDATE "profiles"
SET "tenant_id" = (SELECT id FROM default_tenant)
WHERE "tenant_id" IS NULL;
--> statement-breakpoint
WITH default_tenant AS (
  SELECT id FROM "tenants" WHERE slug = 'default' LIMIT 1
)
UPDATE "app_users"
SET "tenant_id" = (SELECT id FROM default_tenant)
WHERE "tenant_id" IS NULL;
--> statement-breakpoint
WITH default_tenant AS (
  SELECT id FROM "tenants" WHERE slug = 'default' LIMIT 1
)
UPDATE "app_sessions"
SET "tenant_id" = (SELECT id FROM default_tenant)
WHERE "tenant_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_sessions" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" USING btree ("slug");
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "profiles_tenant_id_idx" ON "profiles" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "app_sessions_tenant_id_idx" ON "app_sessions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "app_users_tenant_id_idx" ON "app_users" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("tenant_id","username");
--> statement-breakpoint
CREATE POLICY "tenants_select_own" ON "tenants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1
      FROM public.profiles AS member_profiles
      WHERE member_profiles.tenant_id = "tenants"."id"
        AND member_profiles.id = auth.uid()
    ));
--> statement-breakpoint
ALTER POLICY "profiles_select_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "profiles"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));
--> statement-breakpoint
ALTER POLICY "profiles_insert_own" ON "profiles" TO authenticated WITH CHECK (auth.uid() = "profiles"."id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "profiles"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));
--> statement-breakpoint
ALTER POLICY "profiles_update_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "profiles"."tenant_id"
        AND admin_profiles.role = 'admin'
    )) WITH CHECK (auth.uid() = "profiles"."id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "profiles"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));
--> statement-breakpoint
ALTER POLICY "profiles_delete_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id" OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = "profiles"."tenant_id"
        AND admin_profiles.role = 'admin'
    ));
