import assert from 'node:assert/strict';
import { generateMachinePrompt, parseIntentIR } from './ir.ts';

const c1 = parseIntentIR('Do not remove negation. Refactor backend API worker retry and DLQ flow. Output JSON.');
assert.equal(c1.intent.action, 'refactor');
assert.ok(c1.intent.domain.includes('backend'));
assert.ok(c1.intent.domain.includes('async-processing'));
assert.equal(c1.constraints.outputFormat, 'json');
assert.equal(c1.constraints.preserveNegation, true);
assert.ok(c1.intent.confidence >= 0.5);
assert.ok(c1.intent.domain.includes('backend') || c1.slots.transport.includes('queue') || c1.slots.transport.includes('sqs'));
assert.ok(c1.slots.quality.includes('retry') || c1.slots.quality.includes('dlq'));

const c2 = parseIntentIR('Inclua idempotency e evitar markdown.');
assert.ok(c2.constraints.mustInclude.includes('idempotency'));
assert.ok(c2.constraints.mustAvoid.includes('markdown'));

const c3 = parseIntentIR('Generate Typescript code with max 120 tokens');
assert.equal(c3.constraints.outputFormat, 'code');
assert.equal(c3.constraints.maxLength, 120);

const prompt = generateMachinePrompt(c1);
assert.match(prompt, /act=refactor/);
assert.match(prompt, /dom=/);
assert.match(prompt, /conf=/);
assert.match(prompt, /fmt=json/);
assert.match(prompt, /keep-negation/);

console.log('ir semantic tests passed');
