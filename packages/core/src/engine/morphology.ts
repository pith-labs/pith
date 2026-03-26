import { ADJECTIVE_SUFFIX, VERB_INFINITIVE } from './constants.js';

/** Terminações de infinitivo (romance); exclui adjetivos e falsos -er ingleses por forma. */
export function isRomanceInfinitiveShape(lower: string): boolean {
  if (lower.length < 2 || lower.length > 24) return false;
  if (ADJECTIVE_SUFFIX.test(lower)) return false;
  if (lower.length > 3 && lower.endsWith('ver')) return false;
  if (/(?:ar|ir)$/i.test(lower)) return true;
  if (!/er$/i.test(lower)) return false;
  if (lower.length <= 4) return true;
  if (lower.length <= 18 && /^[bcdfghjklmnpqrstvwxz]/.test(lower)) return true;
  return false;
}

export function isInfinitiveCandidate(word: string): boolean {
  const lower = word.toLowerCase();
  return (
    word.length >= 3 &&
    word.length <= 24 &&
    !word.startsWith('~') &&
    !/\d/.test(word) &&
    !ADJECTIVE_SUFFIX.test(lower) &&
    VERB_INFINITIVE.test(lower) &&
    isRomanceInfinitiveShape(lower)
  );
}

/** Gerúndio romance (-ando/-endo/-indo); sem lista de verbos. */
export function isGerundCandidate(word: string): boolean {
  const lower = word.toLowerCase();
  return (
    word.length >= 5 &&
    word.length <= 24 &&
    !word.startsWith('~') &&
    !/\d/.test(word) &&
    !/^[A-Z]/.test(word) &&
    !ADJECTIVE_SUFFIX.test(lower) &&
    /(?:ando|endo|indo)$/i.test(lower)
  );
}

/** Substantivo provável só por sufixo / plurais (sem léxico). */
export function isNominalLikelyShape(lower: string): boolean {
  if (lower.length < 4) return false;
  if (
    /(?:ção|ções|dade|idade|ismo|ismos|mento|mentos|ncia|ncias|ência|ências|agem|agens|eza|ezas|ura|uras|ice|ices|ise|ises|oma|omas|ema|emas)$/i.test(
      lower
    )
  ) {
    return true;
  }
  if (lower.length >= 5 && /(?:ão|ões)$/i.test(lower)) return true;
  if (lower.length >= 6 && /(?:os|as)$/i.test(lower) && !/(?:ando|endo|indo)$/i.test(lower)) {
    return true;
  }
  if (lower.length >= 8 && /(?:ais|eis)$/i.test(lower)) return true;
  if (lower.length >= 6 && /(?:nces|sses|oses|ises)$/i.test(lower)) return true;
  if (lower.length >= 7 && /ores$/i.test(lower)) return true;
  if (lower.length >= 8 && /entes$/i.test(lower)) return true;
  if (lower.length >= 10 && /guarda$/i.test(lower)) return true;
  if (lower.length >= 7 && /eito$/i.test(lower)) return true;
  if (lower.length >= 6 && /(?:ado|ido)$/i.test(lower)) return true;
  if (lower.length >= 8 && /osto$/i.test(lower)) return true;
  if (lower.length >= 6 && /ude$/i.test(lower)) return true;
  if (lower.length >= 7 && /eto$/i.test(lower)) return true;
  return false;
}

/** Superfície de verbo finito (PT), só morfologia; evita substantivo quando há condicional em -iam. */
export function isFiniteVerbSurfaceCandidate(word: string): boolean {
  const lower = word.toLowerCase();
  if (word.length < 5 || word.length > 24) return false;
  if (word.startsWith('~') || /\d/.test(word) || /^[A-Z]/.test(word)) return false;
  if (ADJECTIVE_SUFFIX.test(lower)) return false;
  if (isNominalLikelyShape(lower)) return false;
  if (/(?:iam|ria|aria|ariam|eria|eriam|iria|iriam)$/i.test(lower)) return true;
  return false;
}
