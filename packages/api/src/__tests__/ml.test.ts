import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

vi.hoisted(() => {
  process.env.ML_ENCRYPTION_KEY = 'a'.repeat(64);
});

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn((table: string) => {
    const q: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { compressions: 0 }, error: null }),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    if (table === 'ml_samples') q.single = vi.fn().mockResolvedValue({ data: { id: 'sample-id-1' }, error: null });
    if (table === 'ml_feedback_events') q.single = vi.fn().mockResolvedValue({ data: { id: 'feedback-id-1' }, error: null });
    return q;
  });
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

const { mlRouter } = await import('../routes/ml.js');

function makeApp() {
  const app = new Hono();
  app.route('/', mlRouter);
  return app;
}

describe('POST /v1/ml/feedback', () => {
  it('accepts valid feedback with corrected opcode', async () => {
    const { PithEngine } = await import('@pith/core');
    const base = 'M=Q IO=A2H TAG=ex S=_ ACT=consultar GOAL=_ CSTR=_ PROTO=_ N=clima E=_ A=hoje P=_ F=DT';
    const opcode = `${base} CRC=${PithEngine.isaCrc(base)}`;
    const correctedBase = 'M=Q IO=A2H TAG=ex S=_ ACT=consultar GOAL=_ CSTR=_ PROTO=_ N=tempo E=_ A=hoje P=_ F=DT';
    const correctedOpcode = `${correctedBase} CRC=${PithEngine.isaCrc(correctedBase)}`;

    const res = await makeApp().request('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opcode,
        correctedOpcode,
        verdict: 'down',
        reason: 'niche should be tempo',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; learned: boolean; feedbackId?: string | null };
    expect(body.ok).toBe(true);
    expect(body.learned).toBe(true);
    expect(body).toHaveProperty('feedbackId');
  });
});
