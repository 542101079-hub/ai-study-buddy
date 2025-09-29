ALTER TABLE "profiles" ADD COLUMN "role" varchar(16) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_allowed" CHECK ("profiles"."role" in ('user', 'admin'));--> statement-breakpoint
ALTER POLICY "profiles_select_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id"
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS admin_profiles
        WHERE admin_profiles.id = auth.uid()
          AND admin_profiles.role = 'admin'
      ));--> statement-breakpoint
ALTER POLICY "profiles_insert_own" ON "profiles" TO authenticated WITH CHECK (auth.uid() = "profiles"."id"
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS admin_profiles
        WHERE admin_profiles.id = auth.uid()
          AND admin_profiles.role = 'admin'
      ));--> statement-breakpoint
ALTER POLICY "profiles_update_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id"
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS admin_profiles
        WHERE admin_profiles.id = auth.uid()
          AND admin_profiles.role = 'admin'
      )) WITH CHECK (auth.uid() = "profiles"."id"
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS admin_profiles
        WHERE admin_profiles.id = auth.uid()
          AND admin_profiles.role = 'admin'
      ));--> statement-breakpoint
ALTER POLICY "profiles_delete_own" ON "profiles" TO authenticated USING (auth.uid() = "profiles"."id"
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS admin_profiles
        WHERE admin_profiles.id = auth.uid()
          AND admin_profiles.role = 'admin'
      ));