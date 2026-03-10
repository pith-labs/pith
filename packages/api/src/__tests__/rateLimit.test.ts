import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

const { mockFrom } = vi.hoisted(() => {
  let _compressions = 0;
  const mockFrom = vi.fn((_table: string) => ({
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    single:      vi.fn().mockImplementation(() =>
      Promise.resolve({ data: { compressions: _compressions, tokens_saved_month: _compressions * 50 }, error: null })
    ),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: { compressions: _compressions, tokens_saved_month: _compressions * 50 }, error: null })
    ),
  }));
  return { mockFrom, setCompressions: (n: number) => { _compressions = n; } };
});

vi.mock('../db/client.js', () => ({ db: { from: mockFrom } }));

const { rateLimit } = await import('../middleware/rateLimit.js');

function makeApp(tier: 'free' | 'pro', compressions: number) {
  // Mutate mock value
  mockFrom.mockImplementation((_table: string) => ({
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: { compressions, tokens_saved_month: compressions * 50 }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { compressions, tokens_saved_month: compressions * 50 }, error: null }),
  }));

  const app = new Hono();
  app.use('*', async (c, next) => { c.set('userId', 'user-123'); c.set('tier', tier); await next(); });
  app.use('*', rateLimit);
  app.get('/', (c) => c.json({ ok: true }));
  return app;
}

describe('Rate limiting middleware', () => {
  it('pro tier is never blocked regardless of usage', async () => {
    const res = await makeApp('pro', 99999).request('/');
    expect(res.status).toBe(200);
  });

  it('free tier under limit (50/100) passes', async () => {
    const res = await makeApp('free', 50).request('/');
    expect(res.status).toBe(200);
  });

  it('free tier at exactly 100 is blocked (429)', async () => {
    const res = await makeApp('free', 100).request('/');
    expect(res.status).toBe(429);
    const body = await res.json() as any;
    expect(body.error).toMatch(/limit/i);
    expect(body.used).toBe(100);
    expect(body.limit).toBe(100);
    expect(body.upgrade).toBeTruthy();
  });

  it('sets X-RateLimit headers for free tier', async () => {
    const res = await makeApp('free', 30).request('/');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('69'); // 100 - 30 - 1
  });
});
