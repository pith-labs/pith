import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_KEY!; // service role — server only

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
}

export const db = createClient(url, key, {
  auth: { persistSession: false },
});
