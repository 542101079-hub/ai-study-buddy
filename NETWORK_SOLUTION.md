# 临时解决方案：绕过DNS问题

## 问题分析
- DNS解析失败：`ENOTFOUND db.mlosozmsbdrrfvynwepl.supabase.co`
- 网络连接问题：`EAI_AGAIN` 错误
- 代码缓存问题：部分API路由仍使用旧代码

## 解决方案

### 方案1：使用Supabase REST API（推荐）

修改API路由使用Supabase的REST API而不是直接PostgreSQL连接：

```typescript
// 在 generateDailyPlan 函数中
// 替换直接数据库查询为Supabase REST API调用
const { data, error } = await supabaseAdmin
  .from('daily_plans')
  .select('*')
  .eq('user_id', userId)
  .eq('date', targetDate)
  .single();
```

### 方案2：网络问题排查

1. **检查Supabase项目状态**
   - 访问 https://supabase.com/dashboard
   - 确认项目 `mlosozmsbdrrfvynwepl` 是 Active 状态

2. **尝试不同的网络环境**
   - 使用手机热点
   - 尝试VPN连接
   - 检查公司/学校网络限制

3. **DNS设置**
   - 尝试使用公共DNS：8.8.8.8, 1.1.1.1
   - 检查防火墙设置

### 方案3：临时Mock数据

如果网络问题无法立即解决，可以创建临时Mock数据：

```typescript
// 临时解决方案：返回Mock数据
const mockDailyPlan = {
  id: 'mock-plan-id',
  date: targetDate,
  targetMinutes: dailyMinutes,
  actualMinutes: 0,
  status: 'draft'
};

const mockTasks = [
  {
    id: 'mock-task-1',
    topic: '学习React基础',
    estimatedMinutes: 60,
    actualMinutes: 0,
    status: 'pending',
    orderNum: 1
  },
  {
    id: 'mock-task-2', 
    topic: '练习TypeScript',
    estimatedMinutes: 45,
    actualMinutes: 0,
    status: 'pending',
    orderNum: 2
  }
];

return { plan: mockDailyPlan, tasks: mockTasks };
```

## 下一步行动

1. **立即尝试**：使用手机热点测试
2. **如果仍然失败**：实施Mock数据方案
3. **长期解决**：联系网络管理员或使用VPN
