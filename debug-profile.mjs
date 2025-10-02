#!/usr/bin/env node

/**
 * 调试和修复用户profile问题的脚本
 * 使用方法: node debug-profile.mjs [user-email]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 缺少必要的环境变量:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function findUserByEmail(email) {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    return users.find(user => user.email === email);
  } catch (error) {
    console.error('查找用户失败:', error.message);
    return null;
  }
}

async function checkProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, tenant_id, username, full_name, avatar_url, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('检查profile失败:', error.message);
    return null;
  }
}

async function getDefaultTenant() {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'default')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取默认tenant失败:', error.message);
    return null;
  }
}

async function createProfile(userId, userEmail, userName, tenantId) {
  try {
    const baseUsername = userName || userEmail.split('@')[0] || 'learner';
    const normalizedUsername = baseUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '')
      .slice(0, 24);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        tenant_id: tenantId,
        username: normalizedUsername,
        full_name: userName,
        role: 'user'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('创建profile失败:', error.message);
    return null;
  }
}

async function main() {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('❌ 请提供用户邮箱地址');
    console.error('   使用方法: node debug-profile.mjs user@example.com');
    process.exit(1);
  }

  console.log(`🔍 正在查找用户: ${userEmail}`);

  // 1. 查找用户
  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.error('❌ 未找到该邮箱对应的用户');
    process.exit(1);
  }

  console.log(`✅ 找到用户: ${user.id}`);
  console.log(`   邮箱: ${user.email}`);
  console.log(`   姓名: ${user.user_metadata?.full_name || '未设置'}`);

  // 2. 检查profile
  const profile = await checkProfile(user.id);
  if (profile) {
    console.log('✅ 用户已有profile:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   租户ID: ${profile.tenant_id}`);
    console.log(`   用户名: ${profile.username}`);
    console.log(`   全名: ${profile.full_name || '未设置'}`);
    console.log(`   角色: ${profile.role}`);
    return;
  }

  console.log('⚠️  用户没有profile，正在创建...');

  // 3. 获取默认tenant
  const defaultTenant = await getDefaultTenant();
  if (!defaultTenant) {
    console.error('❌ 未找到默认tenant，无法创建profile');
    process.exit(1);
  }

  console.log(`📁 使用默认tenant: ${defaultTenant.name} (${defaultTenant.id})`);

  // 4. 创建profile
  const newProfile = await createProfile(
    user.id,
    user.email,
    user.user_metadata?.full_name,
    defaultTenant.id
  );

  if (newProfile) {
    console.log('✅ 成功创建profile:');
    console.log(`   ID: ${newProfile.id}`);
    console.log(`   租户ID: ${newProfile.tenant_id}`);
    console.log(`   用户名: ${newProfile.username}`);
    console.log(`   全名: ${newProfile.full_name || '未设置'}`);
    console.log(`   角色: ${newProfile.role}`);
  } else {
    console.error('❌ 创建profile失败');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 脚本执行失败:', error.message);
  process.exit(1);
});
