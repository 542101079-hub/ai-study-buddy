# 🔍 任务生成调试功能已添加

## 📊 **问题分析**

### **当前状况**：
- ✅ API调用成功
- ❌ 返回的任务数组为空 (`Array(0)`)
- ❌ 显示"已生成0个学习任务"

### **可能原因**：
1. **学习目标任务查询失败** - 没有找到对应的学习任务
2. **默认任务创建失败** - 数据库插入失败
3. **参数传递问题** - 某些必要参数缺失或错误

## 🛠️ **调试功能**

### **1. 详细的函数调用日志**
```typescript
console.log('[generateDailyTasks] Starting with:', { 
  userId, tenantId, planId, goalPlanId, dailyMinutes 
});
```

### **2. 学习任务查询日志**
```typescript
console.log('[generateDailyTasks] Looking for learning tasks with planId:', goalPlanId);
console.log('[generateDailyTasks] Learning tasks query result:', { learningTasks, tasksError });
```

### **3. 任务创建过程日志**
```typescript
console.log('[generateDailyTasks] Created task from learning task:', { newTask, insertError });
console.log('[generateDailyTasks] Creating default task:', taskData);
console.log('[generateDailyTasks] Default task creation result:', { newTask, insertError });
```

### **4. 最终结果日志**
```typescript
console.log('[generateDailyTasks] Final tasks count:', tasks.length);
console.log('[daily/generate] Generated tasks:', tasks);
console.log('[daily/generate] Returning response with:', normalizeResponse(plan, tasks));
```

## 🎯 **调试步骤**

### **1. 点击"生成今日计划"按钮**

### **2. 查看浏览器控制台日志**

您应该看到类似这样的日志序列：

```
[daily/generate] Calling generateDailyTasks with: {userId: "...", tenantId: "...", planId: "...", goalPlanId: "a66383e7-c142-425b-8abb-e0b17d8c55e6", dailyMinutes: 240}
[generateDailyTasks] Starting with: {userId: "...", tenantId: "...", planId: "...", goalPlanId: "a66383e7-c142-425b-8abb-e0b17d8c55e6", dailyMinutes: 240}
[generateDailyTasks] Looking for learning tasks with planId: a66383e7-c142-425b-8abb-e0b17d8c55e6
[generateDailyTasks] Learning tasks query result: {learningTasks: [...], tasksError: null}
[generateDailyTasks] Found X learning tasks, creating daily tasks
[generateDailyTasks] Created task from learning task: {newTask: {...}, insertError: null}
...
[generateDailyTasks] Final tasks count: X
[daily/generate] Generated tasks: [...]
[daily/generate] Returning response with: {plan: {...}, tasks: [...]}
```

### **3. 分析日志找出问题**

**可能的问题点**：

#### **A. 学习任务查询失败**
```
[generateDailyTasks] Learning tasks query result: {learningTasks: null, tasksError: {...}}
```
**解决方案**：检查数据库连接和表结构

#### **B. 学习任务为空**
```
[generateDailyTasks] Learning tasks query result: {learningTasks: [], tasksError: null}
[generateDailyTasks] No learning tasks found or error: null
```
**解决方案**：该学习计划没有生成具体的学习任务

#### **C. 默认任务创建失败**
```
[generateDailyTasks] Creating default task: {...}
[generateDailyTasks] Default task creation result: {newTask: null, insertError: {...}}
[generateDailyTasks] Failed to create default task: {...}
```
**解决方案**：检查数据库表结构和权限

#### **D. 参数问题**
```
[generateDailyTasks] Starting with: {userId: undefined, tenantId: undefined, ...}
```
**解决方案**：检查用户认证和参数传递

## 🔧 **常见问题解决**

### **1. 学习任务表不存在**
- 检查 `learning_tasks` 表是否存在
- 确认表结构正确

### **2. 每日任务表权限问题**
- 检查 `daily_tasks` 表的插入权限
- 确认 RLS (Row Level Security) 设置

### **3. 外键约束问题**
- 检查 `daily_plan_id` 外键约束
- 确认 `planId` 参数有效

### **4. 数据类型问题**
- 检查 `estimated_minutes` 数据类型
- 确认 `order_num` 字段类型

## 📋 **下一步操作**

1. **点击"生成今日计划"按钮**
2. **查看控制台日志**
3. **将日志内容发送给我**
4. **根据日志分析具体问题**
5. **实施相应的修复方案**

## 🎉 **预期结果**

添加调试日志后，我们应该能够：
- ✅ 准确定位问题所在
- ✅ 了解任务生成的每个步骤
- ✅ 快速修复数据库或逻辑问题
- ✅ 确保任务生成功能正常工作

**请现在点击"生成今日计划"按钮，然后告诉我控制台显示的日志内容！** 🔍

