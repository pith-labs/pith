import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

const { mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn((table: string) => {
    if (table === 'api_keys') return {
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      single:      vi.fn().mockResolvedValue({
        data: { user_id: 'user-123', profiles: { tier: 'pro' } },
        error: null,
      }),
    };
    // profiles
    return {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tier: 'free' }, error: null }),
    };
  });
  return { mockFrom, mockGetUser };
});

vi.mock('../db/client.js', () => ({ db: { from: mockFrom } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const { auth } = await import('../middleware/auth.js');

function makeApp() {
  const app = new Hono();
  app.use('*', auth);
  app.get('/', (c) => c.json({ userId: c.get('userId'), tier: c.get('tier') }));
  return app;
}

describe('Auth middleware — JWT path', () => {
  it('accepts valid JWT and sets userId + tier', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-jwt-123' } }, error: null });

    const res = await makeApp().request('/', {
      headers: { Authorization: 'Bearer valid.jwt.token' },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.userId).toBe('user-jwt-123');
    expect(body.tier).toBe('free');
  });

  it('rejects request with no Authorization header', async () => {
    const res = await makeApp().request('/');
    expect(res.status).toBe(401);
  });

  it('rejects invalid JWT (Supabase returns error)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid JWT' } });

    const res = await makeApp().request('/', {
      headers: { Authorization: 'Bearer bad.token' },
    });
    expect(res.status).toBe(401);
  });
});

describe('Auth middleware — API key path', () => {
  it('accepts valid 64-char hex key', async () => {
    const res = await makeApp().request('/', {
      headers: { Authorization: `Bearer ${'a'.repeat(64)}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.userId).toBe('user-123');
    expect(body.tier).toBe('pro');
  });

  it('rejects invalid API key not in DB', async () => {
    mockFrom.mockImplementationOnce(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      single:      vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }));

    const res = await makeApp().request('/', {
      headers: { Authorization: `Bearer ${'b'.repeat(64)}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toMatch(/API key/i);
  });
});
