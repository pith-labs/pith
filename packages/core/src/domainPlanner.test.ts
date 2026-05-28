import assert from 'node:assert/strict';
import { buildDomainPlan, serializeDomainPlan } from './domainPlanner.ts';
import { parseIntentIR } from './ir.ts';

const backendIR = parseIntentIR('Refactor backend API route with idempotency and retry support');
const backendPlan = buildDomainPlan(backendIR);
assert.equal(backendPlan.track, 'backend');
assert.equal(backendPlan.weightsVersion, 'v1');
assert.ok(backendPlan.checks.includes('idempotency') || backendPlan.focus.some((x) => /idempot/.test(x)));
assert.match(serializeDomainPlan(backendPlan), /^be@v1:/);

const workerIR = parseIntentIR('Implement worker queue retry and DLQ strategy');
const workerPlan = buildDomainPlan(workerIR);
assert.equal(workerPlan.track, 'worker');
assert.ok(workerPlan.checks.includes('retry-policy'));
assert.match(serializeDomainPlan(workerPlan), /^wk@v1:/);

const llmIR = parseIntentIR('Explain how to reduce LLM tokens and output JSON');
const llmPlan = buildDomainPlan(llmIR);
assert.equal(llmPlan.track, 'llm');
assert.ok(llmPlan.focus.includes('token-efficiency'));
assert.match(serializeDomainPlan(llmPlan), /^lm@v1:/);

console.log('domain planner tests passed');
