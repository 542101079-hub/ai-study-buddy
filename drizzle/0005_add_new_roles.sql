-- 添加新的用户角色支持
-- 扩展角色检查约束以支持 editor 和 viewer 角色

-- 删除旧的角色约束
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_role_allowed";

-- 添加新的角色约束，支持所有四种角色
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_allowed" CHECK (role IN ('user', 'admin', 'editor', 'viewer'));

-- 更新现有的 RLS 策略以支持新角色
-- editor 角色可以查看同租户的其他用户
-- viewer 角色只能查看自己的信息

-- 更新 profiles_select_own 策略
DROP POLICY IF EXISTS "profiles_select_own" ON "profiles";

CREATE POLICY "profiles_select_own" ON "profiles" 
AS PERMISSIVE FOR SELECT TO "authenticated" 
USING (
  auth.uid() = "profiles"."id" OR 
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = "profiles"."tenant_id"
      AND admin_profiles.role IN ('admin', 'editor')
  )
);

-- 更新 profiles_update_own 策略
DROP POLICY IF EXISTS "profiles_update_own" ON "profiles";

CREATE POLICY "profiles_update_own" ON "profiles" 
AS PERMISSIVE FOR UPDATE TO "authenticated" 
USING (
  auth.uid() = "profiles"."id" OR 
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = "profiles"."tenant_id"
      AND admin_profiles.role = 'admin'
  )
) 
WITH CHECK (
  auth.uid() = "profiles"."id" OR 
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = "profiles"."tenant_id"
      AND admin_profiles.role = 'admin'
  )
);

-- 更新 profiles_insert_own 策略
DROP POLICY IF EXISTS "profiles_insert_own" ON "profiles";

CREATE POLICY "profiles_insert_own" ON "profiles" 
AS PERMISSIVE FOR INSERT TO "authenticated" 
WITH CHECK (
  auth.uid() = "profiles"."id" OR 
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = "profiles"."tenant_id"
      AND admin_profiles.role = 'admin'
  )
);

-- 更新 profiles_delete_own 策略
DROP POLICY IF EXISTS "profiles_delete_own" ON "profiles";

CREATE POLICY "profiles_delete_own" ON "profiles" 
AS PERMISSIVE FOR DELETE TO "authenticated" 
USING (
  auth.uid() = "profiles"."id" OR 
  EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.tenant_id = "profiles"."tenant_id"
      AND admin_profiles.role = 'admin'
  )
);
