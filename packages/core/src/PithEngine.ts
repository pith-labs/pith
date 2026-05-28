import { compressPipeline, conversationalPipeline, queryPipeline } from './engine/pipelines.js';
import { devOutputPipeline, type DevOutputOptions } from './engine/devOutput.js';
import { isaCrc } from './engine/opcode.js';
import type { PithPlugin, PithPluginHooks } from './plugins.js';
import type { PithResultV1, StableOptimizeOptions } from './types.js';
import { generateMachinePrompt, parseIntentIR } from './ir.js';

export type OptimizeOptions = {
  ultraCompact?: boolean;
  /** `auto` = deteção atual; `compress` útil p.ex. vaults Obsidian (notas longas viram query sem isto). */
  mode?: 'auto' | 'compress' | 'query' | 'conversational';
};

export class PithEngine {
  private readonly plugins: PithPlugin[];

  public constructor(plugins: PithPlugin[] = []) {
    this.plugins = plugins;
  }

  public optimize(text: string, options: OptimizeOptions = { ultraCompact: true }): { output: string; noiseRemoved: number; isQuery: boolean } {
    try {
      if (!text.trim()) return { output: '[PITH: No meaningful data found]', noiseRemoved: 0, isQuery: false };

      const mode =
        options.mode && options.mode !== 'auto' ? options.mode : this.detectMode(text);
      const pre = this.runPluginPre({ text, mode, options });
      const result =
        pre.mode === 'compress'
          ? compressPipeline(pre.text, pre.options)
          : pre.mode === 'conversational'
            ? conversationalPipeline(pre.text, pre.options)
            : queryPipeline(pre.text, pre.options);
      const post = this.runPluginPost({
        text: pre.text,
        mode: pre.mode,
        options: pre.options,
        output: result.output,
      });
      const mergedResult = { ...result, output: post.output };
      return { ...mergedResult, isQuery: pre.mode !== 'compress' };
    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }

  /** Stable, versioned response contract for SDK/API consumers. */
  public optimizeStable(text: string, options: StableOptimizeOptions = {}): PithResultV1 {
    const startedAt = Date.now();
    const mode = options.mode && options.mode !== 'auto' ? options.mode : this.detectMode(text);
    const legacy = this.optimize(text, options);
    const ir = parseIntentIR(text);
    const machinePrompt = generateMachinePrompt(ir);
    const endedAt = Date.now();
    const explanations: string[] = [];
    if (options.explain) {
      explanations.push(`mode=${mode}`);
      explanations.push(`isQuery=${legacy.isQuery}`);
      explanations.push(`noiseRemoved=${legacy.noiseRemoved}`);
      explanations.push(`ir.action=${ir.intent.action}`);
      explanations.push(`ir.format=${ir.constraints.outputFormat}`);
    }
    return {
      schemaVersion: '1.1.0',
      mode,
      output: legacy.output,
      noiseRemoved: legacy.noiseRemoved,
      isQuery: legacy.isQuery,
      ir,
      machinePrompt,
      meta: {
        elapsedMs: Math.max(0, endedAt - startedAt),
        explain: explanations,
      },
    };
  }

  /** Saída de terminal / logs / ferramentas — sem pipeline lexical de prompts. */
  public optimizeDevOutput(text: string, options: DevOutputOptions = {}): { output: string; noiseRemoved: number } {
    return devOutputPipeline(text, options);
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
    const decision = this.detectModeWithConfidence(text);
    return decision.mode;
  }

  private detectModeWithConfidence(text: string): {
    mode: 'compress' | 'query' | 'conversational';
    confidence: number;
    uncertain: boolean;
  } {
    const words = text.split(/\s+/).length;
    const nonEmptyLines = text.split('\n').filter(l => l.trim()).length;
    const qCount = (text.match(/\?/g) || []).length;
    const hasQuestion = qCount > 0;
    const hasCodeFence = /```/.test(text);
    const hasNumberedList = /^\s*\d+\.\s/m.test(text);
    const hasBulletList = /^\s*[-•–]\s/m.test(text);
    const looksLikeSpec = this.looksLikeSpecBrief(text);
    const looksTechnicalQuery =
      /\b(llm|token|tokens|prompt|output|input|api|backend|worker|sqs|dlq|retry|idempot[eê]ncia)\b/i.test(text);
    const strongCompress = this.hasStrongCompressEvidence(text, words, nonEmptyLines, hasQuestion, looksLikeSpec);

    const queryScore =
      (hasQuestion ? 4 : 0) +
      (looksLikeSpec ? 5 : 0) +
      (!hasCodeFence && !hasNumberedList && !hasBulletList ? 1 : 0) +
      (looksTechnicalQuery ? 2 : 0);

    const conversationalScore =
      (qCount >= 2 ? 6 : 0) +
      (qCount >= 2 && nonEmptyLines <= 4 ? 1 : 0) +
      (!looksTechnicalQuery ? 1 : -3);

    const compressScore =
      (words > 40 ? 3 : 0) +
      (nonEmptyLines > 3 ? 2 : 0) +
      (hasCodeFence ? 5 : 0) +
      (hasNumberedList ? 3 : 0) +
      (hasBulletList ? 3 : 0) +
      (!hasQuestion && !looksLikeSpec ? 1 : 0);

    const ranked = [
      { mode: 'query' as const, score: queryScore },
      { mode: 'conversational' as const, score: conversationalScore },
      { mode: 'compress' as const, score: compressScore },
    ].sort((a, b) => b.score - a.score);

    const top = ranked[0];
    const second = ranked[1];
    const confidence = top.score <= 0 ? 0 : (top.score - second.score) / top.score;
    const uncertain = confidence < 0.22;

    // Hard-guarantee: query-first unless compress evidence is strong and unambiguous.
    if (top.mode === 'compress' && !strongCompress) {
      return { mode: 'query', confidence, uncertain: true };
    }

    // Fail-safe: when uncertain, prefer semantic extraction over destructive compression.
    if (uncertain && top.mode === 'compress') {
      return { mode: 'query', confidence, uncertain: true };
    }
    // Conversational sem 2+ perguntas reais tende a ser falso positivo; degrade para query.
    if (uncertain && top.mode === 'conversational' && qCount < 2) {
      return { mode: 'query', confidence, uncertain: true };
    }

    return { mode: top.mode, confidence, uncertain };
  }

  private hasStrongCompressEvidence(
    text: string,
    words: number,
    nonEmptyLines: number,
    hasQuestion: boolean,
    looksLikeSpec: boolean
  ): boolean {
    const hasCodeFence = /```/.test(text);
    const hasList = /^\s*[-•–]\s/m.test(text) || /^\s*\d+\.\s/m.test(text);
    const manyLines = nonEmptyLines >= 4;
    const veryLong = words >= 45;

    if (hasQuestion || looksLikeSpec) return false;
    if (hasCodeFence) return true;
    if (hasList && nonEmptyLines >= 3) return true;
    if (manyLines) return true;
    if (veryLong) return true;
    return false;
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

  private runPluginPre(input: { text: string; mode: 'compress' | 'query' | 'conversational'; options: OptimizeOptions }): {
    text: string;
    mode: 'compress' | 'query' | 'conversational';
    options: OptimizeOptions;
  } {
    return this.plugins.reduce((acc, p) => {
      const hook = p.hooks?.beforeOptimize as PithPluginHooks['beforeOptimize'] | undefined;
      if (!hook) return acc;
      return hook(acc) ?? acc;
    }, input);
  }

  private runPluginPost(input: { text: string; mode: 'compress' | 'query' | 'conversational'; options: OptimizeOptions; output: string }): {
    output: string;
  } {
    return this.plugins.reduce((acc, p) => {
      const hook = p.hooks?.afterOptimize as PithPluginHooks['afterOptimize'] | undefined;
      if (!hook) return acc;
      return hook(input, acc) ?? acc;
    }, { output: input.output });
  }
}
