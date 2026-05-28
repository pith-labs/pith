import assert from 'node:assert/strict';
import { parseIntentIR } from './ir.ts';
import { generateOpcodeFromIR } from './irOpcode.ts';

type GateCase = {
  input: string;
  action: string;
  mustHaveDomains?: string[];
  format?: 'text' | 'json' | 'list' | 'code';
};

const cases: GateCase[] = [
  {
    input: 'Refactor the backend API route and keep idempotency for retries in worker queue.',
    action: 'refactor',
    mustHaveDomains: ['backend', 'async-processing'],
  },
  {
    input: 'Explain how to reduce LLM token usage and output JSON with max 120 tokens.',
    action: 'explain',
    mustHaveDomains: ['llm'],
    format: 'json',
  },
  {
    input: 'Generate Typescript code for retryable/non-retryable classification.',
    action: 'generate',
    format: 'code',
  },
  {
    input: 'Fix flaky tests in vitest and improve coverage.',
    action: 'fix',
    mustHaveDomains: ['testing'],
  },
  {
    input: 'Implement postgres migration and avoid markdown.',
    action: 'implement',
    mustHaveDomains: ['data'],
  },
];

for (const c of cases) {
  const ir = parseIntentIR(c.input);
  assert.equal(ir.intent.action, c.action);
  if (c.mustHaveDomains) {
    for (const d of c.mustHaveDomains) assert.ok(ir.intent.domain.includes(d), `${c.input} missing domain ${d}`);
  }
  if (c.format) assert.equal(ir.constraints.outputFormat, c.format);
  const op = generateOpcodeFromIR(ir, c.input, true);
  assert.ok(op.length > 12);
  assert.match(op, /(a:|ACT=)/);
  assert.match(op, /(pl:.*@v1|P=pl:.*@v1)/);
}

console.log('semantic gate passed');
