import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from('profiles')
  .select('id, tenant_id, role, username, full_name')
  .eq('id', 'f8d6e4e0-7616-4235-b8d4-e6da58f8026e')
  .maybeSingle();
console.log('profile', data);
console.log('error', error);
