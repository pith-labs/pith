-- Fix Supabase linter findings on existing DB:
-- - lifetime_usage: remove SECURITY DEFINER (force SECURITY INVOKER)
-- - usage_logs / api_keys: ensure RLS is enabled in schema exposed to PostgREST

BEGIN;

-- Views
CREATE OR REPLACE VIEW public.monthly_usage AS
  SELECT
    user_id,
    COUNT(*)            AS compressions,
    SUM(tokens_saved)   AS tokens_saved_month
  FROM public.usage_logs
  WHERE created_at >= date_trunc('month', NOW())
  GROUP BY user_id;

CREATE OR REPLACE VIEW public.lifetime_usage AS
  SELECT
    user_id,
    COUNT(*)            AS total_compressions,
    SUM(tokens_saved)   AS total_tokens_saved,
    SUM(noise_removed)  AS total_noise_removed
  FROM public.usage_logs
  GROUP BY user_id;

-- Supabase linter: this view must not run with SECURITY DEFINER semantics
ALTER VIEW public.lifetime_usage SET (security_invoker = on);

-- RLS
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys   ENABLE ROW LEVEL SECURITY;

-- Policies (recreated with explicit schema to avoid search_path drift)
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users read own logs" ON public.usage_logs;
CREATE POLICY "users read own logs" ON public.usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service inserts logs" ON public.usage_logs;
CREATE POLICY "service inserts logs" ON public.usage_logs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "users manage own keys" ON public.api_keys;
CREATE POLICY "users manage own keys" ON public.api_keys
  FOR ALL
  USING (auth.uid() = user_id);

COMMIT;

