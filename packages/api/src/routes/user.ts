import { Hono } from 'hono';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';

export const userRouter = new Hono();

// GET /v1/user — profile + API key
userRouter.get('/', auth, async (c) => {
  const userId = c.get('userId');

  const [profile, keyRow] = await Promise.all([
    db.from('profiles').select('tier, created_at').eq('id', userId).single(),
    db.from('api_keys').select('key, name, created_at').eq('user_id', userId).maybeSingle(),
  ]);

  if (!profile.data) return c.json({ error: 'User not found' }, 404);

  return c.json({
    id:   userId,
    tier: profile.data.tier,
    apiKey: keyRow.data?.key ?? null,
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
  const { data } = await db
    .from('api_keys')
    .insert({ user_id: userId, name: 'Default' })
    .select('key')
    .single();

  return c.json({ key: data?.key });
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
    tokens_saved:  tokensSaved,
    noise_removed: 0,
    input_length:  0,
  });

  return c.json({ synced: true });
});
