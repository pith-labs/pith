import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PithEngine } from '@pith/core';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/client.js';

const engine = new PithEngine();

const schema = z.object({
  text: z.string().min(1).max(50_000),
});

export const optimizeRouter = new Hono();

// POST /v1/optimize  — authenticated + rate limited
optimizeRouter.post('/', auth, rateLimit, zValidator('json', schema), async (c) => {
  const { text } = c.req.valid('json');
  const userId   = c.get('userId');

  const { output, noiseRemoved, isQuery } = engine.optimize(text);
  const tokensSaved = Math.max(0, Math.floor((text.length - output.length) / 4));

  // Log usage async (don't block response)
  db.from('usage_logs').insert({
    user_id:      userId,
    tokens_saved: tokensSaved,
    noise_removed: noiseRemoved,
    input_length:  text.length,
  }).then();

  return c.json({ output, noiseRemoved, tokensSaved, isQuery });
});

// POST /v1/optimize/anonymous — no auth, no storage, for onboarding/demo
optimizeRouter.post('/anonymous', zValidator('json', schema), async (c) => {
  const { text } = c.req.valid('json');
  const { output, noiseRemoved, isQuery } = engine.optimize(text);
  const tokensSaved = Math.max(0, Math.floor((text.length - output.length) / 4));
  return c.json({ output, noiseRemoved, tokensSaved, isQuery });
});
