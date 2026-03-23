import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import crypto from 'node:crypto';
import { PithEngine } from '@pith/core';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { encryptMlUtf8, decryptMlUtf8, mlEncryptionConfigured } from '../lib/mlCrypto.js';

const feedbackSchema = z.object({
  sampleId: z.string().uuid().optional(),
  text: z.string().min(1).max(50_000).optional(),
  opcode: z.string().min(1).max(25_000),
  verdict: z.enum(['up', 'down']),
  correctedOpcode: z.string().min(1).max(25_000).optional(),
  reason: z.string().max(240).optional(),
  includeInputForMl: z.boolean().optional(),
});
const jobSchema = z.object({
  promote: z.boolean().optional(),
});
const promoteSchema = z.object({
  configId: z.string().uuid(),
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

function parseCsvSlot(opcode: string, key: string): string[] {
  const raw = getOpcodeSlot(opcode, key);
  if (!raw || raw === '_') return [];
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
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

type EngineRules = {
  stopNiches: string[];
  defaultActionForTag: Record<string, string>;
};

function buildRulesFromSamples(
  samples: Array<{ opcode: string; auto_score: number | null; auto_verdict: string | null }>,
  feedback: Array<{ verdict: string; opcode: string; corrected_opcode: string | null }>
): { rules: EngineRules; metrics: Record<string, unknown> } {
  const exActionFreq = new Map<string, number>();
  let autoScoreSum = 0;
  let autoScoreCount = 0;
  let upCount = 0;
  let downCount = 0;

  for (const s of samples) {
    if (s.auto_verdict === 'up') upCount++;
    if (s.auto_verdict === 'down') downCount++;
    if (typeof s.auto_score === 'number') {
      autoScoreSum += s.auto_score;
      autoScoreCount++;
    }
    const tag = getOpcodeSlot(s.opcode, 'TAG').toLowerCase();
    const act = getOpcodeSlot(s.opcode, 'ACT');
    if (tag === 'ex' && act && act !== '_') {
      exActionFreq.set(act, (exActionFreq.get(act) || 0) + 1);
    }
  }

  let defaultExAction = 'consultar';
  let maxFreq = 0;
  for (const [act, freq] of exActionFreq.entries()) {
    if (freq > maxFreq) {
      maxFreq = freq;
      defaultExAction = act;
    }
  }

  const stopFreq = new Map<string, number>();
  for (const f of feedback) {
    if (f.verdict !== 'down' || !f.corrected_opcode) continue;
    const oldN = parseCsvSlot(f.opcode, 'N').map((x) => x.toLowerCase());
    const newN = new Set(parseCsvSlot(f.corrected_opcode, 'N').map((x) => x.toLowerCase()));
    for (const n of oldN) {
      if (!newN.has(n)) stopFreq.set(n, (stopFreq.get(n) || 0) + 1);
    }
  }
  const stopNiches = [...stopFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k]) => k);

  const rules: EngineRules = {
    stopNiches,
    defaultActionForTag: { ex: defaultExAction },
  };
  const metrics = {
    sampleCount: samples.length,
    feedbackCount: feedback.length,
    autoUp: upCount,
    autoDown: downCount,
    avgAutoScore: autoScoreCount ? Math.round(autoScoreSum / autoScoreCount) : null,
  };
  return { rules, metrics };
}

function resolveSampleOpcode(row: {
  opcode: string | null;
  opcode_ciphertext: string | null;
  crypto_version: number | null;
}): string | null {
  const ver = row.crypto_version ?? (row.opcode_ciphertext ? 1 : 0);
  if (ver === 1 && row.opcode_ciphertext) {
    if (!mlEncryptionConfigured()) return null;
    try {
      return decryptMlUtf8(row.opcode_ciphertext);
    } catch {
      return null;
    }
  }
  return row.opcode && String(row.opcode).length ? row.opcode : null;
}

function resolveFeedbackRow(f: {
  verdict: string;
  opcode: string | null;
  opcode_ciphertext: string | null;
  corrected_opcode: string | null;
  corrected_opcode_ciphertext: string | null;
  crypto_version: number | null;
}): { verdict: string; opcode: string; corrected_opcode: string | null } | null {
  let op: string | null = null;
  const ver = f.crypto_version ?? (f.opcode_ciphertext ? 1 : 0);
  if (ver === 1 && f.opcode_ciphertext) {
    if (!mlEncryptionConfigured()) return null;
    try {
      op = decryptMlUtf8(f.opcode_ciphertext);
    } catch {
      return null;
    }
  } else {
    op = f.opcode && String(f.opcode).length ? f.opcode : null;
  }
  if (!op) return null;
  let corr: string | null = f.corrected_opcode;
  if (ver === 1 && f.corrected_opcode_ciphertext) {
    if (!mlEncryptionConfigured()) return null;
    try {
      corr = decryptMlUtf8(f.corrected_opcode_ciphertext);
    } catch {
      corr = null;
    }
  }
  return { verdict: f.verdict, opcode: op, corrected_opcode: corr };
}

export async function insertMlTelemetrySample(params: {
  userId: string;
  apiKeyId: string | null;
  text: string;
  output: string;
  noiseRemoved: number;
  isQuery: boolean;
  sampleKind?: 'user_prompt' | 'assistant_response';
  source?: 'extension' | 'api';
  includeInputForMl?: boolean;
}): Promise<{
  id: string | null;
  learned: boolean;
  reason?: string;
  autoScore: number;
  autoVerdict: 'up' | 'down';
  autoReason: string;
}> {
  const {
    userId,
    apiKeyId,
    text,
    output,
    noiseRemoved,
    isQuery,
    sampleKind = 'user_prompt',
    source: sourceOverride,
    includeInputForMl = false,
  } = params;

  const learnability = evaluateLearnability(text, output, noiseRemoved);
  const autoEval = evaluateAutoQuality(text, output, noiseRemoved);
  const learned = learnability.ok && autoEval.learn;
  const inputSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const autoReason = !learnability.ok ? learnability.reason : autoEval.reason;

  const base = {
    user_id: userId,
    input_sha256: inputSha256,
    noise_removed: noiseRemoved,
    is_query: isQuery,
    sample_kind: sampleKind,
    source: sourceOverride ?? (apiKeyId ? 'api' : 'extension'),
    auto_score: autoEval.score,
    auto_verdict: autoEval.verdict,
    auto_reason: autoReason,
  };

  const row = mlEncryptionConfigured()
    ? {
        ...base,
        input_text: null,
        opcode: null,
        input_ciphertext: encryptMlUtf8(text),
        opcode_ciphertext: encryptMlUtf8(output),
        crypto_version: 1,
      }
    : {
        ...base,
        input_text: includeInputForMl ? text : null,
        opcode: output,
        input_ciphertext: null,
        opcode_ciphertext: null,
        crypto_version: 0,
      };

  const { data: insertedSample, error: insertErr } = await db
    .from('ml_samples')
    .insert(row)
    .select('id')
    .single();

  if (insertErr) throw new Error(insertErr.message);

  return {
    id: insertedSample?.id ?? null,
    learned,
    reason: learned ? undefined : (!learnability.ok ? learnability.reason : autoEval.reason),
    autoScore: autoEval.score,
    autoVerdict: autoEval.verdict,
    autoReason,
  };
}

export async function compileMlConfigJob(opts: { createdBy: string | null; promote: boolean }) {
  const [{ data: samples }, { data: feedback }, { data: lastCfg }] = await Promise.all([
    db
      .from('ml_samples')
      .select('opcode, opcode_ciphertext, crypto_version, auto_score, auto_verdict')
      .order('created_at', { ascending: false })
      .limit(1000),
    db
      .from('ml_feedback_events')
      .select(
        'verdict, opcode, opcode_ciphertext, corrected_opcode, corrected_opcode_ciphertext, crypto_version'
      )
      .order('created_at', { ascending: false })
      .limit(1000),
    db
      .from('ml_engine_config')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rowsS = (samples ?? [])
    .map((r) => {
      const opcode = resolveSampleOpcode(r as any);
      if (!opcode) return null;
      return {
        opcode,
        auto_score: (r as any).auto_score as number | null,
        auto_verdict: (r as any).auto_verdict as string | null,
      };
    })
    .filter(Boolean) as Array<{ opcode: string; auto_score: number | null; auto_verdict: string | null }>;

  const rowsF = (feedback ?? [])
    .map((r) => resolveFeedbackRow(r as any))
    .filter(Boolean) as Array<{ verdict: string; opcode: string; corrected_opcode: string | null }>;
  const { rules, metrics } = buildRulesFromSamples(rowsS, rowsF);

  const nextVersion = ((lastCfg?.version as number | undefined) ?? 0) + 1;
  const nextStatus = opts.promote ? 'active' : 'candidate';
  if (opts.promote) await db.from('ml_engine_config').update({ status: 'archived' }).eq('status', 'active');

  const { data: inserted } = await db
    .from('ml_engine_config')
    .insert({
      version: nextVersion,
      status: nextStatus,
      rules_json: rules,
      metrics_json: metrics,
      created_by: opts.createdBy,
      promoted_at: opts.promote ? new Date().toISOString() : null,
    })
    .select('id, version, status')
    .single();

  return { config: inserted ?? null, rules, metrics };
}

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

  const payload: Record<string, unknown> = mlEncryptionConfigured()
    ? {
        user_id: userId,
        sample_id: sampleId ?? null,
        input_sha256: inputSha256,
        input_text: null,
        opcode: null,
        corrected_opcode: null,
        input_ciphertext: text ? encryptMlUtf8(text) : null,
        opcode_ciphertext: encryptMlUtf8(opcode),
        corrected_opcode_ciphertext: correctedOpcode ? encryptMlUtf8(correctedOpcode) : null,
        crypto_version: 1,
        verdict,
        reason: reason ?? null,
      }
    : {
        user_id: userId,
        sample_id: sampleId ?? null,
        input_sha256: inputSha256,
        input_text: text && includeInputForMl ? text : null,
        opcode,
        corrected_opcode: correctedOpcode ?? null,
        input_ciphertext: null,
        opcode_ciphertext: null,
        corrected_opcode_ciphertext: null,
        crypto_version: 0,
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

// GET /v1/ml/config/active — inspect active runtime rules
mlRouter.get('/config/active', auth, async (c) => {
  const { data } = await db
    .from('ml_engine_config')
    .select('id, version, status, rules_json, metrics_json, created_at, promoted_at')
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return c.json({ ok: true, config: data ?? null });
});

// GET /v1/ml/config/history?limit=20 — config history
mlRouter.get('/config/history', auth, async (c) => {
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 20)));
  const { data } = await db
    .from('ml_engine_config')
    .select('id, version, status, metrics_json, created_at, promoted_at')
    .order('version', { ascending: false })
    .limit(limit);
  return c.json({ ok: true, configs: data ?? [] });
});

// POST /v1/ml/config/promote — promote a candidate to active
mlRouter.post('/config/promote', auth, zValidator('json', promoteSchema), async (c) => {
  const tier = c.get('tier');
  if (tier !== 'pro') return c.json({ error: 'Pro plan required' }, 403);
  const { configId } = c.req.valid('json');

  const { data: target } = await db
    .from('ml_engine_config')
    .select('id, version, status')
    .eq('id', configId)
    .maybeSingle();
  if (!target) return c.json({ error: 'Config not found' }, 404);

  await db.from('ml_engine_config').update({ status: 'archived' }).eq('status', 'active');
  await db
    .from('ml_engine_config')
    .update({ status: 'active', promoted_at: new Date().toISOString() })
    .eq('id', configId);

  return c.json({ ok: true, promoted: true, version: target.version });
});

// POST /v1/ml/job/run — compile DB signals into a candidate config, optionally promote
mlRouter.post('/job/run', auth, zValidator('json', jobSchema), async (c) => {
  const tier = c.get('tier');
  if (tier !== 'pro') return c.json({ error: 'Pro plan required' }, 403);
  const userId = c.get('userId');
  const { promote } = c.req.valid('json');

  const result = await compileMlConfigJob({ createdBy: userId, promote: !!promote });
  return c.json({ ok: true, compiled: true, config: result.config, rules: result.rules, metrics: result.metrics });
});
