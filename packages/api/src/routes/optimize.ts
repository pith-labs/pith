import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PithEngine } from '@pith/core';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/client.js';
import { insertMlTelemetrySample } from './ml.js';

const engine = new PithEngine();
let configCache: { rules: { stopNiches?: string[]; defaultActionForTag?: Record<string, string> } | null; ts: number } = {
  rules: null,
  ts: 0,
};
const CONFIG_TTL_MS = 60_000;

function getSlot(opcode: string, key: string): string {
  const compact = opcode.trim().replace(/\s+/g, ' ');
  const m = compact.match(new RegExp(`\\b${key}=([^\\s]+)`));
  return m ? m[1] : '_';
}

function setSlot(opcode: string, key: string, value: string): string {
  const compact = opcode.trim().replace(/\s+/g, ' ');
  return compact.replace(new RegExp(`\\b${key}=[^\\s]+`), `${key}=${value}`);
}

function applyRuntimeRulesToOpcode(
  opcode: string,
  rules: { stopNiches?: string[]; defaultActionForTag?: Record<string, string> } | null
): string {
  if (!rules) return opcode;
  if (!/^M=(Q|V|C|R)\s/.test(opcode)) return opcode;
  let out = opcode.trim().replace(/\s+/g, ' ');

  const tag = getSlot(out, 'TAG').toLowerCase();
  const act = getSlot(out, 'ACT');
  if ((act === '_' || !act) && tag && tag !== '_' && rules.defaultActionForTag?.[tag]) {
    out = setSlot(out, 'ACT', rules.defaultActionForTag[tag]);
  }

  const stop = new Set((rules.stopNiches ?? []).map((x) => x.toLowerCase()));
  if (stop.size > 0) {
    const n = getSlot(out, 'N');
    if (n && n !== '_') {
      const filtered = n
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x && !stop.has(x.toLowerCase()));
      out = setSlot(out, 'N', filtered.length ? filtered.join(',') : '_');
    }
  }

  return out;
}

async function getActiveRuntimeRules() {
  const now = Date.now();
  if (now - configCache.ts < CONFIG_TTL_MS) return configCache.rules;
  try {
    const query: any = db.from('ml_engine_config').select('rules_json');
    const built = typeof query.eq === 'function' ? query.eq('status', 'active') : query;
    const ordered = typeof built.order === 'function'
      ? built.order('version', { ascending: false })
      : built;
    const limited = typeof ordered.limit === 'function' ? ordered.limit(1) : ordered;
    const result = typeof limited.maybeSingle === 'function'
      ? await limited.maybeSingle()
      : typeof limited.single === 'function'
        ? await limited.single()
        : { data: null };
    configCache = { rules: (result?.data?.rules_json as any) ?? null, ts: now };
  } catch {
    configCache = { rules: null, ts: now };
  }
  return configCache.rules;
}

const schema = z.object({
  text: z.string().min(1).max(50_000),
});

export const optimizeRouter = new Hono();

// POST /v1/optimize  — authenticated + rate limited
optimizeRouter.post('/', auth, rateLimit, zValidator('json', schema), async (c) => {
  const { text } = c.req.valid('json');
  const userId   = c.get('userId');
  const apiKeyId = c.get('apiKeyId');

  const { output, noiseRemoved, isQuery } = engine.optimize(text);
  const runtimeRules = await getActiveRuntimeRules();
  const outputAdjusted = applyRuntimeRulesToOpcode(output, runtimeRules);
  const tokensSaved = Math.max(0, Math.floor((text.length - outputAdjusted.length) / 4));

  // Log usage async (don't block response)
  db.from('usage_logs').insert({
    user_id:       userId,
    api_key_id:    apiKeyId || null,
    tokens_saved:  tokensSaved,
    noise_removed: noiseRemoved,
    input_length:  text.length,
  }).then();

  void insertMlTelemetrySample({
    userId,
    apiKeyId: apiKeyId || null,
    text,
    output,
    noiseRemoved,
    isQuery,
    sampleKind: 'user_prompt',
    source: 'api',
  }).catch(() => {});

  return c.json({ output: outputAdjusted, noiseRemoved, tokensSaved, isQuery });
});

