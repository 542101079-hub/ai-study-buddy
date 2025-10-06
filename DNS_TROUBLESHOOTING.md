# 临时解决方案：使用Supabase REST API

## 问题
- DNS解析失败：`ENOTFOUND db.mlosozmsbdrrfvynwepl.supabase.co`
- 无法直接连接PostgreSQL数据库

## 解决方案
使用Supabase的REST API而不是直接数据库连接

### 步骤1：检查Supabase项目状态
1. 访问 https://supabase.com/dashboard
2. 找到项目ID为 `mlosozmsbdrrfvynwepl` 的项目
3. 确保项目状态是 **Active**

### 步骤2：使用REST API测试连接
在Supabase Dashboard的SQL Editor中执行：

```sql
-- 测试连接
SELECT current_database(), current_user, version();

-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_plans', 'daily_tasks');
```

### 步骤3：如果表不存在，创建它们
```sql
-- 创建 daily_tasks 表（如果不存在）
CREATE TABLE IF NOT EXISTS "daily_tasks" (
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
ALTER TABLE "daily_tasks" ENABLE ROW LEVEL SECURITY;

-- 添加外键约束
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS "daily_tasks_plan_order_unique" ON "daily_tasks" USING btree ("daily_plan_id","order_num");
CREATE INDEX IF NOT EXISTS "idx_daily_tasks_plan_order" ON "daily_tasks" USING btree ("daily_plan_id","order_num");
CREATE INDEX IF NOT EXISTS "idx_daily_tasks_status" ON "daily_tasks" USING btree ("status");

-- 创建RLS策略
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
```

### 步骤4：网络问题排查
如果DNS问题持续存在：

1. **尝试使用VPN**
2. **检查防火墙设置**
3. **尝试不同的网络环境**
4. **联系网络管理员**

### 步骤5：验证修复
完成表创建后，重新启动应用：
```bash
npm run dev
```

然后测试"生成今日计划"功能。
