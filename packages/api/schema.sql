-- Run this in Supabase SQL Editor after creating your project

-- Extends Supabase auth.users with tier info
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                 TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  stripe_customer_id   TEXT UNIQUE,                  -- set on first Stripe checkout
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Usage log: one row per compression call
CREATE TABLE IF NOT EXISTS usage_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  api_key_id     UUID REFERENCES api_keys(id) ON DELETE SET NULL, -- Track which key was used (null if session auth)
  tokens_saved   INT NOT NULL,
  noise_removed  INT NOT NULL,
  input_length   INT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- API keys (for B2B / developer access)
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash    TEXT UNIQUE NOT NULL, -- Storing SHA-256 hash instead of raw key
  name        TEXT NOT NULL DEFAULT 'Default',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- View: compressions this calendar month per user
CREATE OR REPLACE VIEW monthly_usage AS
  SELECT
    user_id,
    COUNT(*)            AS compressions,
    SUM(tokens_saved)   AS tokens_saved_month
  FROM usage_logs
  WHERE created_at >= date_trunc('month', NOW())
  GROUP BY user_id;

-- View: lifetime aggregated stats per user (prevents loading all logs into memory)
CREATE OR REPLACE VIEW lifetime_usage AS
  SELECT
    user_id,
    COUNT(*)            AS total_compressions,
    SUM(tokens_saved)   AS total_tokens_saved,
    SUM(noise_removed)  AS total_noise_removed
  FROM usage_logs
  GROUP BY user_id;

-- RLS
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own profile"   ON profiles   FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users read own logs"      ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own keys"    ON api_keys   FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "service inserts logs"     ON usage_logs FOR INSERT WITH CHECK (true);
