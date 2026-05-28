import type { OptimizeOptions } from './PithEngine.js';

export type PluginOptimizeInput = {
  text: string;
  mode: 'compress' | 'query' | 'conversational';
  options: OptimizeOptions;
};

export type PithPluginHooks = {
  beforeOptimize?: (input: PluginOptimizeInput) => PluginOptimizeInput | void;
  afterOptimize?: (input: PluginOptimizeInput, output: { output: string }) => { output: string } | void;
};

export type PithPlugin = {
  name: string;
  hooks?: PithPluginHooks;
};
