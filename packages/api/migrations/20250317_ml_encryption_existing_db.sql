-- Banco já existente: colunas ML criptografadas + opcode opcional.
-- Rode no SQL Editor do Supabase (ou psql). Idempotente (IF NOT EXISTS / DROP NOT NULL).

BEGIN;

-- ── ml_samples ───────────────────────────────────────────────────────────────
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_score SMALLINT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_verdict TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS auto_reason TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS input_ciphertext TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS opcode_ciphertext TEXT;
ALTER TABLE ml_samples ADD COLUMN IF NOT EXISTS crypto_version SMALLINT;

ALTER TABLE ml_samples ALTER COLUMN opcode DROP NOT NULL;

-- Linhas antigas só com opcode em texto: marcar como legado (evita confusão com DEFAULT 1)
UPDATE ml_samples
SET crypto_version = 0
WHERE (opcode_ciphertext IS NULL OR btrim(opcode_ciphertext) = '')
  AND opcode IS NOT NULL;

-- ── ml_feedback_events ───────────────────────────────────────────────────────
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS input_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS opcode_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS corrected_opcode_ciphertext TEXT;
ALTER TABLE ml_feedback_events ADD COLUMN IF NOT EXISTS crypto_version SMALLINT;

ALTER TABLE ml_feedback_events ALTER COLUMN opcode DROP NOT NULL;

UPDATE ml_feedback_events
SET crypto_version = 0
WHERE (opcode_ciphertext IS NULL OR btrim(opcode_ciphertext) = '')
  AND opcode IS NOT NULL;

ALTER TABLE ml_samples ALTER COLUMN crypto_version SET DEFAULT 1;
ALTER TABLE ml_feedback_events ALTER COLUMN crypto_version SET DEFAULT 1;

COMMIT;
