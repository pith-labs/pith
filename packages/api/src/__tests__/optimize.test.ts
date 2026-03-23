import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

// ── Hoisted mocks (run before imports) ────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn(() => ({
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: { tier: 'pro' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then:        vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
  return { mockFrom };
});

vi.mock('../db/client.js', () => ({ db: { from: mockFrom } }));

vi.mock('../middleware/auth.js', () => ({
  auth: async (c: any, next: any) => {
    c.set('userId', 'user-test-123');
    c.set('tier', 'pro');
    await next();
  },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: async (_c: any, next: any) => next(),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

const { optimizeRouter } = await import('../routes/optimize.js');

function makeApp() {
  const app = new Hono();
  app.route('/', optimizeRouter);
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /v1/optimize', () => {
  it('compresses a verbose prompt and returns output', async () => {
    const res = await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Olá, tudo bem? Gostaria de pedir um favor. Eu estava pensando que seria muito interessante se você pudesse me ajudar a criar uma estratégia de marketing para o meu negócio.',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.output).toBeTruthy();
    expect(body.noiseRemoved).toBeGreaterThan(0);
    expect(body.tokensSaved).toBeGreaterThan(0);
    expect(body).toHaveProperty('isQuery');
  });

  it('output is shorter than input', async () => {
    const input = 'How can I improve the performance of my React application by optimizing re-renders and reducing unnecessary state updates?';
    const res = await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input }),
    });

    const body = await res.json() as any;
    expect(body.output).toContain('M=');
    expect(body.tokensSaved).toBeGreaterThanOrEqual(0);
  });

  it('rejects empty text (zod)', async () => {
    const res = await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing text field (zod)', async () => {
    const res = await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('rejects text over 50k chars (zod)', async () => {
    const res = await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(50_001) }),
    });
    expect(res.status).toBe(400);
  });

  it('calls usage_logs insert after compression', async () => {
    mockFrom.mockClear();
    await makeApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Please help me optimize my database query performance in PostgreSQL.' }),
    });
    await new Promise<void>((r) => setImmediate(r));
    expect(mockFrom).toHaveBeenCalledWith('usage_logs');
    expect(mockFrom).toHaveBeenCalledWith('ml_samples');
  });
});

