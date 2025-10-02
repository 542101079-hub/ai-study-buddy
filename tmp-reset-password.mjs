import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const userId = 'f8d6e4e0-7616-4235-b8d4-e6da58f8026e';
const { error } = await supabase.auth.admin.updateUserById(userId, {
  password: '123456789'
});

console.log('reset error', error);
