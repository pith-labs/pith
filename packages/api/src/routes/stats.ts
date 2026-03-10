import { Hono } from 'hono';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';

export const statsRouter = new Hono();

// GET /v1/stats — lifetime savings for the authenticated user
statsRouter.get('/', auth, async (c) => {
  const userId = c.get('userId');

  const [lifetime, monthly] = await Promise.all([
    db.from('usage_logs')
      .select('tokens_saved, noise_removed, created_at')
      .eq('user_id', userId),
    db.from('monthly_usage')
      .select('compressions, tokens_saved_month')
      .eq('user_id', userId)
      .single(),
  ]);

  const logs = lifetime.data ?? [];
  const totalTokens = logs.reduce((s, r) => s + r.tokens_saved, 0);
  const totalCompressions = logs.length;
  const avgNoise = totalCompressions > 0
    ? Math.round(logs.reduce((s, r) => s + r.noise_removed, 0) / totalCompressions)
    : 0;

  return c.json({
    totalTokensSaved:    totalTokens,
    totalCompressions,
    avgNoiseRemoved:     avgNoise,
    dollarsSaved:        parseFloat(((totalTokens / 1_000_000) * 15).toFixed(2)),
    monthlyCompressions: monthly.data?.compressions ?? 0,
    monthlyTokensSaved:  monthly.data?.tokens_saved_month ?? 0,
  });
});
