export type IntentIR = {
  version: '0.1.0';
  intent: {
    action: string;
    domain: string[];
    domainScores: Array<{ name: string; score: number }>;
    entities: string[];
    confidence: number;
  };
  constraints: {
    preserveNegation: boolean;
    outputFormat: 'text' | 'json' | 'list' | 'code';
    maxLength?: number;
    mustInclude: string[];
    mustAvoid: string[];
  };
  signals: {
    hasCode: boolean;
    hasQuestion: boolean;
    languageHint: 'pt' | 'en' | 'es' | 'fr' | 'unknown';
  };
  source: {
    originalLength: number;
    nonEmptyLines: number;
  };
};

const ACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(refactor|refatore|refatorar)\b/i, 'refactor'],
  [/\b(fix|corrigir|corrija|consertar)\b/i, 'fix'],
  [/\b(explain|explicar|explique)\b/i, 'explain'],
  [/\b(implement|implementar|implemente)\b/i, 'implement'],
  [/\b(generate|gerar|criar|create)\b/i, 'generate'],
  [/\b(optimi[sz]e|otimizar|otimize|compress)\b/i, 'optimize'],
  [/\b(analy[sz]e|analisar|analise|review)\b/i, 'analyze'],
];

const DOMAIN_PATTERNS: Array<[RegExp, string]> = [
  [/\b(api|backend|endpoint|route|http)\b/i, 'backend'],
  [/\b(frontend|react|vite|ui|ux)\b/i, 'frontend'],
  [/\b(worker|queue|sqs|cron|job|retry|dlq)\b/i, 'async-processing'],
  [/\b(test|vitest|jest|pytest|coverage)\b/i, 'testing'],
  [/\b(sql|postgres|database|db|migration)\b/i, 'data'],
  [/\b(llm|prompt|tokens?|openai|claude)\b/i, 'llm'],
];

const ACTION_PRIORITIES: Record<string, number> = {
  refactor: 10,
  fix: 10,
  implement: 9,
  generate: 8,
  optimize: 7,
  analyze: 7,
  explain: 6,
};

function slugToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function detectLanguageHint(text: string): 'pt' | 'en' | 'es' | 'fr' | 'unknown' {
  if (/\b(que|como|para|com|não|ção|ções)\b/i.test(text)) return 'pt';
  if (/\b(the|and|with|for|how|please)\b/i.test(text)) return 'en';
  if (/\b(que|como|para|con|por|ción|ciones)\b/i.test(text)) return 'es';
  if (/\b(comment|pour|avec|sans|tion|tions)\b/i.test(text)) return 'fr';
  return 'unknown';
}

