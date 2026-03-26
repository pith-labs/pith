import { ADJECTIVE_SUFFIX, MAX_QUERY_NICHES } from './constants.js';
import { isNominalLikelyShape } from './morphology.js';
import { buildOpcode, computeFlags } from './opcode.js';
import { humanNoiseLayer } from './textLayers.js';
import { buildFreqMap, fuseProperNouns, pickVerbalAction, scoreWord, type ScoredWord } from './shared.js';

export function conversationalPipeline(text: string): { output: string; noiseRemoved: number } {
  const qCount = (text.match(/\?/g) || []).length;
  const negCount = (text.match(/\b(não|nao|not|never|sem|without|nem)\b|n't\b/gi) || []).length;
  let stance = '';
  if (negCount > 0 && qCount > 0) stance = '[~?]';
  else if (negCount > 0) stance = '[~]';
  else if (qCount >= 1) stance = '[?]';

  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  let workText = cleaned.replace(/[?!.…]+$/g, '').trim();
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, '$1 $2');

  const freq = buildFreqMap(workText);
  const totalWords = workText.split(/\s+/).length;
  const words = workText.split(/\s+/);
  const CONV_THRESHOLD = 5;

  const sentenceStarts = new Set<number>([0]);
  for (let i = 0; i < words.length; i++) {
    if (/[.!?]$/.test(words[i]) && i + 1 < words.length) sentenceStarts.add(i + 1);
  }

  const survivors: ScoredWord[] = [];
  const seenLower = new Set<string>();

  const convNegRegex = /^(não|nao|not|never|sem|without|nem)$/i;
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
    if (!clean) continue;
    if (convNegRegex.test(clean) || /n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i])) continue;
    const key = clean.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    const isSentenceStart = sentenceStarts.has(i);
    const score = scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, false);
    if (score >= CONV_THRESHOLD) survivors.push({ word: clean, score, origIdx: i });
  }

  for (let si = 0; si < survivors.length; si++) {
    const w = survivors[si].word;
    if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
      survivors[si] = { ...survivors[si], word: w.toLowerCase() };
    }
  }

  const fused = fuseProperNouns(survivors);
  const picked = pickVerbalAction(fused, freq, totalWords);
  let action = picked.action;
  const actionKeys = picked.actionKeys;

  const niches: { word: string; score: number }[] = [];
  const entities: string[] = [];
  const attrs: string[] = [];
  const seen = new Set<string>();

  for (const item of fused) {
    const key = item.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (/\d/.test(item.word)) { attrs.push('?' + item.word); continue; }
    if (ADJECTIVE_SUFFIX.test(key)) { attrs.push('?' + key); continue; }
    if (/^[A-Z]/.test(item.word)) { entities.push('@' + item.word); continue; }
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
  const finalOutput = buildOpcode('V', {
    stance,
    tag: '',
    action,
    goal: spec.goal,
    cstr: spec.cstr,
    proto: spec.proto,
    niches: topNiches,
    entities,
    attrs: attrs.slice(0, 3),
  }, flags);

  if (!finalOutput) return { output: text, noiseRemoved: 0 };

  const outputWordCount = finalOutput.split(/\s+/).length;
  const noise = originalWordCount > 0
    ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
    : 0;

  return { output: finalOutput, noiseRemoved: noise };
}
