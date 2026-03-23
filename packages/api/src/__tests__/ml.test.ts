import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { PithEngine } from '@pith/core';

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

describe('POST /v1/ml/sample', () => {
  it('accepts learnable telemetry', async () => {
    const base = 'M=Q IO=A2H TAG=_ S=_ ACT=consultar GOAL=_ CSTR=_ PROTO=_ N=tempo E=_ A=hoje P=_ F=DT';
    const output = `${base} CRC=${PithEngine.isaCrc(base)}`;

    const res = await makeApp().request('/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'hello world verbose text here',
        output,
        noiseRemoved: 10,
        isQuery: true,
        includeInputForMl: false,
        kind: 'user_prompt',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; recorded: boolean; learned: boolean; sampleId?: string | null };
    expect(body.ok).toBe(true);
    expect(body.recorded).toBe(true);
    expect(body.learned).toBe(true);
    expect(body).toHaveProperty('sampleId');
  });

  it('blocks suspicious training data', async () => {
    const base = 'M=Q IO=A2H TAG=_ S=_ ACT=consultar GOAL=_ CSTR=_ PROTO=_ N=db E=_ A=_ P=_ F=_';
    const output = `${base} CRC=${PithEngine.isaCrc(base)}`;
    const res = await makeApp().request('/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "show users where name = 'a' OR 1=1; --",
        output,
        noiseRemoved: 20,
        isQuery: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; learned: boolean; reason?: string };
    expect(body.ok).toBe(true);
    expect(body.learned).toBe(false);
    expect(body.reason).toBe('forbidden_pattern');
  });
});

describe('POST /v1/ml/feedback', () => {
  it('accepts valid feedback with corrected opcode', async () => {
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
