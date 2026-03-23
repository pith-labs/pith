import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

export function mlEncryptionConfigured(): boolean {
  return !!process.env.ML_ENCRYPTION_KEY?.trim();
}

function getKey(): Buffer | null {
  const raw = process.env.ML_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.scryptSync(raw, 'pith-ml-v1', 32);
}

export function encryptMlUtf8(plain: string): string {
  const key = getKey();
  if (!key) throw new Error('ML_ENCRYPTION_KEY required');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptMlUtf8(b64: string): string {
  const key = getKey();
  if (!key) throw new Error('ML_ENCRYPTION_KEY required');
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
