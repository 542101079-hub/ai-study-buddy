import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: signIn, error: signInError } = await supabaseAnon.auth.signInWithPassword({ email: '1234@qq.com', password: '123456789' });
console.log('signIn error', signInError);
console.log('token', signIn.session?.access_token);

const token = signIn.session?.access_token;
if (!token) {
  console.log('no token');
  process.exit(0);
}

const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${signIn.user.id}`, {
  headers: {
    apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  }
});
console.log('status', res.status);
const text = await res.text();
console.log('body', text);
