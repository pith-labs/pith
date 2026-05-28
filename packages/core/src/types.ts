import type { OptimizeOptions } from './PithEngine.js';
import type { IntentIR } from './ir.js';

export type StableOptimizeOptions = OptimizeOptions & {
  explain?: boolean;
};

export type PithResultV1 = {
  schemaVersion: '1.1.0';
  mode: 'compress' | 'query' | 'conversational';
  output: string;
  noiseRemoved: number;
  isQuery: boolean;
  ir: IntentIR;
  machinePrompt: string;
  irOpcode: string;
  meta: {
    elapsedMs: number;
    explain: string[];
  };
};
