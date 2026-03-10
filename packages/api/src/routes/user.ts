import { Hono } from 'hono';
import crypto from 'node:crypto';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';

export const userRouter = new Hono();

// GET /v1/user — profile + API key
userRouter.get('/', auth, async (c) => {
  const userId = c.get('userId');

  const [profile, keyRow] = await Promise.all([
    db.from('profiles').select('tier, created_at').eq('id', userId).single(),
    db.from('api_keys').select('name, created_at').eq('user_id', userId).maybeSingle(),
  ]);

  if (!profile.data) return c.json({ error: 'User not found' }, 404);

  return c.json({
    id:   userId,
    tier: profile.data.tier,
    hasApiKey: !!keyRow.data, // Don't return the key itself since we only store the hash
    apiKeyName: keyRow.data?.name ?? null,
  });
});

// POST /v1/user/api-key — generate or rotate API key
userRouter.post('/api-key', auth, async (c) => {
  const userId = c.get('userId');
  const tier   = c.get('tier');

  if (tier === 'free') {
    return c.json({ error: 'API key access requires Pro plan', upgrade: 'https://pith.app/upgrade' }, 403);
  }

  // Upsert: delete existing + create new (rotation)
  await db.from('api_keys').delete().eq('user_id', userId);
  
  // Generate secure 32-byte (64 chars) token and its SHA-256 hash
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await db
    .from('api_keys')
    .insert({ user_id: userId, name: 'Default', key_hash: keyHash });

  // Return the raw key ONCE for the user to copy
  return c.json({ key: rawKey });
});

// PATCH /v1/user/sync — sync token savings from local storage (cross-device)
userRouter.patch('/sync', auth, async (c) => {
  const userId = c.get('userId');
  const { tokensSaved } = await c.req.json<{ tokensSaved: number }>();

  if (typeof tokensSaved !== 'number' || tokensSaved < 0) {
    return c.json({ error: 'Invalid tokensSaved' }, 400);
  }

  await db.from('usage_logs').insert({
    user_id:       userId,
    api_key_id:    null, // Cross-device sync is browser session based, not API key based
    tokens_saved:  tokensSaved,
    noise_removed: 0,
    input_length:  0,
  });

  return c.json({ synced: true });
});
