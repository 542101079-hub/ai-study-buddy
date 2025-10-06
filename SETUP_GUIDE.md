# 环境配置指南

## 问题描述
当前应用无法生成学习计划，错误信息显示"数据库配置缺失"。

## 解决方案

### 1. 创建环境配置文件
在项目根目录创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your-project-url
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

## 注意事项
- 不要将 `.env.local` 文件提交到版本控制系统
- 确保所有环境变量都已正确设置
- 如果仍有问题，请检查网络连接和Supabase项目状态

## 故障排除

### 常见错误及解决方案

1. **"DATABASE_URL is not set"**: 检查 `.env.local` 文件是否存在且包含正确的数据库连接字符串

2. **"Unauthorized"**: 检查Supabase密钥是否正确

3. **"Tenant not found"**: 确保用户已正确注册并关联到租户

4. **"数据库服务不可用"** 或 **"ENOTFOUND"**: 
   - 检查Supabase项目是否仍然活跃
   - 登录 [Supabase Dashboard](https://supabase.com/dashboard) 确认项目状态
   - 如果项目被暂停，需要重新激活或创建新项目

5. **网络连接问题**:
   - 检查防火墙设置
   - 尝试使用VPN或更换网络环境
   - 确认DNS解析正常

### Supabase项目状态检查

如果遇到数据库连接问题，请按以下步骤检查：

1. **登录Supabase Dashboard**: https://supabase.com/dashboard
2. **检查项目状态**: 确认项目是否显示为"Active"
3. **验证数据库连接**: 在Dashboard中测试数据库连接
4. **检查项目设置**: 确认API密钥和数据库URL是否正确

### 临时解决方案

如果Supabase项目确实无法访问，可以考虑：

1. **创建新的Supabase项目**
2. **使用本地PostgreSQL数据库**
3. **联系Supabase技术支持**

