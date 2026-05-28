import type { IntentIR } from './ir.js';

export type DomainPlan = {
  track: 'backend' | 'worker' | 'llm' | 'testing' | 'data' | 'generic';
  focus: string[];
  checks: string[];
};

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs)).filter(Boolean);
}

function pickTrack(ir: IntentIR): DomainPlan['track'] {
  const top = ir.intent.domain[0] ?? '';
  if (top === 'backend') return 'backend';
  if (top === 'async-processing') return 'worker';
  if (top === 'llm') return 'llm';
  if (top === 'testing') return 'testing';
  if (top === 'data') return 'data';
  return 'generic';
}

function planBackend(ir: IntentIR): DomainPlan {
  const focus = uniq([
    ...ir.slots.transport,
    ...ir.slots.storage,
    ...ir.slots.quality,
    ...ir.constraints.mustInclude,
    ir.constraints.preserveNegation ? 'logic-guard' : '',
  ]);
  const checks = uniq([
    'contract-stability',
    focus.some((f) => /idempot/.test(f)) ? 'idempotency' : '',
    focus.some((f) => /retry|dlq/.test(f)) ? 'failure-policy' : '',
  ]);
  return { track: 'backend', focus, checks };
}

function planWorker(ir: IntentIR): DomainPlan {
  const focus = uniq([
    ...ir.slots.quality,
    ...ir.slots.transport,
    ...ir.constraints.mustInclude,
  ]);
  const checks = uniq(['retry-policy', 'dead-letter-routing', 'idempotency', 'requeue-safety']);
  return { track: 'worker', focus, checks };
}

function planLLM(ir: IntentIR): DomainPlan {
  const focus = uniq([
    'token-efficiency',
    'semantic-fidelity',
    `fmt-${ir.constraints.outputFormat}`,
    ...ir.constraints.mustInclude,
  ]);
  const checks = uniq(['no-negation-loss', 'output-shape', 'prompt-density']);
  return { track: 'llm', focus, checks };
}

function planTesting(ir: IntentIR): DomainPlan {
  const focus = uniq(['regression-suite', ...ir.constraints.mustInclude, ...ir.slots.quality]);
  const checks = uniq(['semantic-gate', 'contract-tests', 'coverage-guard']);
  return { track: 'testing', focus, checks };
}

function planData(ir: IntentIR): DomainPlan {
  const focus = uniq([...ir.slots.storage, ...ir.constraints.mustInclude, 'migration-safety']);
  const checks = uniq(['rollback-plan', 'schema-compat', 'data-integrity']);
  return { track: 'data', focus, checks };
}

function planGeneric(ir: IntentIR): DomainPlan {
  const focus = uniq([...ir.constraints.mustInclude, ...ir.intent.domain]);
  const checks = uniq(['intent-preservation', 'minimal-output']);
  return { track: 'generic', focus, checks };
}

export function buildDomainPlan(ir: IntentIR): DomainPlan {
  const track = pickTrack(ir);
  if (track === 'backend') return planBackend(ir);
  if (track === 'worker') return planWorker(ir);
  if (track === 'llm') return planLLM(ir);
  if (track === 'testing') return planTesting(ir);
  if (track === 'data') return planData(ir);
  return planGeneric(ir);
}

export function serializeDomainPlan(plan: DomainPlan): string {
  const prefix: Record<DomainPlan['track'], string> = {
    backend: 'be',
    worker: 'wk',
    llm: 'lm',
    testing: 'ts',
    data: 'db',
    generic: 'gn',
  };
  const p = prefix[plan.track];
  const focus = plan.focus.slice(0, 8).join(',') || '_';
  const checks = plan.checks.slice(0, 8).join(',') || '_';
  return `${p}:${focus};ck:${checks}`;
}
