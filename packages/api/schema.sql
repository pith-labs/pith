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

-- ML / telemetry: input_sha256 + ciphertext (LGPD) or legacy plaintext when ML_ENCRYPTION_KEY unset
CREATE TABLE IF NOT EXISTS ml_samples (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  input_sha256   TEXT NOT NULL,
  input_text     TEXT, -- legacy plain only when crypto_version=0 and opt-in
  opcode         TEXT, -- legacy plain opcode when crypto_version=0
  noise_removed  SMALLINT NOT NULL,
  is_query       BOOLEAN NOT NULL DEFAULT false,
  sample_kind    TEXT NOT NULL DEFAULT 'user_prompt', -- user_prompt | assistant_response
  source         TEXT NOT NULL DEFAULT 'extension',
  auto_score     SMALLINT,
  auto_verdict   TEXT, -- up | down
  auto_reason    TEXT,
  input_ciphertext   TEXT,
  opcode_ciphertext  TEXT,
  crypto_version     SMALLINT DEFAULT 1
);
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_score SMALLINT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_verdict TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_reason TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS input_ciphertext TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS opcode_ciphertext TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS crypto_version SMALLINT;
ALTER TABLE ml_samples ALTER COLUMN opcode DROP NOT NULL;

CREATE INDEX IF NOT EXISTS ml_samples_user_created_idx ON ml_samples (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_samples_auto_verdict_idx ON ml_samples (auto_verdict, created_at DESC);

ALTER TABLE ml_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ml_samples" ON ml_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service insert ml_samples" ON ml_samples FOR INSERT WITH CHECK (true);

-- Explicit reward loop for ML (thumbs up/down + corrected opcode)
CREATE TABLE IF NOT EXISTS ml_feedback_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sample_id        UUID REFERENCES ml_samples(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  input_sha256     TEXT,
  input_text       TEXT, -- legacy plain when crypto_version=0
  opcode           TEXT,
  corrected_opcode TEXT,
  verdict          TEXT NOT NULL, -- up | down
  reason           TEXT,
  input_ciphertext              TEXT,
  opcode_ciphertext             TEXT,
  corrected_opcode_ciphertext   TEXT,
  crypto_version                SMALLINT DEFAULT 1
);

ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS input_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS opcode_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS corrected_opcode_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS crypto_version SMALLINT;
ALTER TABLE ml_feedback_events ALTER COLUMN opcode DROP NOT NULL;

CREATE INDEX IF NOT EXISTS ml_feedback_user_created_idx ON ml_feedback_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_feedback_sample_idx ON ml_feedback_events (sample_id);

ALTER TABLE ml_feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ml_feedback" ON ml_feedback_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service insert ml_feedback" ON ml_feedback_events FOR INSERT WITH CHECK (true);

-- Runtime-evolvable engine config (generated by ML job, consumed by /v1/optimize)
CREATE TABLE IF NOT EXISTS ml_engine_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version       INT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'candidate', -- candidate | active | archived
  rules_json    JSONB NOT NULL,
  metrics_json  JSONB NOT NULL,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  promoted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ml_engine_config_status_idx ON ml_engine_config (status, version DESC);

ALTER TABLE ml_engine_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read ml_engine_config" ON ml_engine_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "service write ml_engine_config" ON ml_engine_config FOR ALL USING (true) WITH CHECK (true);
