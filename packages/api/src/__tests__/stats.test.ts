import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

const LOGS = [
  { tokens_saved: 100, noise_removed: 30, created_at: '2025-01-01T00:00:00Z' },
  { tokens_saved: 200, noise_removed: 45, created_at: '2025-02-01T00:00:00Z' },
];
const MONTHLY = { compressions: 5, tokens_saved_month: 300 };

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn((table: string) => {
    if (table === 'monthly_usage') {
      return {
        select:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: MONTHLY, error: null }),
      };
    }
    if (table === 'lifetime_usage') {
      return {
        select:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { 
            total_compressions: 2, 
            total_tokens_saved: 300, 
            total_noise_removed: 75 
          }, 
          error: null 
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      range:  vi.fn().mockResolvedValue({ data: LOGS, count: 2, error: null }),
    };
  });
  return { mockFrom };
});

vi.mock('../db/client.js', () => ({ db: { from: mockFrom } }));
vi.mock('../middleware/auth.js', () => ({
  auth: async (c: any, next: any) => {
    c.set('userId', 'user-test-123');
    c.set('tier', 'free');
    await next();
  },
}));

const { statsRouter } = await import('../routes/stats.js');

function makeApp() {
  const app = new Hono();
  app.route('/', statsRouter);
  return app;
}

describe('GET /v1/stats', () => {
  it('returns all expected fields', async () => {
    const res = await makeApp().request('/');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty('totalTokensSaved');
    expect(body).toHaveProperty('totalCompressions');
    expect(body).toHaveProperty('dollarsSaved');
    expect(body).toHaveProperty('avgNoiseRemoved');
    expect(body).toHaveProperty('monthlyCompressions');
    expect(body).toHaveProperty('monthlyTokensSaved');
  });

  it('totalTokensSaved = sum of all logs', async () => {
    const res = await makeApp().request('/');
    const body = await res.json() as any;
    expect(body.totalTokensSaved).toBe(300);
  });

  it('totalCompressions comes from lifetime_usage', async () => {
    const res = await makeApp().request('/');
    const body = await res.json() as any;
    expect(body.totalCompressions).toBe(2);
  });

  it('dollarsSaved = totalTokens / 1M * 15', async () => {
    const res = await makeApp().request('/');
    const body = await res.json() as any;
    const expected = parseFloat(((300 / 1_000_000) * 15).toFixed(2));
    expect(body.dollarsSaved).toBe(expected);
  });

  it('avgNoiseRemoved = mean of noise_removed', async () => {
    const res = await makeApp().request('/');
    const body = await res.json() as any;
    expect(body.avgNoiseRemoved).toBe(38); // (30+45)/2 rounded
  });

  it('monthlyCompressions comes from monthly_usage view', async () => {
    const res = await makeApp().request('/');
    const body = await res.json() as any;
    expect(body.monthlyCompressions).toBe(MONTHLY.compressions);
    expect(body.monthlyTokensSaved).toBe(MONTHLY.tokens_saved_month);
  });
});

describe('GET /v1/stats/logs', () => {
  it('returns paginated data', async () => {
    const res = await makeApp().request('/logs?page=1&limit=10');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(10);
  });
  
  it('rejects invalid pagination params', async () => {
    const res = await makeApp().request('/logs?page=-1&limit=500');
    expect(res.status).toBe(400); // Zod validation should catch this
  });
});
