import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client.js';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    tier: 'free' | 'pro';
    apiKeyId?: string; // Set only if authenticated via API key
  }
}

// Verifies either a Supabase JWT (browser users) or an API key (B2B/dev)
export const auth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

  const token = authHeader.replace('Bearer ', '');

  // Try API key first (hex 64 chars)
  if (/^[a-f0-9]{64}$/.test(token)) {
    // Hash incoming token to check against the DB since we don't store plain text keys
    const crypto = await import('node:crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: keyRow } = await db
      .from('api_keys')
      .select('id, user_id, profiles(tier)')
      .eq('key_hash', tokenHash)
      .single();

    if (!keyRow) return c.json({ error: 'Invalid API key' }, 401);

    c.set('userId', keyRow.user_id);
    c.set('apiKeyId', keyRow.id);
    c.set('tier', (keyRow.profiles as any)?.tier ?? 'free');
    return next();
  }

  // Otherwise treat as Supabase JWT
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

  const { data: profile } = await db
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  c.set('userId', user.id);
  c.set('tier', profile?.tier ?? 'free');
  return next();
});
