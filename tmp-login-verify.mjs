import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.auth.signInWithPassword({
  email: '1234@qq.com',
  password: '123456789',
});

console.log('data', data);
console.log('error', error);