function detectOutputFormat(text: string): 'text' | 'json' | 'list' | 'code' {
  if (/\bjson\b/i.test(text)) return 'json';
  if (/```|\btypescript\b|\bjavascript\b|\bpython\b|\bcode\b/i.test(text)) return 'code';
  if (/^\s*[-*]\s/m.test(text) || /^\s*\d+\.\s/m.test(text)) return 'list';
  return 'text';
}

function pickAction(text: string): string {
  for (const [rx, action] of ACTION_PATTERNS) {
    if (rx.test(text)) return action;
  }
  return /\?/.test(text) ? 'explain' : 'optimize';
}

function scoreDomains(text: string): Array<{ name: string; score: number }> {
  const lower = text.toLowerCase();
  const out: Array<{ name: string; score: number }> = [];
  for (const [rx, domain] of DOMAIN_PATTERNS) {
    if (!rx.test(text)) continue;
    let score = 5;
    if (domain === 'async-processing' && /\b(retry|dlq|idempot|worker)\b/i.test(text)) score += 4;
    if (domain === 'backend' && /\b(api|endpoint|route|http)\b/i.test(text)) score += 3;
    if (domain === 'llm' && /\b(prompt|tokens?|openai|claude|context)\b/i.test(text)) score += 3;
    if (lower.includes(domain)) score += 1;
    out.push({ name: domain, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function pickEntities(text: string): string[] {
  const entities = Array.from(text.matchAll(/\b[A-Z][A-Za-z0-9_-]{2,}\b/g)).map((m) => m[0]);
  return Array.from(new Set(entities.map(slugToken).filter(Boolean))).slice(0, 8);
}

function pickMustInclude(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(must include|include|incluir|inclua)\s+([a-z0-9_\-/]+)/gi)) {
    const term = m[2]?.trim();
    if (term) out.add(slugToken(term));
  }
  return Array.from(out).filter(Boolean);
}

function pickMustAvoid(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(without|avoid|sem|evitar)\s+([a-z0-9_\-/]+)/gi)) {
    const term = m[2]?.trim();
    if (term) out.add(slugToken(term));
  }
  return Array.from(out).filter(Boolean);
}

function pickMaxLength(text: string): number | undefined {
  const m = text.match(/\b(max(?:imum)?|até|up to)\s+(\d{1,4})\s*(tokens?|chars?|characters?)\b/i);
  if (!m) return undefined;
  const n = Number(m[2]);
  return Number.isFinite(n) ? n : undefined;
}

export function parseIntentIR(text: string): IntentIR {
  const trimmed = text.trim();
  const action = pickAction(trimmed);
  const domainScores = scoreDomains(trimmed);
  const domain = domainScores.map((d) => d.name);
  const signalScore =
    (/\?/.test(trimmed) ? 1 : 0) +
    (domainScores.length ? 1 : 0) +
    (pickEntities(trimmed).length ? 1 : 0) +
    (pickMustInclude(trimmed).length || pickMustAvoid(trimmed).length ? 1 : 0);
  const confidence = Math.max(0.15, Math.min(0.99, (ACTION_PRIORITIES[action] ?? 5) / 12 + signalScore * 0.08));
  return {
    version: '0.1.0',
    intent: {
      action,
      domain,
      domainScores,
      entities: pickEntities(trimmed),
      confidence: Number(confidence.toFixed(2)),
    },
    constraints: {
      preserveNegation: /\b(n[aã]o|not|never|sem)\b/i.test(trimmed),
      outputFormat: detectOutputFormat(trimmed),
      maxLength: pickMaxLength(trimmed),
      mustInclude: pickMustInclude(trimmed),
      mustAvoid: pickMustAvoid(trimmed),
    },
    signals: {
      hasCode: /```|=>|function\s|const\s|class\s|\{\s*\n/.test(trimmed),
      hasQuestion: /\?/.test(trimmed),
      languageHint: detectLanguageHint(trimmed),
    },
    source: {
      originalLength: trimmed.length,
      nonEmptyLines: trimmed.split('\n').filter((l) => l.trim()).length,
    },
  };
}

export function generateMachinePrompt(ir: IntentIR): string {
  const parts: string[] = [];
  parts.push(`act=${ir.intent.action}`);
  if (ir.intent.domain.length) parts.push(`dom=${ir.intent.domain.join(',')}`);
  if (ir.intent.entities.length) parts.push(`ent=${ir.intent.entities.join(',')}`);
  parts.push(`conf=${ir.intent.confidence.toFixed(2)}`);
  parts.push(`fmt=${ir.constraints.outputFormat}`);
  if (typeof ir.constraints.maxLength === 'number') parts.push(`max=${ir.constraints.maxLength}`);
  if (ir.constraints.mustInclude.length) parts.push(`must+${ir.constraints.mustInclude.join(',')}`);
  if (ir.constraints.mustAvoid.length) parts.push(`must-${ir.constraints.mustAvoid.join(',')}`);
  if (ir.constraints.preserveNegation) parts.push('keep-negation');
  if (ir.signals.hasCode) parts.push('preserve-code');
  return parts.join(' | ');
}
