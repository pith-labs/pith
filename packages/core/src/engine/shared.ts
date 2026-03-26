import { ADJECTIVE_SUFFIX, NEGATION_TOGGLE_WORD_RE, VERB_CONJUGATED } from './constants.js';
import {
  isFiniteVerbSurfaceCandidate,
  isGerundCandidate,
  isInfinitiveCandidate,
  isNominalLikelyShape,
  isRomanceInfinitiveShape,
} from './morphology.js';
import { isHeader, isPatternSymbolToken } from './textLayers.js';

export type ScoredWord = { word: string; score: number; origIdx: number };

export function buildFreqMap(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().split(/\s+/)) {
    const clean = w.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (clean) freq.set(clean, (freq.get(clean) || 0) + 1);
  }
  return freq;
}

export function scoreWord(
  word: string,
  freq: Map<string, number>,
  totalWords: number,
  isFirstInLine: boolean,
  isSentenceStart: boolean = false,
  isQuestion: boolean = false
): number {
  if (/\d/.test(word)) return 100;
  if (/[^a-zA-ZÀ-ÿ\s.,;:!?'"/-]/.test(word)) return 100;

  const clean = word.replace(/[^a-zA-ZÀ-ÿ-]/g, '');
  if (!clean) return 0;

  let score = 0;
  score += Math.min(clean.length, 8);

  const st = clean.toLowerCase();
  if (isRomanceInfinitiveShape(st) && /[aei]r$/i.test(st)) {
    score += 6;
  }
  if (/(?:ando|endo|indo)$/i.test(st) && st.length >= 5) {
    score += 5;
  }

  if (clean.length === 3) {
    if (!/[aeiouà-ú]/i.test(clean)) score += 3;
    if (isQuestion) score += 2;
  }

  if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
    score += 8;
  } else if (/^[A-ZÀ-Ý]/.test(clean) && !isSentenceStart) {
    score += 5;
  }

  if (totalWords > 30) {
    const ratio = (freq.get(clean.toLowerCase()) || 0) / totalWords;
    if (ratio > 0.02 && !(isSentenceStart && isFirstInLine && clean.length <= 5)) {
      score -= Math.min(Math.floor(ratio * 60), 6);
    }
  }

  if (clean.length >= 5 && VERB_CONJUGATED.test(clean.toLowerCase())) score -= 3;
  if (isFirstInLine && !isSentenceStart) score += 2;
  if (isSentenceStart && isFirstInLine && clean.length >= 2 && clean.length <= 6) {
    score += 2;
  }

  return score;
}

function weightInfinitiveAction(
  baseScore: number,
  word: string,
  freq: Map<string, number>,
  totalWords: number
): number {
  const key = word.toLowerCase();
  const tf = freq.get(key) ?? 0;
  const idf = Math.log1p(totalWords / (tf + 1));
  return baseScore * (1 + 0.35 * idf);
}

export function pickVerbalAction(
  fused: ScoredWord[],
  freq: Map<string, number>,
  totalWords: number
): { action: string; actionKeys: Set<string> } {
  const weigh = (item: ScoredWord) => ({
    ...item,
    score: weightInfinitiveAction(item.score, item.word, freq, totalWords),
  });
  const inf = fused.filter(item => isInfinitiveCandidate(item.word)).map(weigh);
  const ger = fused.filter(item => isGerundCandidate(item.word)).map(weigh);
  const fin = fused.filter(item => isFiniteVerbSurfaceCandidate(item.word)).map(weigh);
  const merged = [...inf, ...ger, ...fin].sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const dedup: typeof merged = [];
  for (const x of merged) {
    const k = x.word.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(x);
  }
  if (dedup.length) {
    const top = dedup[0].word;
    return { action: '!' + top, actionKeys: new Set([top.toLowerCase()]) };
  }
  const sorted = [...fused].sort((a, b) => b.score - a.score);
  for (const item of sorted) {
    const k = item.word.toLowerCase();
    if (item.word.startsWith('~') || /\d/.test(item.word)) continue;
    if (/^[A-Z]/.test(item.word)) continue;
    if (ADJECTIVE_SUFFIX.test(k)) continue;
    if (isNominalLikelyShape(k)) continue;
    return { action: '!' + item.word, actionKeys: new Set([k]) };
  }
  return { action: '', actionKeys: new Set() };
}

export function fuseProperNouns(items: ScoredWord[]): ScoredWord[] {
  const result: ScoredWord[] = [];
  let i = 0;

  while (i < items.length) {
    if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[i].word)) {
      let fused = items[i].word;
      let maxScore = items[i].score;
      let lastOrigIdx = items[i].origIdx;
      let j = i + 1;
      while (j < items.length && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[j].word) && items[j].origIdx === lastOrigIdx + 1) {
        fused += items[j].word;
        maxScore = Math.max(maxScore, items[j].score);
        lastOrigIdx = items[j].origIdx;
        j++;
      }
      result.push({ word: fused, score: maxScore, origIdx: items[i].origIdx });
      i = j;
    } else {
      result.push(items[i]);
      i++;
    }
  }

  return result;
}

