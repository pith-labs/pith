import { ADJECTIVE_SUFFIX, MAX_QUERY_NICHES, NEGATION_TOGGLE_WORD_RE, QUERY_THRESHOLD } from './constants.js';
import { isInfinitiveCandidate, isNominalLikelyShape } from './morphology.js';
import { buildOpcode, computeFlags, type OpcodeRenderOptions } from './opcode.js';
import { humanNoiseLayer } from './textLayers.js';
import { buildFreqMap, fuseProperNouns, pickVerbalAction, scoreWord, type ScoredWord } from './shared.js';

function pickBriefAction(text: string): string {
  const sectionMatch = text.match(
    /(?:^|\n)\s*(?:objetivo|escopo)\s*\n([\s\S]{0,1200})/i
  );
  const section = sectionMatch?.[1] ?? '';
  if (!section) return '';

  const verbs = Array.from(section.matchAll(/\b([a-zà-ÿ]{4,24}(?:ar|er|ir))\b/gi))
    .map(m => m[1].toLowerCase());
  if (!verbs.length) return '';

  const priority: Record<string, number> = {
    implementar: 10,
    integrar: 9,
    criar: 8,
    automatizar: 8,
    orquestrar: 8,
    definir: 7,
    ajustar: 6,
    reaproveitar: 6,
    registrar: 5,
  };

  let best = '';
  let bestScore = -Infinity;
  for (let i = 0; i < verbs.length; i++) {
    const v = verbs[i];
    const p = priority[v] ?? 0;
    const positionBoost = Math.max(0, 3 - i * 0.25);
    const score = p + positionBoost;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function queryPipeline(text: string, options: OpcodeRenderOptions = {}): { output: string; noiseRemoved: number } {
  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  let workText = cleaned.replace(/[?!.…]+$/g, '').trim();
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, '$1 $2');

  const freq = buildFreqMap(workText);
  const totalWords = workText.split(/\s+/).length;
  const words = workText.split(/\s+/);

  const sentenceStarts = new Set<number>([0]);
  for (let i = 0; i < words.length; i++) {
    if (/[.!?]$/.test(words[i]) && i + 1 < words.length) sentenceStarts.add(i + 1);
  }

  const survivors: ScoredWord[] = [];
  const unitMap: Record<string, string> = {
    'dias': 'd', 'dia': 'd', 'days': 'd', 'day': 'd',
    'meses': 'm', 'mês': 'm', 'months': 'm', 'month': 'm',
    'anos': 'y', 'ano': 'y', 'years': 'y', 'year': 'y',
    'horas': 'h', 'hora': 'h', 'hours': 'h', 'hour': 'h',
    'minutos': 'min', 'minutes': 'min',
    'semanas': 'w', 'semana': 'w', 'weeks': 'w', 'week': 'w',
  };
  const skipIndices = new Set<number>();
  let negateNext = false;
  const isQuestion = /\?/.test(text);
  const briefActionCandidate = pickBriefAction(text);
  const qActionMatch = isQuestion
    ? workText.match(/\bcomo\s+[\p{L}\p{M}]+\s+([\p{L}\p{M}]{4,24}(?:ria|aria|eria|iria|iam|ariam|eriam|iriam))\b/iu)
    : null;
  const questionActionCandidate = qActionMatch?.[1]?.toLowerCase() ?? '';

  for (let i = 0; i < words.length; i++) {
    if (skipIndices.has(i)) continue;
    const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
    if (!clean) continue;
    if (NEGATION_TOGGLE_WORD_RE.test(clean)) {
      negateNext = !negateNext;
      continue;
    }
    if (/n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i])) {
      negateNext = !negateNext;
      continue;
    }
    if (/^\d+$/.test(clean) && i + 1 < words.length) {
      const nextClean = words[i + 1].replace(/[^a-zA-ZÀ-ÿ-]/g, '').toLowerCase();
      if (unitMap[nextClean]) {
        const finalWord = negateNext ? '~' + clean + unitMap[nextClean] : clean + unitMap[nextClean];
        survivors.push({ word: finalWord, score: 100, origIdx: i });
        negateNext = false;
        skipIndices.add(i + 1);
        continue;
      }
    }

    const isSentenceStart = sentenceStarts.has(i);
    if (isSentenceStart) negateNext = false;
    const score = scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, isQuestion);

    if (score >= QUERY_THRESHOLD) {
      survivors.push({ word: negateNext ? '~' + clean : clean, score, origIdx: i });
      negateNext = false;
    }
  }

  for (let si = 0; si < survivors.length; si++) {
    const w = survivors[si].word;
    if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
      survivors[si] = { ...survivors[si], word: w.toLowerCase() };
    }
  }

  const fused = fuseProperNouns(survivors);
  const niches: { word: string; score: number }[] = [];
  const entities: string[] = [];
  const attrs: string[] = [];
  const seen = new Set<string>();

  const picked = pickVerbalAction(fused, freq, totalWords);
  let action = picked.action;
  let actionKeys = picked.actionKeys;
  const tag = '';

  const forcedAction = briefActionCandidate || questionActionCandidate;
  if (forcedAction) {
    action = '!' + forcedAction;
    actionKeys = new Set([forcedAction]);
  }

  for (const item of fused) {
    const key = item.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (/\d/.test(item.word)) {
      attrs.push('?' + item.word);
      continue;
    }
    if (
      ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) &&
      item.word.length >= 8 &&
      !/mente$/i.test(item.word) &&
      !/^(objetivo|canonica|relevante|auditavel|suficiente|resultado)$/i.test(item.word)
    ) {
      attrs.push('?' + item.word.toLowerCase());
      continue;
    }
    if (
      /^[A-Z]/.test(item.word) &&
      item.word.length >= 3 &&
      !isInfinitiveCandidate(item.word) &&
      !/^(contexto|objetivo|escopo|resultado|criterios?)$/i.test(item.word)
    ) {
      entities.push('@' + item.word);
      continue;
    }
    if (actionKeys.has(key)) continue;
    if (!action) {
      if (!isNominalLikelyShape(key)) {
        action = '!' + item.word;
      } else {
        niches.push({ word: '#' + item.word, score: item.score });
      }
    } else {
      niches.push({ word: '#' + item.word, score: item.score });
    }
  }

  const topNiches = niches
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_QUERY_NICHES)
    .map(n => n.word);

  const spec = { goal: '_' as const, cstr: '_' as const, proto: '_' as const };
  const flags = computeFlags(text);
  const finalOutput = buildOpcode('Q', {
    tag,
    action,
    goal: spec.goal,
    cstr: spec.cstr,
    proto: spec.proto,
    niches: topNiches,
    entities,
    attrs,
  }, flags, options);

  if (!finalOutput) return { output: text, noiseRemoved: 0 };

  const outputWordCount = finalOutput.split(/\s+/).length;
  const noise = originalWordCount > 0
    ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
    : 0;

  return { output: finalOutput, noiseRemoved: noise };
}
