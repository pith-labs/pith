export type DomainTrack = 'backend' | 'worker' | 'llm' | 'testing' | 'data' | 'generic';

export type WeightTable = {
  version: 'v1';
  focus: Record<DomainTrack, Record<string, number>>;
  checks: Record<DomainTrack, Record<string, number>>;
};

export const DOMAIN_WEIGHTS_V1: WeightTable = {
  version: 'v1',
  focus: {
    backend: {
      idempotency: 10,
      retry: 9,
      dlq: 8,
      api: 7,
      http: 6,
      postgres: 6,
      redis: 5,
      'logic-guard': 5,
    },
    worker: {
      retry: 10,
      dlq: 9,
      idempotency: 8,
      queue: 8,
      sqs: 8,
      kafka: 7,
    },
    llm: {
      'token-efficiency': 10,
      'semantic-fidelity': 9,
      'fmt-json': 8,
      'fmt-code': 8,
    },
    testing: {
      'regression-suite': 10,
      coverage: 8,
      retry: 5,
      idempotency: 5,
    },
    data: {
      postgres: 9,
      mysql: 8,
      migration: 8,
      'migration-safety': 7,
      sqlite: 6,
    },
    generic: {
      backend: 6,
      llm: 6,
      testing: 6,
      data: 6,
    },
  },
  checks: {
    backend: {
      'contract-stability': 10,
      idempotency: 9,
      'failure-policy': 8,
    },
    worker: {
      'retry-policy': 10,
      'dead-letter-routing': 9,
      idempotency: 8,
      'requeue-safety': 8,
    },
    llm: {
      'no-negation-loss': 10,
      'output-shape': 9,
      'prompt-density': 8,
    },
    testing: {
      'semantic-gate': 10,
      'contract-tests': 9,
      'coverage-guard': 8,
    },
    data: {
      'rollback-plan': 10,
      'schema-compat': 9,
      'data-integrity': 9,
    },
    generic: {
      'intent-preservation': 10,
      'minimal-output': 8,
    },
  },
};

export function rankByWeights(values: string[], weights: Record<string, number>): string[] {
  return Array.from(new Set(values))
    .filter(Boolean)
    .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0) || a.localeCompare(b));
}
