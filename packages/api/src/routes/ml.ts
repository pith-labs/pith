import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import crypto from 'node:crypto';
import { PithEngine } from '@pith/core';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/client.js';

const bodySchema = z.object({
  text: z.string().min(1).max(50_000),
  output: z.string().min(1).max(25_000),
  noiseRemoved: z.number().int().min(0).max(100),
  isQuery: z.boolean(),
  includeInputForMl: z.boolean().optional(),
  kind: z.enum(['user_prompt', 'assistant_response']).optional(),
});

const feedbackSchema = z.object({
  sampleId: z.string().uuid().optional(),
  text: z.string().min(1).max(50_000).optional(),
  opcode: z.string().min(1).max(25_000),
  verdict: z.enum(['up', 'down']),
  correctedOpcode: z.string().min(1).max(25_000).optional(),
  reason: z.string().max(240).optional(),
  includeInputForMl: z.boolean().optional(),
});

export const mlRouter = new Hono();

type LearnCheck = { ok: true } | { ok: false; reason: string };
type AutoEval = {
  learn: boolean;
  score: number;
  verdict: 'up' | 'down';
  reason: string;
};

function isValidOpcodeLine(opcode: string): LearnCheck {
  const compact = opcode.trim().replace(/\s+/g, ' ');
  const shape = /^M=(Q|V|C|R) IO=A2H TAG=\S+ S=\S+ ACT=\S+ GOAL=\S+ CSTR=\S+ PROTO=\S+ N=\S+ E=\S+ A=\S+ P=\S+ F=\S+(?: CRC=([A-F0-9]{8}))?$/;
  const match = compact.match(shape);
  if (!match) return { ok: false, reason: 'invalid_opcode_shape' };

  const cut = compact.lastIndexOf(' CRC=');
  if (cut <= 0) return { ok: true };
  const base = compact.slice(0, cut);
  const crc = compact.slice(cut + 5);
  const expected = PithEngine.isaCrc(base);
  if (crc !== expected) return { ok: false, reason: 'crc_mismatch' };
  return { ok: true };
}

function containsForbiddenPatterns(raw: string): boolean {
  const text = raw.toLowerCase();
  const blocked = [
    /\bunion\s+select\b/,
    /\bdrop\s+table\b/,
    /\binformation_schema\b/,
    /\bor\s+1=1\b/,
    /;\s*--/,
    /\bwaitfor\s+delay\b/,
    /\bxp_cmdshell\b/,
    /<script\b/,
    /\bignore\s+(all|previous)\s+instructions\b/,
    /\boverride\s+system\s+prompt\b/,
  ];
  return blocked.some((rx) => rx.test(text));
}

function evaluateLearnability(text: string, output: string, noiseRemoved: number): LearnCheck {
  if (text.trim().length < 12) return { ok: false, reason: 'too_short' };
  if (noiseRemoved < 3) return { ok: false, reason: 'low_signal' };
  if (containsForbiddenPatterns(text)) return { ok: false, reason: 'forbidden_pattern' };
  return isValidOpcodeLine(output);
}

function getOpcodeSlot(opcode: string, key: string): string {
  const compact = opcode.trim().replace(/\s+/g, ' ');
  const m = compact.match(new RegExp(`\\b${key}=([^\\s]+)`));
  return m ? m[1] : '_';
}

function hasAnyToken(text: string, tokens: string[]): boolean {
  return tokens.some((t) => new RegExp(`\\b${t}\\b`, 'i').test(text));
}

function evaluateAutoQuality(text: string, output: string, noiseRemoved: number): AutoEval {
  const input = text.toLowerCase();
  const tag = getOpcodeSlot(output, 'TAG').toLowerCase();
  const act = getOpcodeSlot(output, 'ACT');
  const niches = getOpcodeSlot(output, 'N').toLowerCase();
  const attrs = getOpcodeSlot(output, 'A').toLowerCase();

  let score = 50;
  const notes: string[] = [];

  if (act !== '_') score += 10;
  else notes.push('missing_action');

  if (niches !== '_') score += 10;
  else notes.push('missing_niche');

  if (noiseRemoved >= 8) score += 8;
  else if (noiseRemoved < 3) score -= 10;

  const asksWeather = hasAnyToken(input, ['clima', 'tempo', 'weather']);
  if (asksWeather) {
    if (hasAnyToken(niches, ['clima', 'tempo', 'weather'])) score += 12;
    else score -= 12;
  }

  const asksDateHint = hasAnyToken(input, ['hoje', 'agora', 'amanha', 'amanhã', 'today', 'now', 'tomorrow']);
  if (asksDateHint) {
    if (hasAnyToken(attrs, ['hoje', 'agora', 'amanha', 'today', 'now', 'tomorrow'])) score += 10;
    else score -= 6;
  }

  if (/\?/.test(text) && tag === 'ex') score += 5;
  if (containsForbiddenPatterns(text)) score = 0;

  const bounded = Math.max(0, Math.min(100, score));
  const learn = bounded >= 60;
  return {
    learn,
    score: bounded,
    verdict: learn ? 'up' : 'down',
    reason: learn ? 'auto_quality_pass' : (notes[0] ?? 'auto_quality_low'),
  };
}

