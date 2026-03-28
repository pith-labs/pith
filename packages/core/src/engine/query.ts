import { ADJECTIVE_SUFFIX, MAX_QUERY_NICHES, NEGATION_TOGGLE_WORD_RE, QUERY_THRESHOLD } from './constants.js';
import { isInfinitiveCandidate, isNominalLikelyShape } from './morphology.js';
import { buildOpcode, computeFlags, type OpcodeRenderOptions } from './opcode.js';
import { humanNoiseLayer } from './textLayers.js';
import { buildFreqMap, fuseProperNouns, pickVerbalAction, scoreWord, type ScoredWord } from './shared.js';

function pickBriefAction(text: string): string {
  const escopo = text.match(
    /(?:^|\n)\s*escopo\s*\n([\s\S]{0,1400}?)(?=\n\s*(?:resultado esperado|critérios? de aceite|objetivo|contexto)\s*$|$)/im
  )?.[1] ?? '';
  const objetivo = text.match(
    /(?:^|\n)\s*objetivo\s*\n([\s\S]{0,800}?)(?=\n\s*(?:escopo|resultado esperado|critérios? de aceite|contexto)\s*$|$)/im
  )?.[1] ?? '';
  const section = escopo || objetivo;
  if (!section.trim()) return '';

  const verbs = Array.from(section.matchAll(/\b([a-zà-ÿ]{4,24}(?:ar|er|ir))\b/gi)).map(m => m[1].toLowerCase());
  if (!verbs.length) return '';

  const priority: Record<string, number> = {
    separar: 11,
    classificar: 11,
    tratar: 10,
    revisar: 10,
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

  const generic: Record<string, number> = {
    fazer: -4,
    melhorar: -2,
    garantir: -2,
  };

  let best = '';
  let bestScore = -Infinity;
  for (let i = 0; i < verbs.length; i++) {
    const v = verbs[i];
    const p = priority[v] ?? 0;
    const positionBoost = Math.max(0, 3 - i * 0.25);
    const score = p + positionBoost + (generic[v] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

function rankBriefNiches(words: Array<{ word: string; score: number }>, text: string): Array<{ word: string; score: number }> {
  const lowerText = text.toLowerCase();
  const isFailureBrief =
    /\b(retry|retryable|non-retryable|dlq|redrive|transit[óo]ria|definitiv[oa]|idempot[êe]ncia)\b/i.test(text);
  if (!isFailureBrief) return words;

  const priority = (w: string): number => {
    const k = w.toLowerCase();
    let p = 0;
    if (/^(retryable|non-retryable|transitoria|transitória|definitivo|definitiva|idempotencia|idempotência|dlq|redrive)$/.test(k)) p += 12;
    if (/^(erro|falha|retry|payload|invalido|inválido|negocio|negócio|classe|acao|ação|logs)$/.test(k)) p += 6;
    if (/^(worker|rodar|resultado|hoje|passar|deixar)$/.test(k)) p -= 8;
    if (lowerText.includes(` ${k} `)) p += 1;
    return p;
  };

  return words
    .map(x => ({ ...x, score: x.score + priority(x.word) }))
    .sort((a, b) => b.score - a.score);
}

function isFailureRetryBrief(text: string): boolean {
  return /\b(retry|retryable|non-retryable|dlq|redrive|transit[óo]ria|definitiv[oa]|idempot[êe]ncia)\b/i.test(text);
}

function isFailureDomainToken(w: string): boolean {
  return /^(retryable|non-retryable|retry|dlq|redrive|transitoria|transitória|definitivo|definitiva|idempotencia|idempotência)$/i.test(w);
}

/** Pergunta de identificação (nome/site/ferramenta), não ação de domínio tipo "marketing". */
function isNameLookupQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\bqual\s+(?:é\s+)?(?:o\s+|a\s+)?(?:nome|site|ferramenta|plataforma|ferramentas)\b/i.test(text) ||
    /\b(?:que|qual)\s+(?:é\s+)?(?:o\s+|a\s+)?nome\s+(?:do|da|de)\s+/i.test(text) ||
    /\b(?:sabe|sabem|algu[eé]m\s+sabe)\s+(?:qual|o\s+que)\s+(?:é\s+)?(?:o\s+)?(?:nome|site)\b/i.test(t)
  );
}

const NAME_LOOKUP_STOP = new Set([
  'que', 'qual', 'o', 'a', 'os', 'as', 'um', 'uma', 'do', 'da', 'dos', 'das', 'de', 'no', 'na', 'nos', 'nas',
  'com', 'por', 'pelo', 'pela', 'pra', 'pro', 'e', 'ou', 'site', 'nome', 'tira', 'tire', 'tiram',
  'voce', 'você', 'cujo', 'cuja', 'esse', 'essa', 'isso', 'este', 'esta',
]);

function rankNameLookupNiches(words: Array<{ word: string; score: number }>): Array<{ word: string; score: number }> {
  return words
    .map(x => {
      const k = x.word.replace(/^#/, '').toLowerCase();
      let bonus = 0;
      if (/^(marketing|gasto|gastos|media|medias|média|médias|benchmark|spend|métrica|métricas|metrica|metricas)$/i.test(k)) {
        bonus += 22;
      }
      if (NAME_LOOKUP_STOP.has(k)) bonus -= 35;
      return { ...x, score: x.score + bonus };
    })
    .sort((a, b) => b.score - a.score);
}

/** Resumo lexical para P (forma, sem depender do opcode N). */
function pickNameLookupPayload(text: string): string {
  const n = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const parts: string[] = [];
  if (/\bmarketing\b/.test(n)) parts.push('marketing');
  if (/\bgastos?\b/.test(n)) parts.push('gasto');
  if (/\bmedias?\b/.test(n)) parts.push('media');
  if (/\b(benchmark|spend)\b/.test(n)) parts.push('benchmark');
  if (/\bsite\b/.test(n)) parts.push('nome_site');
  return parts.join(',');
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
  const isFailureBrief = isFailureRetryBrief(text);
  const isBrief =
    /(?:^|\n)\s*contexto\b/im.test(text) &&
    /(?:^|\n)\s*(?:objetivo|escopo)\b/im.test(text);
  const nameLookup = isNameLookupQuestion(text) && !isBrief;
  const isGenericBriefToken = (w: string): boolean =>
    /^(contexto|hoje|resultado|objetivo|escopo|criterios?|menos|validado|codigo|código)$/i.test(w);
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

  const forcedAction = briefActionCandidate || (nameLookup ? 'identificar' : '') || questionActionCandidate;
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
    if (isFailureBrief && isFailureDomainToken(item.word)) {
      niches.push({ word: '#' + item.word.toLowerCase(), score: item.score + 20 });
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
      !/^(contexto|objetivo|escopo|resultado|criterios?|hoje)$/i.test(item.word)
    ) {
      if (isBrief && isGenericBriefToken(item.word)) continue;
      entities.push('@' + item.word);
      continue;
    }
    if (actionKeys.has(key)) continue;
    if (isBrief && /^(fazer|melhorar|garantir|revisar|resultado|indicar|deixar|passar|hoje|contexto)$/i.test(item.word)) continue;
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

  let rankedNiches = rankBriefNiches(niches, text);
  if (nameLookup) rankedNiches = rankNameLookupNiches(rankedNiches);
  const topNiches = rankedNiches
    .filter(n => !(isBrief && isGenericBriefToken(n.word.replace(/^#/, ''))))
    .filter(n => !(isFailureBrief && /^(#?worker|#?rodar|#?hoje|#?contexto)$/i.test(n.word)))
    .filter(n => {
      if (!nameLookup) return true;
      const k = n.word.replace(/^#/, '').toLowerCase();
      return !NAME_LOOKUP_STOP.has(k);
    })
    .slice(0, MAX_QUERY_NICHES)
    .map(n => n.word);

  const spec = { goal: '_' as const, cstr: '_' as const, proto: '_' as const };
  const flags = computeFlags(text);
  const lookupPayload = nameLookup ? pickNameLookupPayload(text) : '';
  const finalOutput = buildOpcode('Q', {
    tag,
    action,
    goal: spec.goal,
    cstr: spec.cstr,
    proto: spec.proto,
    niches: topNiches,
    entities,
    attrs,
    payload: lookupPayload || undefined,
  }, flags, options);

  if (!finalOutput) return { output: text, noiseRemoved: 0 };

  const outputWordCount = finalOutput.split(/\s+/).length;
  const noise = originalWordCount > 0
    ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
    : 0;

  return { output: finalOutput, noiseRemoved: noise };
}
