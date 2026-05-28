import assert from 'node:assert/strict';
import { PithEngine } from './PithEngine.ts';
import { parseIntentIR, generateMachinePrompt } from './ir.ts';

const engine = new PithEngine();

const stable = engine.optimizeStable('Como implementar retry com idempotência no worker?', { explain: true });
assert.equal(stable.schemaVersion, '1.1.0');
assert.ok(['compress', 'query', 'conversational'].includes(stable.mode));
assert.equal(typeof stable.output, 'string');
assert.equal(typeof stable.noiseRemoved, 'number');
assert.equal(typeof stable.meta.elapsedMs, 'number');
assert.ok(Array.isArray(stable.meta.explain));
assert.equal(typeof stable.ir.intent.action, 'string');
assert.ok(Array.isArray(stable.ir.intent.domain));
assert.ok(Array.isArray(stable.ir.intent.domainScores));
assert.equal(typeof stable.ir.intent.confidence, 'number');
assert.equal(typeof stable.machinePrompt, 'string');
assert.match(stable.machinePrompt, /act=/);
assert.match(stable.machinePrompt, /conf=/);

const pluginEngine = new PithEngine([
  {
    name: 'append-marker',
    hooks: {
      afterOptimize: (_input, out) => ({ output: `${out.output} #ok` }),
    },
  },
]);
const pluginOut = pluginEngine.optimize('Refactor auth middleware');
assert.match(pluginOut.output, /#ok$/);

const ir = parseIntentIR('Please generate JSON output and avoid markdown');
assert.equal(ir.intent.action, 'generate');
assert.equal(ir.constraints.outputFormat, 'json');
assert.ok(ir.constraints.mustAvoid.includes('markdown'));
const machine = generateMachinePrompt(ir);
assert.match(machine, /fmt=json/);

console.log('contract tests passed');
