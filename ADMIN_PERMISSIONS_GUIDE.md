# 管理员权限管理系统

## 🎯 功能概述

我已经为您实现了完整的管理员权限管理功能，包括：

- ✅ 扩展的用户角色系统（4种角色）
- ✅ 细粒度权限控制
- ✅ 管理员用户管理界面
- ✅ 后端权限验证
- ✅ 数据库安全策略

## 🔐 用户角色系统

### 角色类型

1. **管理员 (admin)**
   - 拥有所有权限
   - 可以管理用户、内容和系统设置
   - 可以更改其他用户的角色

2. **编辑者 (editor)**
   - 可以管理内容
   - 可以查看用户信息和分析数据
   - 可以访问高级功能

3. **普通用户 (user)**
   - 可以创建和管理自己的内容
   - 使用基本功能
   - 默认角色

4. **查看者 (viewer)**
   - 只能查看内容
   - 无法进行编辑操作
   - 最低权限角色

### 权限矩阵

| 功能 | 管理员 | 编辑者 | 普通用户 | 查看者 |
|------|--------|--------|----------|--------|
| 查看用户 | ✅ | ✅ | ❌ | ❌ |
| 编辑用户 | ✅ | ❌ | ❌ | ❌ |
| 删除用户 | ✅ | ❌ | ❌ | ❌ |
| 更改角色 | ✅ | ❌ | ❌ | ❌ |
| 邀请用户 | ✅ | ❌ | ❌ | ❌ |
| 创建内容 | ✅ | ✅ | ✅ | ❌ |
| 编辑内容 | ✅ | ✅ | ❌* | ❌ |
| 删除内容 | ✅ | ✅ | ❌* | ❌ |
| 发布内容 | ✅ | ✅ | ❌ | ❌ |
| 管理租户 | ✅ | ❌ | ❌ | ❌ |
| 查看分析 | ✅ | ✅ | ❌ | ❌ |
| 管理设置 | ✅ | ❌ | ❌ | ❌ |
| 高级功能 | ✅ | ✅ | ❌ | ❌ |
| 导出数据 | ✅ | ✅ | ❌ | ❌ |

*普通用户只能编辑/删除自己的内容

## 🛠 实现的功能

### 1. 数据库层面

**扩展的角色支持**：
```sql
-- 支持4种角色类型
role: 'user' | 'admin' | 'editor' | 'viewer'

-- 更新的约束检查
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_allowed" 
CHECK (role IN ('user', 'admin', 'editor', 'viewer'));
```

**行级安全策略**：
- 管理员和编辑者可以查看同租户的其他用户
- 普通用户和查看者只能查看自己的信息
- 只有管理员可以修改其他用户的信息

### 2. 权限系统

**核心权限模块** (`src/lib/auth/permissions.ts`)：
- `getUserPermissions()` - 获取用户权限
- `hasPermission()` - 检查特定权限
- `canManageUser()` - 检查用户管理权限
- `canChangeRole()` - 检查角色更改权限

**权限中间件** (`src/lib/auth/middleware.ts`)：
- `withPermissions()` - 通用权限检查
- `withAdminPermissions()` - 管理员权限检查
- `withEditorPermissions()` - 编辑者权限检查

### 3. 管理员界面

**用户管理页面** (`/admin`)：
- 显示所有租户用户列表
- 实时角色更改功能
- 权限可视化显示
- 角色权限说明

**功能特性**：
- 🎨 角色标签颜色区分
- 🔒 权限控制的操作按钮
- 📊 权限对比预览
- 💡 角色描述和说明

### 4. 后端验证

**API路由保护**：
```typescript
// 使用权限中间件保护API
export const PATCH = withAdminRoute(async (request, context, { supabase, profile }) => {
  // 检查是否有权限管理目标用户
  if (!canManageUser(profile.role, target.role)) {
    return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
  }
  // ...
});
```

**权限检查**：
- 用户管理权限验证
- 角色更改权限验证
- 资源访问权限验证

## 🚀 使用方法

### 1. 访问管理员界面

1. 以管理员身份登录
2. 访问 `/admin` 页面
3. 查看"用户权限管理"部分

### 2. 管理用户角色

1. 在用户列表中找到目标用户
2. 使用"Role"下拉菜单选择新角色
3. 点击"Save"按钮保存更改
4. 系统会自动验证权限并更新

### 3. 查看权限说明

1. 在管理员页面下方查看"角色权限说明"
2. 了解每个角色的具体权限范围
3. 根据需要分配合适的角色

## 🔧 开发者指南

### 添加新权限

1. 在 `Permission` 接口中添加新权限字段
2. 更新 `ROLE_PERMISSIONS` 映射
3. 在需要的地方使用 `hasPermission()` 检查

### 保护新的API路由

```typescript
import { withPermissions } from "@/lib/auth/middleware";

export const GET = withPermissions({
  requiredPermissions: ["canViewAnalytics"]
})(async (request) => {
  // 受保护的处理逻辑
});
```

### 在组件中检查权限

```typescript
import { getUserPermissions } from "@/lib/auth/permissions";

function MyComponent({ userRole }) {
  const permissions = getUserPermissions(userRole);
  
  return (
    <div>
      {permissions.canEditContent && (
        <button>编辑内容</button>
      )}
    </div>
  );
}
```

## 📋 数据库迁移

运行以下命令应用新的角色支持：

```bash
# 应用数据库迁移
npx drizzle-kit push:pg
```

或者手动执行 `drizzle/0005_add_new_roles.sql` 文件。

## 🛡 安全特性

1. **行级安全 (RLS)**：数据库层面的访问控制
2. **API权限验证**：每个API调用都经过权限检查
3. **前端权限控制**：UI元素根据权限显示/隐藏
4. **角色继承**：管理员拥有所有下级角色的权限

## 🎉 完成的需求

✅ **用户管理功能**：
- 管理员可以查看、编辑租户下的所有用户
- 提供用户列表界面
- 支持用户信息编辑

✅ **角色权限管理**：
- 支持 admin、editor、user、viewer 四种角色
- 通过下拉框选择和更改用户角色
- 实时保存到数据库

✅ **数据库模型更新**：
- 扩展 role 字段支持新角色类型
- 添加数据库约束验证
- 更新 RLS 策略

✅ **UI 更新**：
- 显示用户角色标签
- 提供角色更改功能
- 添加权限说明界面

✅ **后端权限验证**：
- API 路由权限保护
- 角色更改权限检查
- 数据访问控制

现在您的系统拥有了完整的管理员权限管理功能！🎊
