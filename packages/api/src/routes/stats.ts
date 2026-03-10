import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';

export const statsRouter = new Hono();

// GET /v1/stats — lifetime savings for the authenticated user
statsRouter.get('/', auth, async (c) => {
  const userId = c.get('userId');

  const [lifetime, monthly] = await Promise.all([
    db.from('lifetime_usage')
      .select('total_compressions, total_tokens_saved, total_noise_removed')
      .eq('user_id', userId)
      .maybeSingle(),
    db.from('monthly_usage')
      .select('compressions, tokens_saved_month')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const totalTokens = lifetime.data?.total_tokens_saved ?? 0;
  const totalCompressions = lifetime.data?.total_compressions ?? 0;
  const totalNoise = lifetime.data?.total_noise_removed ?? 0;

  const avgNoise = totalCompressions > 0 ? Math.round(totalNoise / totalCompressions) : 0;

  return c.json({
    totalTokensSaved:    totalTokens,
    totalCompressions:   totalCompressions,
    avgNoiseRemoved:     avgNoise,
    dollarsSaved:        parseFloat(((totalTokens / 1_000_000) * 15).toFixed(2)),
    monthlyCompressions: monthly.data?.compressions ?? 0,
    monthlyTokensSaved:  monthly.data?.tokens_saved_month ?? 0,
  });
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// GET /v1/stats/logs — paginated recent usage history
statsRouter.get('/logs', auth, zValidator('query', paginationSchema), async (c) => {
  const userId = c.get('userId');
  const { page, limit } = c.req.valid('query');

  const offset = (page - 1) * limit;

  // using estimated count for performance if logs get massive, or exact for precision
  const { data, count, error } = await db
    .from('usage_logs')
    .select(`
      id,
      tokens_saved,
      noise_removed,
      input_length,
      created_at,
      api_keys(name)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }

  return c.json({
    data: data.map(log => ({
      ...log,
      api_key_name: (log.api_keys as any)?.name ?? null,
      api_keys: undefined // remove nested object for flatter response
    })),
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  });
});
