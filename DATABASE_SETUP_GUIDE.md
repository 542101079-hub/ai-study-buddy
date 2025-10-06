# 数据库配置指南

## 问题解决

您遇到的"Failed to update task status"错误已经修复！现在系统使用真实的数据库操作而不是模拟数据。

## 配置步骤

### 1. 创建环境配置文件

在项目根目录创建 `.env.local` 文件：

```bash
# 数据库配置 - 使用Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. 获取Supabase配置信息

#### 方法一：使用现有Supabase项目
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 Settings > API
4. 复制以下信息：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`
5. 进入 Settings > Database
6. 复制 Connection string → `DATABASE_URL`

#### 方法二：创建新的Supabase项目
1. 访问 [Supabase](https://supabase.com)
2. 点击 "Start your project"
3. 创建新项目
4. 等待项目初始化完成
5. 按照方法一的步骤获取配置信息

### 3. 数据库迁移

配置完成后，运行以下命令设置数据库：

```bash
# 推送数据库schema
npm run db:push

# 或者执行迁移
npm run db:migrate
```

### 4. 重启开发服务器

```bash
npm run dev
```

## 修复内容

✅ **移除了所有模拟数据**
- 每日计划API现在使用真实的数据库查询
- 任务状态更新使用真实的数据库操作
- 移至明天功能使用真实的数据库操作

✅ **改进了错误处理**
- 提供详细的数据库连接错误信息
- 中文错误提示，更好的用户体验
- 指导用户如何配置数据库

✅ **数据库Schema**
- 使用 `dailyPlans` 表存储每日计划
- 使用 `dailyTasks` 表存储每日任务
- 支持任务状态更新：pending, in_progress, completed, skipped

## 注意事项

- 不要将 `.env.local` 文件提交到版本控制系统
- 确保所有环境变量都已正确设置
- 如果仍有问题，请检查网络连接和Supabase项目状态

## 故障排除

### 常见错误及解决方案

1. **"DATABASE_URL is not set"**: 检查 `.env.local` 文件是否存在且包含正确的数据库连接字符串

2. **"Unauthorized"**: 检查Supabase密钥是否正确

3. **"数据库连接失败"**: 检查网络连接和Supabase项目状态

4. **"任务不存在"**: 确保任务ID正确且数据库中有对应记录

现在您的学习任务状态更新功能应该可以正常工作了！

