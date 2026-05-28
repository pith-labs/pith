import type { IntentIR } from './ir.js';
import { DOMAIN_WEIGHTS_V1, rankByWeights, type DomainTrack } from './domainWeights.js';

export type DomainPlan = {
  track: DomainTrack;
  weightsVersion: 'v1';
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
  const rawFocus = uniq([
    ...ir.slots.transport,
    ...ir.slots.storage,
    ...ir.slots.quality,
    ...ir.constraints.mustInclude,
    ir.constraints.preserveNegation ? 'logic-guard' : '',
  ]);
  const rawChecks = uniq([
    'contract-stability',
    rawFocus.some((f) => /idempot/.test(f)) ? 'idempotency' : '',
    rawFocus.some((f) => /retry|dlq/.test(f)) ? 'failure-policy' : '',
  ]);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.backend);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.backend);
  return { track: 'backend', weightsVersion: 'v1', focus, checks };
}

function planWorker(ir: IntentIR): DomainPlan {
  const rawFocus = uniq([
    ...ir.slots.quality,
    ...ir.slots.transport,
    ...ir.constraints.mustInclude,
  ]);
  const rawChecks = uniq(['retry-policy', 'dead-letter-routing', 'idempotency', 'requeue-safety']);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.worker);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.worker);
  return { track: 'worker', weightsVersion: 'v1', focus, checks };
}

function planLLM(ir: IntentIR): DomainPlan {
  const rawFocus = uniq([
    'token-efficiency',
    'semantic-fidelity',
    `fmt-${ir.constraints.outputFormat}`,
    ...ir.constraints.mustInclude,
  ]);
  const rawChecks = uniq(['no-negation-loss', 'output-shape', 'prompt-density']);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.llm);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.llm);
  return { track: 'llm', weightsVersion: 'v1', focus, checks };
}

function planTesting(ir: IntentIR): DomainPlan {
  const rawFocus = uniq(['regression-suite', ...ir.constraints.mustInclude, ...ir.slots.quality]);
  const rawChecks = uniq(['semantic-gate', 'contract-tests', 'coverage-guard']);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.testing);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.testing);
  return { track: 'testing', weightsVersion: 'v1', focus, checks };
}

function planData(ir: IntentIR): DomainPlan {
  const rawFocus = uniq([...ir.slots.storage, ...ir.constraints.mustInclude, 'migration-safety']);
  const rawChecks = uniq(['rollback-plan', 'schema-compat', 'data-integrity']);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.data);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.data);
  return { track: 'data', weightsVersion: 'v1', focus, checks };
}

function planGeneric(ir: IntentIR): DomainPlan {
  const rawFocus = uniq([...ir.constraints.mustInclude, ...ir.intent.domain]);
  const rawChecks = uniq(['intent-preservation', 'minimal-output']);
  const focus = rankByWeights(rawFocus, DOMAIN_WEIGHTS_V1.focus.generic);
  const checks = rankByWeights(rawChecks, DOMAIN_WEIGHTS_V1.checks.generic);
  return { track: 'generic', weightsVersion: 'v1', focus, checks };
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
  return `${p}@${plan.weightsVersion}:${focus};ck:${checks}`;
}
