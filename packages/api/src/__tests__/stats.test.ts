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
        single:      vi.fn().mockResolvedValue({ data: MONTHLY, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: MONTHLY, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ data: LOGS, error: null }),
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
    const body = await makeApp().request('/').then(r => r.json()) as any;
    expect(body.totalTokensSaved).toBe(300);
  });

  it('totalCompressions = number of log rows', async () => {
    const body = await makeApp().request('/').then(r => r.json()) as any;
    expect(body.totalCompressions).toBe(2);
  });

  it('dollarsSaved = totalTokens / 1M * 15', async () => {
    const body = await makeApp().request('/').then(r => r.json()) as any;
    const expected = parseFloat(((300 / 1_000_000) * 15).toFixed(2));
    expect(body.dollarsSaved).toBe(expected);
  });

  it('avgNoiseRemoved = mean of noise_removed', async () => {
    const body = await makeApp().request('/').then(r => r.json()) as any;
    expect(body.avgNoiseRemoved).toBe(38); // (30+45)/2 rounded
  });

  it('monthlyCompressions comes from monthly_usage view', async () => {
    const body = await makeApp().request('/').then(r => r.json()) as any;
    expect(body.monthlyCompressions).toBe(MONTHLY.compressions);
    expect(body.monthlyTokensSaved).toBe(MONTHLY.tokens_saved_month);
  });
});
