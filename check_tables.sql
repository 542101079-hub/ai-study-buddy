-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_plans', 'daily_tasks', 'learning_goals', 'learning_plans', 'learning_tasks');

-- 检查 daily_plans 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'daily_plans' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查 daily_tasks 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'daily_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;
