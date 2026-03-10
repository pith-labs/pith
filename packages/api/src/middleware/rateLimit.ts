import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.js';

const LIMITS = {
  free: 100,  // compressions per month
  pro: Infinity,
} as const;

export const rateLimit = createMiddleware(async (c, next) => {
  const tier   = c.get('tier');
  const userId = c.get('userId');
  const limit  = LIMITS[tier];

  if (limit === Infinity) return next();

  const { data } = await db
    .from('monthly_usage')
    .select('compressions')
    .eq('user_id', userId)
    .single();

  const used = data?.compressions ?? 0;

  if (used >= limit) {
    return c.json({
      error: 'Monthly limit reached',
      used,
      limit,
      upgrade: 'https://pith.app/upgrade',
    }, 429);
  }

  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(limit - used - 1));
  return next();
});
