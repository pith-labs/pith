import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

const PROFILE  = { tier: 'free', created_at: '2025-01-01T00:00:00Z' };
const API_KEY  = { key: 'a'.repeat(64), name: 'Default', user_id: 'user-test-123' };

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn((table: string) => {
    if (table === 'profiles') return {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: PROFILE, error: null }),
    };
    if (table === 'api_keys') return {
      select:      vi.fn().mockReturnThis(),
      insert:      vi.fn().mockReturnThis(),
      delete:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      single:      vi.fn().mockResolvedValue({ data: API_KEY, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: API_KEY, error: null }),
    };
    return {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
  return { mockFrom };
});

vi.mock('../db/client.js', () => ({ db: { from: mockFrom } }));
vi.mock('../middleware/auth.js', () => ({
  auth: async (c: any, next: any) => {
    c.set('userId', 'user-test-123');
    c.set('tier', c.get('tier') ?? 'free');
    await next();
  },
}));

const { userRouter } = await import('../routes/user.js');

function makeApp(tier: 'free' | 'pro' = 'free') {
  const app = new Hono();
  app.use('*', async (c, next) => { c.set('userId', 'user-test-123'); c.set('tier', tier); await next(); });
  app.route('/', userRouter);
  return app;
}

describe('GET /v1/user', () => {
  it('returns profile and apiKey', async () => {
    const res = await makeApp().request('/');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe('user-test-123');
    expect(body.tier).toBe('free');
    expect(body.apiKey).toBe(API_KEY.key);
  });
});

describe('POST /v1/user/api-key', () => {
  it('blocks free tier with 403 and upgrade URL', async () => {
    const res = await makeApp('free').request('/api-key', { method: 'POST' });
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.error).toMatch(/Pro/i);
    expect(body.upgrade).toBeTruthy();
  });

  it('allows pro tier to generate a key', async () => {
    const res = await makeApp('pro').request('/api-key', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.key).toBeTruthy();
  });
});

describe('PATCH /v1/user/sync', () => {
  it('syncs positive tokensSaved', async () => {
    const res = await makeApp('pro').request('/sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSaved: 500 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.synced).toBe(true);
  });

  it('rejects negative tokensSaved', async () => {
    const res = await makeApp('pro').request('/sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSaved: -10 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects non-numeric tokensSaved', async () => {
    const res = await makeApp('pro').request('/sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSaved: 'lots' }),
    });
    expect(res.status).toBe(400);
  });
});
