import { compressPipeline, conversationalPipeline, queryPipeline } from './engine/pipelines.js';
import { isaCrc } from './engine/opcode.js';

export class PithEngine {
  public optimize(text: string): { output: string; noiseRemoved: number; isQuery: boolean } {
    try {
      if (!text.trim()) return { output: '[PITH: No meaningful data found]', noiseRemoved: 0, isQuery: false };

      const mode = this.detectMode(text);
      const result = mode === 'compress'
        ? compressPipeline(text)
        : mode === 'conversational'
          ? conversationalPipeline(text)
          : queryPipeline(text);
      return { ...result, isQuery: mode !== 'compress' };
    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }

  public compressCode(code: string): string {
    return code;
  }

  /** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
  public static isaCrc(baseWithoutCrc: string): string {
    return isaCrc(baseWithoutCrc);
  }

  private detectMode(text: string): 'compress' | 'query' | 'conversational' {
    if (text.split(/\s+/).length > 40) return 'compress';
    if (text.split('\n').filter(l => l.trim()).length > 3) return 'compress';
    if (/```/.test(text)) return 'compress';
    if (/^\s*\d+\.\s/m.test(text)) return 'compress';
    if (/^\s*[-•–]\s/m.test(text)) return 'compress';
    if (this.isConversational(text)) return 'conversational';
    return 'query';
  }

  // Conversational: só sinal estrutural (≥2 '?'), sem léxico de pronome/tópico
  private isConversational(text: string): boolean {
    const qCount = (text.match(/\?/g) || []).length;
    return qCount >= 2;
  }
}
