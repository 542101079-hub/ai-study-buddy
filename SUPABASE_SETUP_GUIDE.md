# Supabase 数据库设置指南

## 问题诊断

当前遇到的主要问题：
1. **DNS解析失败**：`ENOTFOUND db.mlosozmsbdrrfvynwepl.supabase.co`
2. **缺失数据表**：`daily_plans` 和 `daily_tasks` 表不存在
3. **认证安全警告**：需要使用 `getUser()` 而不是 `getSession()`

## 解决方案

### 步骤1：检查Supabase项目状态

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目：`mlosozmsbdrrfvynwepl`
3. 检查项目状态：
   - 确保项目是 **Active** 状态
   - 如果项目被暂停，点击 "Resume" 恢复

### 步骤2：手动创建数据表

由于DNS问题无法使用 `drizzle db:push`，需要在Supabase Dashboard中手动创建表：

1. 进入 **SQL Editor**
2. 复制并执行以下SQL脚本：

```sql
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
```

### 步骤3：检查网络连接

如果DNS问题持续存在：

1. **检查防火墙设置**
2. **尝试使用VPN**
3. **检查DNS设置**：
   ```bash
   nslookup db.mlosozmsbdrrfvynwepl.supabase.co
   ```

### 步骤4：验证设置

执行SQL后，检查表是否创建成功：
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_plans', 'daily_tasks');
```

## 常见问题

### Q: 项目被暂停怎么办？
A: 在Supabase Dashboard中点击 "Resume" 恢复项目

### Q: DNS解析失败怎么办？
A: 
1. 检查网络连接
2. 尝试使用不同的DNS服务器（如8.8.8.8）
3. 使用VPN连接

### Q: 表创建失败怎么办？
A: 检查是否有权限错误，确保使用正确的数据库用户

## 下一步

完成表创建后，重新启动应用：
```bash
npm run dev
```

然后测试"生成今日计划"功能。