// POST /v1/ml/sample — extension / clients: (input, engine output) for future ML + usage_logs
mlRouter.post('/sample', auth, rateLimit, zValidator('json', bodySchema), async (c) => {
  const { text, output, noiseRemoved, isQuery, includeInputForMl, kind } = c.req.valid('json');
  const userId = c.get('userId');
  const apiKeyId = c.get('apiKeyId');

  const tokensSaved = Math.max(0, Math.floor((text.length - output.length) / 4));
  const inputSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const sampleKind = kind ?? 'user_prompt';

  db.from('usage_logs').insert({
    user_id: userId,
    api_key_id: apiKeyId || null,
    tokens_saved: tokensSaved,
    noise_removed: noiseRemoved,
    input_length: text.length,
  }).then();

  const learnability = evaluateLearnability(text, output, noiseRemoved);
  if (!learnability.ok) {
    return c.json({ ok: true, recorded: true, learned: false, reason: learnability.reason });
  }

  const autoEval = evaluateAutoQuality(text, output, noiseRemoved);
  if (!autoEval.learn) {
    return c.json({
      ok: true,
      recorded: true,
      learned: false,
      reason: autoEval.reason,
      autoScore: autoEval.score,
      autoVerdict: autoEval.verdict,
    });
  }

  const { data: insertedSample } = await db.from('ml_samples').insert({
    user_id: userId,
    input_sha256: inputSha256,
    input_text: includeInputForMl ? text : null,
    opcode: output,
    noise_removed: noiseRemoved,
    is_query: isQuery,
    sample_kind: sampleKind,
    source: apiKeyId ? 'api' : 'extension',
    auto_score: autoEval.score,
    auto_verdict: autoEval.verdict,
    auto_reason: autoEval.reason,
  }).select('id').single();

  return c.json({
    ok: true,
    recorded: true,
    learned: true,
    sampleId: insertedSample?.id ?? null,
    autoScore: autoEval.score,
    autoVerdict: autoEval.verdict,
  });
});

// POST /v1/ml/feedback — explicit reward signal (acerto/erro + correção opcional)
mlRouter.post('/feedback', auth, zValidator('json', feedbackSchema), async (c) => {
  const {
    sampleId,
    text,
    opcode,
    verdict,
    correctedOpcode,
    reason,
    includeInputForMl,
  } = c.req.valid('json');
  const userId = c.get('userId');

  const opcodeCheck = isValidOpcodeLine(opcode);
  if (!opcodeCheck.ok) {
    return c.json({ ok: false, error: 'Invalid opcode', reason: opcodeCheck.reason }, 400);
  }
  if (correctedOpcode) {
    const correctedCheck = isValidOpcodeLine(correctedOpcode);
    if (!correctedCheck.ok) {
      return c.json({ ok: false, error: 'Invalid correctedOpcode', reason: correctedCheck.reason }, 400);
    }
  }

  if (text && containsForbiddenPatterns(text)) {
    return c.json({ ok: false, error: 'Forbidden input pattern' }, 400);
  }
  if (reason && containsForbiddenPatterns(reason)) {
    return c.json({ ok: false, error: 'Forbidden reason pattern' }, 400);
  }

  let inputSha256: string | null = null;
  if (text) inputSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');

  const payload: Record<string, unknown> = {
    user_id: userId,
    sample_id: sampleId ?? null,
    input_sha256: inputSha256,
    input_text: text && includeInputForMl ? text : null,
    opcode,
    corrected_opcode: correctedOpcode ?? null,
    verdict,
    reason: reason ?? null,
  };

  const { data: inserted } = await db
    .from('ml_feedback_events')
    .insert(payload)
    .select('id')
    .single();

  return c.json({ ok: true, learned: true, feedbackId: inserted?.id ?? null });
});
