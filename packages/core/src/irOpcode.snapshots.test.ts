import assert from 'node:assert/strict';
import { parseIntentIR } from './ir.ts';
import { generateOpcodeFromIR } from './irOpcode.ts';

const fixtures = [
  {
    name: 'backend_worker_retry',
    input: 'Refactor backend API worker retry and DLQ flow with idempotency and output JSON.',
  },
  {
    name: 'llm_token_density',
    input: 'Explain how to reduce prompt token usage for OpenAI and keep semantic fidelity.',
  },
  {
    name: 'data_migration',
    input: 'Implement postgres migration with rollback plan and avoid markdown.',
  },
] as const;

const snapshots: Record<string, { ir: string; opcode: string }> = {
  backend_worker_retry: {
    ir: JSON.stringify({ action: 'refactor', hasDomain: 'async-processing', format: 'json', quality: ['retry', 'dlq', 'idempotency'] }),
    opcode: 'contains:pl:be@v1',
  },
  llm_token_density: {
    ir: JSON.stringify({ action: 'explain', hasDomain: 'llm', format: 'text' }),
    opcode: 'contains:pl:lm@v1',
  },
  data_migration: {
    ir: JSON.stringify({ action: 'implement', hasDomain: 'data', format: 'text' }),
    opcode: 'contains:pl:db@v1',
  },
};

for (const f of fixtures) {
  const ir = parseIntentIR(f.input);
  const opcode = generateOpcodeFromIR(ir, f.input, true);

  const compactView = JSON.stringify({
    action: ir.intent.action,
    domains: ir.intent.domain,
    format: ir.constraints.outputFormat,
    quality: ir.slots.quality,
  });

  const expected = snapshots[f.name];
  const expectedIR = JSON.parse(expected.ir) as { action: string; hasDomain: string; format: string };
  assert.ok(compactView.includes(JSON.parse(expected.ir).action));
  assert.ok(ir.intent.domain.includes(expectedIR.hasDomain), `${f.name}: expected domain ${expectedIR.hasDomain}, got ${ir.intent.domain.join(',')}`);
  assert.ok(compactView.includes(expectedIR.format));

  const opcodeMustContain = expected.opcode.replace('contains:', '');
  assert.ok(opcode.includes(opcodeMustContain), `${f.name} opcode mismatch: ${opcode}`);
}

console.log('ir/opcode snapshots passed');
