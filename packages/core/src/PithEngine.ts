import { compressPipeline, conversationalPipeline, queryPipeline } from './engine/pipelines.js';
import { isaCrc } from './engine/opcode.js';

type OptimizeOptions = {
  ultraCompact?: boolean;
};

export class PithEngine {
  public optimize(text: string, options: OptimizeOptions = { ultraCompact: true }): { output: string; noiseRemoved: number; isQuery: boolean } {
    try {
      if (!text.trim()) return { output: '[PITH: No meaningful data found]', noiseRemoved: 0, isQuery: false };

      const mode = this.detectMode(text);
      const result = mode === 'compress'
        ? compressPipeline(text, options)
        : mode === 'conversational'
          ? conversationalPipeline(text, options)
          : queryPipeline(text, options);
      return { ...result, isQuery: mode !== 'compress' };
    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }

  public optimizeMachine(text: string): { output: string; noiseRemoved: number; isQuery: boolean } {
    return this.optimize(text, { ultraCompact: true });
  }

  public compressCode(code: string): string {
    return code;
  }

  /** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
  public static isaCrc(baseWithoutCrc: string): string {
    return isaCrc(baseWithoutCrc);
  }

  private detectMode(text: string): 'compress' | 'query' | 'conversational' {
    const words = text.split(/\s+/).length;
    const nonEmptyLines = text.split('\n').filter(l => l.trim()).length;
    const qCount = (text.match(/\?/g) || []).length;
    const hasQuestion = qCount > 0;
    const hasCodeFence = /```/.test(text);
    const hasNumberedList = /^\s*\d+\.\s/m.test(text);
    const hasBulletList = /^\s*[-•–]\s/m.test(text);
    const looksLikeSpec = this.looksLikeSpecBrief(text);

    const queryScore =
      (hasQuestion ? 4 : 0) +
      (looksLikeSpec ? 5 : 0) +
      (!hasCodeFence && !hasNumberedList && !hasBulletList ? 1 : 0);

    const conversationalScore =
      (qCount >= 2 ? 6 : 0) +
      (qCount >= 2 && nonEmptyLines <= 4 ? 1 : 0);

    const compressScore =
      (words > 40 ? 3 : 0) +
      (nonEmptyLines > 3 ? 2 : 0) +
      (hasCodeFence ? 5 : 0) +
      (hasNumberedList ? 3 : 0) +
      (hasBulletList ? 3 : 0) +
      (!hasQuestion && !looksLikeSpec ? 1 : 0);

    if (conversationalScore >= queryScore && conversationalScore >= compressScore) return 'conversational';
    if (queryScore >= compressScore) return 'query';
    return 'compress';
  }

  private looksLikeSpecBrief(text: string): boolean {
    const sections = [
      /(^|\n)\s*contexto\s*$/im,
      /(^|\n)\s*objetivo\s*$/im,
      /(^|\n)\s*escopo\s*$/im,
      /(^|\n)\s*resultado esperado\s*$/im,
      /(^|\n)\s*critérios? de aceite\s*$/im,
      /(^|\n)\s*scope\s*$/im,
      /(^|\n)\s*goal\s*$/im,
      /(^|\n)\s*acceptance criteria\s*$/im,
    ].filter(re => re.test(text)).length;

    const techSignals = [
      /(?:^|\s)(app|src|packages)\/[^\s]+/i.test(text),
      /\b[a-z_]+\.(?:py|ts|js)\b/i.test(text),
      /\b(send_[a-z_]+)\b/i.test(text),
      /\b(?:idempot[eê]ncia|idempotency|retry|reprocessamentos?)\b/i.test(text),
      /\b(?:eventos?|transiç(?:ão|oes)|transition|notifier|orquestraç(?:ão|oes))\b/i.test(text),
      /\b(?:dependency|dependencies|provider|providers|repository|repositories|service|services|factory|factories|depends)\b/i.test(text),
    ].filter(Boolean).length;

    return sections >= 2 && techSignals >= 1;
  }

}
