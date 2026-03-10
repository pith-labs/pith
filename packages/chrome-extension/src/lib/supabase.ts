import { createClient } from '@supabase/supabase-js';

// Injected at build time via Vite define — set in .env
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false }, // we handle persistence via chrome.storage
});
