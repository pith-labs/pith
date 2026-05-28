import { PithEngine } from './PithEngine.ts';

const cases = [
  'Refactor the auth middleware to use opaque tokens and reduce latency.',
  'Como separar erros retryable e non-retryable em um worker SQS com DLQ?',
  Array.from({ length: 60 }, (_, i) => `linha ${i} com requisitos técnicos de rollout`).join('\n'),
];

const engine = new PithEngine();
const start = Date.now();
let totalNoise = 0;

for (let i = 0; i < cases.length; i++) {
  const r = engine.optimizeStable(cases[i], { explain: false });
  totalNoise += r.noiseRemoved;
}

const elapsed = Date.now() - start;
console.log(
  JSON.stringify(
    {
      schemaVersion: '1.1.0',
      cases: cases.length,
      elapsedMs: elapsed,
      avgElapsedMs: Number((elapsed / cases.length).toFixed(2)),
      totalNoiseRemoved: totalNoise,
    },
    null,
    2
  )
);