export function scoreFilterLines(text: string, freq: Map<string, number>, totalWords: number, defaultThreshold: number): string {
  const lines = text.split('\n');
  const result: string[] = [];

  const isQuestionLine = (line: string) => line.trim().endsWith('?');
  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (result.length > 0 && result[result.length - 1] !== '') result.push('');
      continue;
    }
    if (isHeader(trimmed)) {
      result.push(trimmed);
      continue;
    }

    const isQuestion = isQuestionLine(trimmed);
    const bulletMatch = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
    const marker = bulletMatch ? bulletMatch[1] : '';
    let content = bulletMatch ? bulletMatch[2] : trimmed;
    content = content.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
    const words = content.split(/\s+/);

    const lineStarts = new Set<number>([0]);
    for (let i = 0; i < words.length; i++) {
      if (/[.!?]$/.test(words[i]) && i + 1 < words.length) lineStarts.add(i + 1);
    }

    const tryFilter = (threshold: number) => {
      const rawScores: (number | null)[] = words.map((w, i) => {
        if (w.includes('\u0000')) return Infinity;
        const wClean = w.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
        if (!wClean) {
          if (isPatternSymbolToken(w)) return Infinity;
          return null;
        }
        if (NEGATION_TOGGLE_WORD_RE.test(wClean)) return null;
        const isSentStart = lineStarts.has(i);
        return scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
      });

      const boosted: (number | null)[] = rawScores.map((s, i) => {
        if (s === null || s === Infinity || s >= threshold) return s;
        const wClean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
        const prev = rawScores[i - 1];
        const next = rawScores[i + 1];
        const prevOk = typeof prev === 'number' && prev >= threshold;
        const nextOk = typeof next === 'number' && next >= threshold;
        if (wClean.length >= 1 && wClean.length <= 3 && prevOk && nextOk) {
          return Math.max(s ?? 0, threshold);
        }
        const neighborMax = Math.max(
          typeof prev === 'number' ? prev : -Infinity,
          typeof next === 'number' ? next : -Infinity
        );
        if (neighborMax >= threshold + 2) return (s ?? 0) + 3;
        return s;
      });

      const kept: string[] = [];
      let negateNext = false;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const s = boosted[i];
        if (w.includes('\u0000')) {
          kept.push(negateNext ? '~' + w : w);
          negateNext = false;
          continue;
        }
        const wClean = w.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
        if (!wClean) {
          if (isPatternSymbolToken(w)) {
            kept.push(w);
            negateNext = false;
          }
          continue;
        }
        if (NEGATION_TOGGLE_WORD_RE.test(wClean)) {
          negateNext = !negateNext;
          continue;
        }
        if (s !== null && s >= threshold) {
          kept.push(negateNext ? '~' + w : w);
          negateNext = false;
        }
      }
      return kept;
    };

    let keptWords = tryFilter(defaultThreshold);
    if (keptWords.length <= 1 && words.length >= 3) {
      keptWords = tryFilter(2);
    }

    const compressed = keptWords.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (compressed) result.push(marker + compressed);
  }

  return result.join('\n');
}
