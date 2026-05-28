import type { OptimizeOptions } from './PithEngine.js';

export type StableOptimizeOptions = OptimizeOptions & {
  explain?: boolean;
};

export type PithResultV1 = {
  schemaVersion: '1.0.0';
  mode: 'compress' | 'query' | 'conversational';
  output: string;
  noiseRemoved: number;
  isQuery: boolean;
  meta: {
    elapsedMs: number;
    explain: string[];
  };
};
