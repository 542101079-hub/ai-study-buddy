# 🤖 AI智能学习搭子 - 设置指南

## 📋 功能概述

**AI智能学习搭子**是一个完整的个性化学习规划模块，包含以下核心功能：

### ✨ 主要功能
- 🎯 **个性化学习规划** - AI生成定制化学习计划
- 💬 **智能问答系统** - 24/7学习助手，解答学习疑问
- 📊 **学习进度追踪** - 实时监控学习数据和成果
- 📈 **学习统计分析** - 深度分析学习习惯和效率
- 🏆 **目标管理系统** - 设定和追踪学习目标

## 🚀 快速开始

### 1. 数据库设置

首先需要运行数据库迁移来创建学习系统相关的表：

```bash
# 如果你有有效的数据库连接
npm run db:push

# 或者手动执行 SQL 文件
# 在 Supabase Dashboard 的 SQL Editor 中运行 drizzle/0006_learning_system.sql
```

### 2. 环境变量配置

在项目根目录创建 `.env.local` 文件（如果不存在），添加以下配置：

```env
# 现有的 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 通义千问 API 配置（必需）
QIANWEN_API_KEY=your_qianwen_api_key_here

# 其他 AI 服务配置（可选）
# WENXIN_API_KEY=your_wenxin_api_key
# WENXIN_SECRET_KEY=your_wenxin_secret_key
# OPENAI_API_KEY=your_openai_api_key
```

### 3. 获取通义千问 API Key

1. 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 注册/登录阿里云账号
3. 开通 DashScope 服务
4. 创建 API Key
5. 将 API Key 添加到 `.env.local` 文件中的 `QIANWEN_API_KEY`

### 4. 启动应用

```bash
npm run dev
```

访问 `http://localhost:3000/learning` 开始使用AI学习搭子！

## 📁 文件结构

```
src/
├── app/
│   ├── learning/                    # 学习模块主页面
│   │   ├── page.tsx                # 学习空间主页
│   │   └── components/             # 学习相关组件
│   │       ├── learning-dashboard.tsx  # 学习仪表板
│   │       ├── goal-manager.tsx        # 目标管理
│   │       ├── ai-chat.tsx             # AI聊天助手
│   │       └── plan-generator.tsx      # 计划生成器
│   ├── api/
│   │   ├── learning/               # 学习相关API
│   │   │   ├── goals/              # 目标管理API
│   │   │   ├── plans/              # 计划管理API
│   │   │   ├── tasks/              # 任务管理API
│   │   │   └── stats/              # 统计API
│   │   └── ai/                     # AI服务API
│   │       └── question/           # 问答API
└── lib/
    └── ai/                         # AI服务核心
        ├── types.ts                # 类型定义
        ├── ai-service.ts           # AI服务管理器
        └── providers/              # AI服务提供商
            └── qianwen.ts          # 通义千问集成
```

## 🎯 使用指南

### 1. 创建学习目标

1. 访问学习空间页面
2. 在"学习目标"模块点击"新建目标"
3. 填写目标信息：
   - 目标标题（必填）
   - 目标类型：技能提升/考试准备/职业发展
   - 当前水平和目标水平（1-10）
   - 目标日期（可选）
   - 详细描述

### 2. 生成AI学习计划

1. 在"AI智能学习计划生成"模块
2. 选择已创建的学习目标
3. 设置学习偏好：
   - 每日学习时间
   - 每周学习天数
   - 难度偏好
   - 学习时间段
   - 学习风格
4. 点击"生成AI学习计划"
5. AI将生成个性化的学习计划和任务

### 3. 使用AI聊天助手

1. 在右侧的"AI学习搭子"聊天窗口
2. 输入学习相关问题
3. AI会提供：
   - 详细解答
   - 学习建议
   - 相关资源推荐
   - 后续问题建议

### 4. 追踪学习进度

1. 在学习仪表板查看：
   - 今日任务完成情况
   - 学习时长统计
   - 本周学习进度
   - 连续学习天数
2. 标记任务状态：开始/完成/跳过
3. 查看学习建议和改进提示

## 💡 AI服务说明

### 通义千问集成

- **模型**: qwen-plus
- **功能**: 学习计划生成、智能问答、学习数据分析
- **成本**: 约 ¥0.008/1K tokens（非常经济）
- **优势**: 中文优化、响应快速、成本低廉

### 备用方案

如果通义千问API不可用，系统会：
1. 返回友好的错误提示
2. 提供备用的通用学习计划
3. 显示离线学习建议

## 🔧 自定义配置

### 修改AI提示词

在 `src/lib/ai/providers/qianwen.ts` 中可以自定义：
- 学习计划生成的提示词
- 问答系统的人设和风格
- 数据分析的重点和建议

### 扩展AI服务

可以在 `src/lib/ai/providers/` 目录下添加新的AI服务提供商：
- 百度文心一言
- OpenAI GPT
- 其他大语言模型

### 数据库扩展

可以在现有表基础上添加：
- 更多用户偏好字段
- 学习资源管理
- 社交学习功能
- 成就系统扩展

## 🐛 故障排除

### 常见问题

1. **AI服务不可用**
   - 检查 `QIANWEN_API_KEY` 是否正确配置
   - 确认API Key有足够的额度
   - 查看控制台错误信息

2. **数据库连接失败**
   - 确认 `DATABASE_URL` 配置正确
   - 检查Supabase项目状态
   - 验证服务角色密钥权限

3. **页面加载错误**
   - 检查用户是否已登录
   - 确认用户档案已创建
   - 查看浏览器开发者工具

### 调试模式

在开发环境中，可以通过以下方式调试：

```javascript
// 在浏览器控制台中
localStorage.setItem('debug', 'ai-learning-buddy:*');
```

## 📈 性能优化

### 建议配置

- **生产环境**: 启用Redis缓存AI响应
- **大量用户**: 考虑AI服务负载均衡
- **成本控制**: 设置API调用频率限制

### 监控指标

- AI API调用次数和成本
- 用户学习活跃度
- 计划完成率
- 系统响应时间

## 🎉 完成！

现在你已经成功设置了AI智能学习搭子！用户可以：

1. 📝 创建个性化学习目标
2. 🤖 与AI助手互动学习
3. 📊 生成智能学习计划
4. 📈 追踪学习进度和成果
5. 💡 获得个性化学习建议

享受AI陪伴的学习之旅吧！🚀
