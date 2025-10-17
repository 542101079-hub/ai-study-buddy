# AI智能学习搭子系统截图获取指南

## 准备工作

### 1. 环境准备
- 确保系统正常运行
- 准备测试数据（用户账号、学习目标、学习计划等）
- 使用Chrome浏览器进行截图
- 确保网络连接稳定

### 2. 测试数据准备
```sql
-- 创建测试用户
INSERT INTO auth.users (email, encrypted_password) VALUES 
('test@example.com', 'encrypted_password');

-- 创建测试学习目标
INSERT INTO learning_goals (user_id, tenant_id, title, description, type) VALUES 
('user_id', 'tenant_id', '学习React开发', '掌握React基础知识和实践应用', 'skill');

-- 创建测试学习计划
INSERT INTO learning_plans (goal_id, title, description) VALUES 
('goal_id', 'React学习计划', '8周React学习计划');
```

## 截图获取步骤

### 1. 认证相关截图

#### 登录页面 (auth-login.png)
1. 访问 `http://localhost:3000/signin`
2. 确保页面完全加载
3. 调整浏览器窗口到1920x1080分辨率
4. 截图保存为 `auth-login.png`

#### 注册页面 (auth-signup.png)
1. 访问 `http://localhost:3000/signup`
2. 填写注册表单（使用测试数据）
3. 截图保存为 `auth-signup.png`

#### 租户选择页面 (tenant-select.png)
1. 访问 `http://localhost:3000/tenant-select`
2. 显示租户列表
3. 截图保存为 `tenant-select.png`

### 2. 学习仪表板截图

#### 仪表板总览 (dashboard-overview.png)
1. 登录后访问 `http://localhost:3000/dashboard`
2. 确保显示完整的三栏布局
3. 包含学习目标、今日计划、AI助手
4. 截图保存为 `dashboard-overview.png`

#### 今日计划区块 (dashboard-today.png)
1. 在仪表板页面
2. 聚焦到中央的今日计划区域
3. 显示任务列表和进度
4. 截图保存为 `dashboard-today.png`

### 3. 学习功能截图

#### 学习目标列表 (goals-list.png)
1. 访问 `http://localhost:3000/learning`
2. 显示学习目标列表
3. 包含目标状态和进度
4. 截图保存为 `goals-list.png`

#### 新建学习目标 (goals-new.png)
1. 点击"新建目标"按钮
2. 显示目标创建表单
3. 填写表单字段
4. 截图保存为 `goals-new.png`

#### 计划生成器 (plan-generator-input.png)
1. 选择学习目标
2. 点击"生成学习计划"
3. 显示偏好设置表单
4. 截图保存为 `plan-generator-input.png`

#### 计划生成成功 (plan-generated.png)
1. 提交计划生成请求
2. 等待AI生成完成
3. 显示生成的学习计划
4. 截图保存为 `plan-generated.png`

### 4. AI聊天截图

#### 用户提问 (ai-chat-question.png)
1. 访问 `http://localhost:3000/assistant`
2. 在输入框中输入问题
3. 显示用户消息
4. 截图保存为 `ai-chat-question.png`

#### AI回答 (ai-chat-answer.png)
1. 发送问题后等待AI回复
2. 显示AI助手的回答
3. 包含建议和资源推荐
4. 截图保存为 `ai-chat-answer.png`

### 5. 数据分析截图

#### 进度统计 (analytics-progress.png)
1. 访问 `http://localhost:3000/learning`
2. 切换到进度分析页面
3. 显示进度图表和统计
4. 截图保存为 `analytics-progress.png`

#### 学习趋势 (analytics-trend.png)
1. 在分析页面
2. 显示学习趋势图表
3. 包含时间轴和数据点
4. 截图保存为 `analytics-trend.png`

### 6. 管理后台截图

#### 管理首页 (admin-home.png)
1. 使用管理员账号登录
2. 访问 `http://localhost:3000/admin`
3. 显示管理首页概览
4. 截图保存为 `admin-home.png`

#### 成员管理 (admin-members.png)
1. 在管理后台
2. 点击"成员管理"
3. 显示用户列表和权限
4. 截图保存为 `admin-members.png`

## 截图技巧

### 1. 浏览器设置
- 使用Chrome浏览器
- 设置合适的缩放比例（100%）
- 隐藏书签栏和工具栏
- 使用全屏模式

### 2. 截图工具
- 使用Chrome开发者工具
- 设置设备模拟器
- 调整分辨率到1920x1080
- 使用截图扩展程序

### 3. 图片处理
- 确保图片清晰度
- 统一图片尺寸
- 优化文件大小
- 使用PNG格式

## 注意事项

1. **数据隐私**：使用测试数据，避免真实用户信息
2. **界面完整性**：确保截图包含所有功能元素
3. **一致性**：保持界面风格和布局一致
4. **质量要求**：确保文字清晰可读
5. **文件命名**：严格按照命名规范保存

## 完成检查清单

- [ ] 所有截图已获取
- [ ] 文件命名正确
- [ ] 图片质量符合要求
- [ ] 内容完整无遗漏
- [ ] 已上传到指定目录
