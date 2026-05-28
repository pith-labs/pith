import assert from 'node:assert/strict';
import { PithEngine } from './PithEngine.ts';

const engine = new PithEngine();

const stable = engine.optimizeStable('Como implementar retry com idempotência no worker?', { explain: true });
assert.equal(stable.schemaVersion, '1.0.0');
assert.ok(['compress', 'query', 'conversational'].includes(stable.mode));
assert.equal(typeof stable.output, 'string');
assert.equal(typeof stable.noiseRemoved, 'number');
assert.equal(typeof stable.meta.elapsedMs, 'number');
assert.ok(Array.isArray(stable.meta.explain));

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

console.log('contract tests passed');
