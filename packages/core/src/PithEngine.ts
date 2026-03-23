export class PithEngine {
  // ═══════════════════════════════════════════════════
  // MINIMAL CONFIG (domain config, not language data)
  // ═══════════════════════════════════════════════════

  // Compact abbreviations for long words (PT, EN, ES, FR, DE)
  private static readonly ABBREV = new Map<string, string>([
    // PT
    ['categorias', 'cats'], ['produtos', 'prods'],
    ['configuração', 'config'], ['configuracao', 'config'],
    ['desenvolvimento', 'dev'],
    ['documentação', 'docs'], ['documentacao', 'docs'],
    ['aplicação', 'app'], ['aplicacao', 'app'],
    ['implementação', 'impl'], ['implementacao', 'impl'],
    ['gerenciamento', 'mgmt'],
    ['informação', 'info'], ['informacao', 'info'],
    ['autenticação', 'auth'], ['autenticacao', 'auth'],
    ['ambiente', 'env'],
    ['repositório', 'repo'], ['repositorio', 'repo'],
    ['permissão', 'perm'],
    ['descrição', 'desc'],
    ['responsável', 'resp'],
    ['disponível', 'avail'],
    // EN
    ['categories', 'cats'],
    ['products', 'prods'],
    ['configuration', 'config'],
    ['development', 'dev'],
    ['documentation', 'docs'],
    ['application', 'app'],
    ['implementation', 'impl'],
    ['management', 'mgmt'],
    ['information', 'info'],
    ['authentication', 'auth'],
    ['environment', 'env'],
    ['repository', 'repo'],
    ['permission', 'perm'],
    ['description', 'desc'],
    ['responsible', 'resp'],
    ['available', 'avail'],
    // ES (Spanish)
    ['categorías', 'cats'], ['categorias', 'cats'],
    ['productos', 'prods'],
    ['configuración', 'config'], ['configuracion', 'config'],
    ['desarrollo', 'dev'],
    ['documentación', 'docs'], ['documentacion', 'docs'],
    ['aplicación', 'app'], ['aplicacion', 'app'],
    ['implementación', 'impl'], ['implementacion', 'impl'],
    ['gestión', 'mgmt'], ['gestion', 'mgmt'],
    ['información', 'info'], ['informacion', 'info'],
    ['autenticación', 'auth'], ['autenticacion', 'auth'],
    ['entorno', 'env'],
    ['repositorio', 'repo'],
    ['permiso', 'perm'],
    ['descripción', 'desc'], ['descripcion', 'desc'],
    ['disponible', 'avail'],
    // FR (French)
    ['catégories', 'cats'], ['categories', 'cats'],
    ['produits', 'prods'],
    ['configuration', 'config'],
    ['développement', 'dev'], ['developpement', 'dev'],
    ['documentation', 'docs'],
    ['application', 'app'],
    ['implémentation', 'impl'], ['implementation', 'impl'],
    ['gestion', 'mgmt'],
    ['information', 'info'],
    ['authentification', 'auth'],
    ['environnement', 'env'],
    ['dépôt', 'repo'], ['depot', 'repo'],
    ['permission', 'perm'],
    ['description', 'desc'],
    ['disponible', 'avail'],
    // DE (German)
    ['kategorien', 'cats'],
    ['produkte', 'prods'],
    ['konfiguration', 'config'],
    ['entwicklung', 'dev'],
    ['dokumentation', 'docs'],
    ['anwendung', 'app'],
    ['implementierung', 'impl'],
    ['verwaltung', 'mgmt'],
    ['information', 'info'], ['informationen', 'info'],
    ['authentifizierung', 'auth'],
    ['umgebung', 'env'],
    ['repository', 'repo'],
    ['berechtigung', 'perm'],
    ['beschreibung', 'desc'],
    ['verfügbar', 'avail'],
  ]);

  // Scoring thresholds
  private static readonly QUERY_THRESHOLD = 5;
  private static readonly COMPRESS_THRESHOLD = 4;
  private static readonly MAX_QUERY_NICHES = 4;

  /** Cópulas PT como token isolado — JS `\b` não trata letras acentuadas como `\w` (evita `técnica`→`t=cnica`). */
  private static readonly COPULA_PT_RE =
    /(?<![\p{L}\p{M}\p{N}])(é|são|está|estão|era|eram)(?![\p{L}\p{M}\p{N}])/giu;

  /** Símbolos da `patternLayer` (sem letras → `wClean` vazio); não podem ser descartados no scoreFilter. */
  private static isPatternSymbolToken(w: string): boolean {
    const t = w.trim();
    if (!t || t.includes('\u0000')) return false;
    return /^[+\-|=<>→]+$/.test(t);
  }

  /** Alterna ~ no termo seguinte; exclui sem/without — "sem ambiguidade" não é ~ambiguidade */
  private static readonly NEGATION_TOGGLE_WORD_RE = /^(não|nao|not|never|nem)$/i;

  // Morphological patterns (algorithmic, not word lists)
  // Adjective/determiner suffixes — Latin-derived morphological patterns, never verb roots
  // -ular/-olar/-lear: celular, solar, nuclear, linear, popular, molecular, circular
  // -quer/-quier: qualquer, quaisquer (PT), cualquier (ES) — grammaticalized determiners
  // -ico/-ica: genérico, histórico, dinâmico, automático, específico, público, único, lógico
  private static readonly ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|ural|olar|lear|quer|quier|ico|ica)$/i;
  private static readonly VERB_INFINITIVE = /[aei]r$/i;
  private static readonly VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;

  /** Terminações de infinitivo (romance); exclui adjetivos e falsos -er ingleses por forma. */
  private static isRomanceInfinitiveShape(lower: string): boolean {
    if (lower.length < 2 || lower.length > 24) return false;
    if (PithEngine.ADJECTIVE_SUFFIX.test(lower)) return false;
    if (lower.length > 3 && lower.endsWith('ver')) return false;
    if (/(?:ar|ir)$/i.test(lower)) return true;
    if (!/er$/i.test(lower)) return false;
    if (lower.length <= 4) return true;
    // -er longo: só forma (consoante inicial → não vogal tipo under/after)
    if (lower.length <= 18 && /^[bcdfghjklmnpqrstvwxz]/.test(lower)) return true;
    return false;
  }

  private static isInfinitiveCandidate(word: string): boolean {
    const lower = word.toLowerCase();
    return (
      word.length >= 3 &&
      word.length <= 24 &&
      !word.startsWith('~') &&
      !/\d/.test(word) &&
      !/^[A-Z]/.test(word) &&
      !PithEngine.ADJECTIVE_SUFFIX.test(lower) &&
      PithEngine.VERB_INFINITIVE.test(lower) &&
      PithEngine.isRomanceInfinitiveShape(lower)
    );
  }

  /** Gerúndio romance (-ando/-endo/-indo); sem lista de verbos. */
  private static isGerundCandidate(word: string): boolean {
    const lower = word.toLowerCase();
    return (
      word.length >= 5 &&
      word.length <= 24 &&
      !word.startsWith('~') &&
      !/\d/.test(word) &&
      !/^[A-Z]/.test(word) &&
      !PithEngine.ADJECTIVE_SUFFIX.test(lower) &&
      /(?:ando|endo|indo)$/i.test(lower)
    );
  }

  /** Superfície de verbo finito (PT), só morfologia; evita substantivo quando há condicional em -iam. */
  private static isFiniteVerbSurfaceCandidate(word: string): boolean {
    const lower = word.toLowerCase();
    if (word.length < 5 || word.length > 24) return false;
    if (word.startsWith('~') || /\d/.test(word) || /^[A-Z]/.test(word)) return false;
    if (PithEngine.ADJECTIVE_SUFFIX.test(lower)) return false;
    if (PithEngine.isNominalLikelyShape(lower)) return false;
    if (/iam$/i.test(lower)) return true;
    return false;
  }

  /** Substantivo provável só por sufixo / plurais (sem léxico). */
  private static isNominalLikelyShape(lower: string): boolean {
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

  /** Peso intratextual (sem léxico): raridade local ≈ log(N/(tf+1)) — mesmo idioma/frase. */
  private static weightInfinitiveAction(
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

  private static pickVerbalAction(
    fused: Array<{ word: string; score: number; origIdx: number }>,
    freq: Map<string, number>,
    totalWords: number
  ): { action: string; actionKeys: Set<string> } {
    const weigh = (item: { word: string; score: number; origIdx: number }) => ({
      ...item,
      score: PithEngine.weightInfinitiveAction(item.score, item.word, freq, totalWords),
    });
    const inf = fused.filter(item => PithEngine.isInfinitiveCandidate(item.word)).map(weigh);
    const ger = fused.filter(item => PithEngine.isGerundCandidate(item.word)).map(weigh);
    const fin = fused.filter(item => PithEngine.isFiniteVerbSurfaceCandidate(item.word)).map(weigh);
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
      if (PithEngine.ADJECTIVE_SUFFIX.test(k)) continue;
      if (PithEngine.isNominalLikelyShape(k)) continue;
      return { action: '!' + item.word, actionKeys: new Set([k]) };
    }
    return { action: '', actionKeys: new Set() };
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  public optimize(text: string): { output: string; noiseRemoved: number; isQuery: boolean } {
    try {
      if (!text.trim()) return { output: '[PITH: No meaningful data found]', noiseRemoved: 0, isQuery: false };

      const mode = this.detectMode(text);
      const result = mode === 'compress'
        ? this.compressPipeline(text)
        : mode === 'conversational'
          ? this.conversationalPipeline(text)
          : this.queryPipeline(text);
      return { ...result, isQuery: mode !== 'compress' };

    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }

  public compressCode(code: string): string {
    return code;
  }

  // ═══════════════════════════════════════════════════
  // MODE DETECTION (compress | query | conversational)
  // ═══════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════
  // SCORING ENGINE (core intelligence — zero word lists)
  // ═══════════════════════════════════════════════════

  private buildFreqMap(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    for (const w of text.toLowerCase().split(/\s+/)) {
      const clean = w.replace(/[^a-zA-ZÀ-ÿ]/g, '');
      if (clean) freq.set(clean, (freq.get(clean) || 0) + 1);
    }
    return freq;
  }

  private scoreWord(
    word: string,
    freq: Map<string, number>,
    totalWords: number,
    isFirstInLine: boolean,
    isSentenceStart: boolean = false,
    isQuestion: boolean = false
  ): number {
    // Always preserve tokens with symbols/digits (technical content)
    if (/\d/.test(word)) return 100;
    if (/[^a-zA-ZÀ-ÿ\s.,;:!?'"/-]/.test(word)) return 100; // Allow hyphens for hyphenated tech words

    const clean = word.replace(/[^a-zA-ZÀ-ÿ-]/g, '');
    if (!clean) return 0;

    let score = 0;

    // 1. Length signal — longer words carry more semantic weight
    score += Math.min(clean.length, 8);

    const st = clean.toLowerCase();
    if (PithEngine.isRomanceInfinitiveShape(st) && PithEngine.VERB_INFINITIVE.test(st)) {
      score += 6;
    }
    if (/(?:ando|endo|indo)$/i.test(st) && st.length >= 5) {
      score += 5;
    }

    // 1.5 Três letras: só forma (sigla vs vogais), sem lista léxica
    if (clean.length === 3) {
      if (!/[aeiouà-ú]/i.test(clean)) score += 3;
      if (isQuestion) score += 2;
    }

    // 2. Case signals — capitalization indicates entities/importance
    if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
      score += 8; // Acronym — always important
    } else if (/^[A-ZÀ-Ý]/.test(clean) && !isSentenceStart) {
      score += 5; // Mid-sentence capitalization = proper noun/entity
    }

    // 3. Frequency penalty — ubiquitous words are likely structural filler
    // Não penalizar início de oração curto: "Com", "Por" somam TF como "com"/"por" no texto
    if (totalWords > 30) {
      const ratio = (freq.get(clean.toLowerCase()) || 0) / totalWords;
      if (ratio > 0.02 && !(isSentenceStart && isFirstInLine && clean.length <= 5)) {
        score -= Math.min(Math.floor(ratio * 60), 6);
      }
    }

    // 4. Verb penalty — only conjugated forms (auxiliary/filler): -3
    // Infinitives are content verbs → no penalty (they become !action in queryPipeline)
    // Threshold ≥5 to also catch short conjugated filler: "vamos"(5), "sendo"(5), "demos"(5)
    if (clean.length >= 5 && PithEngine.VERB_CONJUGATED.test(clean.toLowerCase())) score -= 3;

    // 5. Position bonus — first word in a line is often key context
    if (isFirstInLine && !isSentenceStart) score += 2;

    // 6. Início de oração na linha — curtas mas funcionais (PT "Com", "As"; EN "Yet")
    if (isSentenceStart && isFirstInLine && clean.length >= 2 && clean.length <= 6) {
      score += 2;
    }

    return score;
  }

  // ═══════════════════════════════════════════════════
  // PIPELINE 1: COMPRESSION (universal, any text type)
  // Preserve → Pattern → Score+Filter → Abbreviate → Clean
  // ═══════════════════════════════════════════════════

  private compressPipeline(text: string): { output: string; noiseRemoved: number } {
    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;

    // Layer 1: Preserve untouchable tokens (code, URLs, brackets, key:value)
    const { text: preserved, map: preserveMap } = this.preserveLayer(cleaned);

    // Layer 2: Pattern transforms (slash-groups → [A|B|C])
    const patterned = this.patternLayer(preserved);

    // Layer 3: Score-based filtering (line by line, light threshold)
    const freq = this.buildFreqMap(patterned);
    const totalWords = patterned.split(/\s+/).length;
    const filtered = this.scoreFilterLines(patterned, freq, totalWords, PithEngine.COMPRESS_THRESHOLD);

    // Layer 4: Abbreviate long words
    const abbreviated = this.abbreviate(filtered);

    // Layer 5: Restore placeholders & clean whitespace
    const final = this.restoreAndClean(abbreviated, preserveMap).trim();

    if (!final) return { output: text, noiseRemoved: 0 };

    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode('C', { payload: final }, flags);

    const outputWordCount = final.split(/\s+/).length;
    const noise = originalWordCount > 0
      ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
      : 0;

    return { output: finalOutput, noiseRemoved: noise };
  }

  // ═══════════════════════════════════════════════════
  // PIPELINE 2: QUERY (symbolic token extraction)
  // [tag] !action #niche @entity ?attr — TAG/GOAL/CSTR/PROTO sem mapas de domínio (só scoring+morfologia)
  // ═══════════════════════════════════════════════════

  private queryPipeline(text: string): { output: string; noiseRemoved: number } {
    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;
    let workText = cleaned.replace(/[?!.…]+$/g, '').trim();

    // Normalize: insert space around punctuation used as word separators (no space after comma, slash between words)
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, '$1 $2');

    // Score all words, keep survivors
    const freq = this.buildFreqMap(workText);
    const totalWords = workText.split(/\s+/).length;
    const words = workText.split(/\s+/);

    // Detect sentence-start positions (after . ! ? or index 0)
    const sentenceStarts = new Set<number>([0]);
    for (let i = 0; i < words.length; i++) {
      if (/[.!?]$/.test(words[i]) && i + 1 < words.length) sentenceStarts.add(i + 1);
    }

    const survivors: { word: string; score: number; origIdx: number }[] = [];
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
    const isQuestion = workText.endsWith('?');

    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i)) continue;

      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
      if (!clean) continue;

      // Intent trigger words: short ones score below threshold naturally;
      // long content verbs (e.g. "melhorar", "corrigir") survive and become !action
      if (PithEngine.NEGATION_TOGGLE_WORD_RE.test(clean)) {
        negateNext = !negateNext;
        continue;
      }

      // Contracted negation: "haven't"→"havent", "doesn't"→"doesnt", "won't"→"wont" etc.
      // Pattern: original word ends in n't or 't (apostrophe-t) → negation auxiliary, skip
      if (/n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i])) {
        negateNext = !negateNext;
        continue;
      }

      // Number + unit fusion: "5 dias" → "5d"
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
      // Negation doesn't cross sentence/clause boundaries
      if (isSentenceStart) negateNext = false;

      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, isQuestion);

      if (score >= PithEngine.QUERY_THRESHOLD) {
        survivors.push({ word: negateNext ? '~' + clean : clean, score, origIdx: i });
        negateNext = false;
      }
    }

    // Normalize sentence-start survivors: lowercase unless ALLCAPS
    // "Comment" at start → "comment" (grammar cap, not entity)
    // "BFF" stays "BFF" (acronym)
    // "Elden" mid-sentence stays "Elden" (true proper noun)
    for (let si = 0; si < survivors.length; si++) {
      const w = survivors[si].word;
      if (sentenceStarts.has(survivors[si].origIdx)) {
        if (!/^[A-Z][A-Z0-9]+$/.test(w)) {
          survivors[si] = { ...survivors[si], word: w.toLowerCase() };
        }
      }
    }

    // Fuse consecutive proper nouns: [Elden, Ring] → [EldenRing]
    // Only fuses words that were originally adjacent (guards against German noun fusion)
    const fused = this.fuseProperNouns(survivors);

    // Classify into symbolic tokens by PATTERN (no word lists)
    const niches: { word: string; score: number }[] = [];
    const entities: string[] = [];
    const attrs: string[] = [];
    const seen = new Set<string>();

    const picked = PithEngine.pickVerbalAction(fused, freq, totalWords);
    let action = picked.action;
    const actionKeys = picked.actionKeys;

    const tag = '';

    for (const item of fused) {
      const key = item.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Numbers → ?attribute
      if (/\d/.test(item.word)) {
        attrs.push('?' + item.word);
        continue;
      }

      // Adjective suffix → ?attribute
      if (PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase())) {
        attrs.push('?' + item.word.toLowerCase());
        continue;
      }

      // ALLCAPS or mid-sentence Capitalized → @entity
      if (/^[A-Z]/.test(item.word)) {
        entities.push('@' + item.word);
        continue;
      }

      // Skip words already selected as action
      if (actionKeys.has(key)) continue;

      if (!action) {
        if (!PithEngine.isNominalLikelyShape(key)) {
          action = '!' + item.word;
        } else {
          niches.push({ word: '#' + item.word, score: item.score });
        }
      } else {
        niches.push({ word: '#' + item.word, score: item.score });
      }
    }

    // Cap niches: keep top MAX_QUERY_NICHES by score — most semantically dense wins
    const topNiches = niches
      .sort((a, b) => b.score - a.score)
      .slice(0, PithEngine.MAX_QUERY_NICHES)
      .map(n => n.word);

    const spec = { goal: '_' as const, cstr: '_' as const, proto: '_' as const };
    const actionOut = action;
    const nichesOut = topNiches;
    const attrsFinal = attrs;

    const parts: string[] = [];
    if (tag) parts.push(tag);
    if (actionOut) parts.push(actionOut);
    for (const n of nichesOut) parts.push(n);
    for (const e of entities) parts.push(e);
    for (const a of attrsFinal) parts.push(a);

    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode('Q', {
      tag,
      action: actionOut,
      goal: spec.goal,
      cstr: spec.cstr,
      proto: spec.proto,
      niches: nichesOut,
      entities,
      attrs: attrsFinal,
    }, flags);

    if (!finalOutput) return { output: text, noiseRemoved: 0 };

    const outputWordCount = finalOutput.split(/\s+/).length;
    const noise = originalWordCount > 0
      ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
      : 0;

    return { output: finalOutput, noiseRemoved: noise };
  }

  // ═══════════════════════════════════════════════════
  // PIPELINE 3: CONVERSATIONAL (multi-sentence, implicit intent)
  // [stance] ![action] #topic @entity ?attr
  // stance: [?]=questioning [~]=negative [~?]=both
  // ═══════════════════════════════════════════════════

  private conversationalPipeline(text: string): { output: string; noiseRemoved: number } {
    // Stance: detected from RAW text before noise removal
    const qCount = (text.match(/\?/g) || []).length;
    const negCount = (text.match(/\b(não|nao|not|never|sem|without|nem)\b|n't\b/gi) || []).length;
    let stance = '';
    if (negCount > 0 && qCount > 0) stance = '[~?]';
    else if (negCount > 0) stance = '[~]';
    else if (qCount >= 1) stance = '[?]';

    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;
    let workText = cleaned.replace(/[?!.…]+$/g, '').trim();
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, '$1 $2');

    const freq = this.buildFreqMap(workText);
    const totalWords = workText.split(/\s+/).length;
    const words = workText.split(/\s+/);
    const CONV_THRESHOLD = 5; // Lower than QUERY_THRESHOLD — capture broader context

    const sentenceStarts = new Set<number>([0]);
    for (let i = 0; i < words.length; i++) {
      if (/[.!?]$/.test(words[i]) && i + 1 < words.length) sentenceStarts.add(i + 1);
    }

    const survivors: { word: string; score: number; origIdx: number }[] = [];
    const seenLower = new Set<string>();

    const convNegRegex = /^(não|nao|not|never|sem|without|nem)$/i;
    for (let i = 0; i < words.length; i++) {
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
      if (!clean) continue;
      // Skip negation words and contracted negation (n't / 't) — stance is already captured globally
      if (convNegRegex.test(clean) || /n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i])) continue;
      const key = clean.toLowerCase();
      if (seenLower.has(key)) continue;
      seenLower.add(key);
      const isSentenceStart = sentenceStarts.has(i);
      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, false);
      if (score >= CONV_THRESHOLD) survivors.push({ word: clean, score, origIdx: i });
    }

    // Normalize sentence-start capitalization
    for (let si = 0; si < survivors.length; si++) {
      const w = survivors[si].word;
      if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
        survivors[si] = { ...survivors[si], word: w.toLowerCase() };
      }
    }

    const fused = this.fuseProperNouns(survivors);

    const picked = PithEngine.pickVerbalAction(fused, freq, totalWords);
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

      if (PithEngine.ADJECTIVE_SUFFIX.test(key)) { attrs.push('?' + key); continue; }
      if (/^[A-Z]/.test(item.word)) { entities.push('@' + item.word); continue; }
      if (actionKeys.has(key)) continue;
      if (!action) {
        if (!PithEngine.isNominalLikelyShape(key)) {
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
      .slice(0, PithEngine.MAX_QUERY_NICHES)
      .map(n => n.word);

    const spec = { goal: '_' as const, cstr: '_' as const, proto: '_' as const };
    const actionOut = action;
    const nichesOut = topNiches;

    const parts: string[] = [];
    if (stance) parts.push(stance);
    if (actionOut) parts.push(actionOut);
    for (const n of nichesOut) parts.push(n);
    for (const e of entities) parts.push(e);
    for (const a of attrs.slice(0, 3)) parts.push(a);

    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode('V', {
      stance,
      tag: '',
      action: actionOut,
      goal: spec.goal,
      cstr: spec.cstr,
      proto: spec.proto,
      niches: nichesOut,
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

  // ═══════════════════════════════════════════════════
  // SHARED LAYERS
  // ═══════════════════════════════════════════════════

  /** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
  public static isaCrc(baseWithoutCrc: string): string {
    let hash = 2166136261;
    for (let i = 0; i < baseWithoutCrc.length; i++) {
      hash ^= baseWithoutCrc.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const hex = (hash >>> 0).toString(16).toUpperCase();
    return hex.padStart(8, '0').slice(-8);
  }

  /** Flags só por forma (código, lista, densidade), sem léxico de domínio. */
  private computeFlags(originalText: string): string[] {
    const flags: string[] = [];
    const codeLike =
      /```/.test(originalText) ||
      /[;{}]{3,}/.test(originalText) ||
      /(?:[\s)\]\},;:]|\breturn)\s*=>/.test(originalText);
    if (codeLike) {
      flags.push('NE');
    }

    if (/^\s*[-*•]\s/m.test(originalText) || /^\s*\d+\.\s/m.test(originalText)) {
      flags.push('BL');
    }

    const origWords = originalText.split(/\s+/).length;
    if (origWords < 15 && flags.length === 0) {
      flags.push('DT');
    }

    return flags;
  }

  private buildOpcode(
    mode: 'Q' | 'V' | 'C',
    data: {
      stance?: string;
      tag?: string;
      action?: string;
      goal?: string;
      cstr?: string;
      proto?: string;
      niches?: string[];
      entities?: string[];
      attrs?: string[];
      payload?: string;
    },
    flags: string[]
  ): string {
    const EMPTY = '_';

    const stance = data.stance ? data.stance.replace(/[\[\]]/g, '') : '';
    const tag = data.tag ? data.tag.replace(/[\[\]]/g, '') : '';
    const action = data.action ? data.action.replace(/^!/, '') : '';
    const goal = data.goal && data.goal !== EMPTY ? data.goal : EMPTY;
    const cstr = data.cstr && data.cstr !== EMPTY ? data.cstr : EMPTY;
    const proto = data.proto && data.proto !== EMPTY ? data.proto : EMPTY;

    const niches = data.niches && data.niches.length
      ? data.niches.map(n => n.replace(/^#/, '')).filter(Boolean).join(',')
      : '';
    const entities = data.entities && data.entities.length
      ? data.entities.map(e => e.replace(/^@/, '')).filter(Boolean).join(',')
      : '';
    const attrs = data.attrs && data.attrs.length
      ? data.attrs
        .map(a => a.replace(/^\?/, ''))
        .map(a => a.replace(/^(\d+)[a-z]+$/i, '$1'))
        .filter(Boolean)
        .join(',')
      : '';

    const payload = data.payload ? data.payload.replace(/\s+/g, ' ').trim() : '';

    const flagsOut = flags.length ? flags.join(',') : '';

    // ISA v2 canonical order (all slots mandatory):
    // M IO TAG S ACT GOAL CSTR PROTO N E A P F + CRC
    const ordered = [
      `M=${mode}`,
      'IO=A2H',
      `TAG=${tag || EMPTY}`,
      `S=${stance || EMPTY}`,
      `ACT=${action || EMPTY}`,
      `GOAL=${goal}`,
      `CSTR=${cstr}`,
      `PROTO=${proto}`,
      `N=${niches || EMPTY}`,
      `E=${entities || EMPTY}`,
      `A=${attrs || EMPTY}`,
      `P=${payload || EMPTY}`,
      `F=${flagsOut || EMPTY}`,
    ];

    return ordered.join(' ');
  }

  private humanNoiseLayer(text: string): string {
    let r = text;

    // Social openers
    r = r.replace(/^(Hi|Hello|Hey|Greetings)[,!]?\s+/gim, '');
    r = r.replace(/^(Of course|Sure|Certainly|Absolutely|Gladly)[,!.]?\s*/gim, '');
    r = r.replace(/^(I'm happy to|I'd be happy to|Happy to)[^.!?\n]*/gim, '');

    // Social closers
    r = r.replace(/\b(Hope this helps|Let me know if you|Feel free to ask)[^.!?\n]*/gi, '');
    r = r.replace(/\b(Please (don't hesitate|feel free) to)[^.!?\n]*/gi, '');

    // PT intent/desire markers — pure framing, zero content
    r = r.replace(/\b(quero|queria|gostaria( de)?|preciso( de)?|precisamos( de)?|queremos|desejo|desejamos)\s+/gi, '');

    // PT causal subordinators — clause connectors, zero content payload
    r = r.replace(/\bporque\b[,]?\s*/gi, '');  // "because" (≠ "por que" = "why?")
    r = r.replace(/\bpois\b[,]?\s*/gi, '');    // "since/for/because"

    // PT connectives → symbols
    r = r.replace(/\balém disso\b[,]?\s*/gi, '+ ');
    r = r.replace(/\b(no entanto|porém|todavia|contudo|entretanto)\b[,]?\s*/gi, '| ');
    r = r.replace(/\b(portanto|logo|por isso|dessa forma|assim sendo|então|assim)\b[,]?\s*/gi, '→ ');
    r = r.replace(/\b(mesmo que|ainda que|embora)\b\s*/gi, '~ ');
    r = r.replace(/\b(para que|tudo para|a fim de que)\b\s*/gi, '');

    // EN/ES/FR connectives → symbols
    r = r.replace(/\b(however|nevertheless|yet|still)\b[,]?\s*/gi, '| ');
    r = r.replace(/\b(therefore|thus|hence|consequently)\b[,]?\s*/gi, '→ ');
    r = r.replace(/\b(moreover|furthermore|besides|additionally)\b[,]?\s*/gi, '+ ');
    r = r.replace(/\b(although|even though|despite|regardless)\b\s*/gi, '~ ');
    r = r.replace(/\b(so that|in order that)\b\s*/gi, '');

    // 1st-person narrative
    r = r.replace(/\bI('ll| will) (now |proceed to |go ahead and )/gi, '');
    r = r.replace(/\bLet me (now |just )?/gi, '');
    r = r.replace(/\bI'm going to /gi, '');
    r = r.replace(/\bI (can |will )?just /gi, '');

    // Hedging
    r = r.replace(/\b(I think|I believe|I feel|In my opinion|It seems|It appears)[,]?\s*/gi, '');
    r = r.replace(/\b(perhaps|maybe|sort of|kind of|arguably)\s+/gi, '');

    // Emotional framing
    r = r.replace(/\b(Unfortunately|Fortunately|Sadly|Luckily|Great news)[,!]?\s*/gi, '');
    r = r.replace(/\bI('m| am) (excited|pleased|glad|sorry) to (say|report|share|announce)[^,.\n]*(,\s*)?/gi, '');

    // Filler adverbs
    r = r.replace(/\b(really|just|literally|basically|essentially|actually|simply|obviously|clearly)\s+/gi, '');

    // Redundant constructions
    r = r.replace(/\bin order to\b/gi, 'to');
    r = r.replace(/\bdue to the fact that\b/gi, 'because');
    r = r.replace(/\bit is (important|worth|necessary) to note that\b/gi, '');
    r = r.replace(/\bas (you may|you might|we all) know[,]?\s*/gi, '');
    r = r.replace(/\b(as mentioned|as noted|as stated) (above|before|earlier|previously)[,]?\s*/gi, '');
    r = r.replace(/\bin (the context of|terms of|the case of)\b/gi, 'for');
    r = r.replace(/\bin addition to\b/gi, '+');
    r = r.replace(/\bas a result( of)?\b/gi, '->');

    // Articles — zero semantic value for LLM
    r = r.replace(/\b(the|an)\s+/gi, '');
    r = r.replace(/\bum(a|ns|as)?\s+/gi, ''); // PT: um/uma/uns/umas

    return r;
  }

  // Preserve untouchable tokens with placeholders
  private preserveLayer(text: string): { text: string; map: Map<string, string> } {
    const map = new Map<string, string>();
    let counter = 0;
    const ph = (v: string) => { const k = `\u0000P${counter++}\u0000`; map.set(k, v); return k; };

    let r = text;
    r = r.replace(/```[\s\S]*?```/g, m => ph(m));           // code blocks
    r = r.replace(/https?:\/\/\S+/g, m => ph(m));           // URLs
    r = r.replace(/\b[\w.-]+(?:\/[\w.-]+)+\.[\w]+\b/g, m => ph(m)); // file paths
    r = r.replace(/\[[^\]]+\]/g, m => ph(m));                // bracketed groups
    r = r.replace(/\b\w+:\s?(?:True|False|true|false)\b/g, m => ph(m)); // key:bool
    r = r.replace(/\{\{.*?\}\}/g, m => ph(m));               // template vars
    r = r.replace(/\$[A-Za-z_]\w*/g, m => ph(m));           // $variables

    return { text: r, map };
  }

  // Structural pattern transforms (algorithmic, not word lists)
  private patternLayer(text: string): string {
    let r = text;

    // Slash-groups: only compress when at least one part is long (>6 chars)
    // Short pairs like "gateway/client", "PT/EN", "read/write" are preserved as-is
    r = r.replace(/\b(\w{2,}(?:\/\w{2,}){1,})\b/g, (_m, group: string) => {
      const parts = group.split('/');
      if (parts.every((p: string) => p.length <= 6)) return group;
      const collapsed = parts.map((p: string) =>
        p.length > 4 ? p[0].toUpperCase() + p.slice(1, 3).toLowerCase() : p
      ).join('|');
      return '[' + collapsed + ']';
    });

    // Conjunctions → symbols
    r = r.replace(/\band\b/gi, '+');
    r = r.replace(/\bor\b/gi, '|');
    r = r.replace(/\be\b/gi, '+');   // PT
    r = r.replace(/\bou\b/gi, '|'); // PT/FR

    // Temporal relations → symbols
    r = r.replace(/\bbefore\b/gi, '<');
    r = r.replace(/\bafter\b/gi, '>');
    r = r.replace(/\bantes( de)?\b/gi, '<');
    r = r.replace(/\bdepois( de)?\b/gi, '>');
    r = r.replace(/\bapós\b/gi, '>');

    // Copulas → =
    r = r.replace(/\b(is|are|was|were)\b/gi, '=');
    r = r.replace(PithEngine.COPULA_PT_RE, '=');

    // Reference pattern: "just as we have for X and Y" → $X,$Y
    r = r.replace(/[Jj]ust as we have for\s+(\w+)\s+and\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);
    r = r.replace(/[Aa]ssim como (?:temos|fizemos) para\s+(\w+)\s+e\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);

    // Flow markers: multi-word patterns → symbols
    r = r.replace(/\baccording to\b/gi, '=>');
    r = r.replace(/\bde acordo com\b/gi, '=>');
    r = r.replace(/\bbased on\b/gi, '<-');
    r = r.replace(/\bcom base em\b/gi, '<-');
    r = r.replace(/\bshould show\b/gi, '-> show');
    r = r.replace(/\bshould display\b/gi, '-> show');
    r = r.replace(/\bdeve mostrar\b/gi, '-> show');
    r = r.replace(/\bit should\b/gi, '->');

    return r;
  }

  // Score-based line-by-line filtering
  private scoreFilterLines(text: string, freq: Map<string, number>, totalWords: number, defaultThreshold: number): string {
    const lines = text.split('\n');
    const result: string[] = [];

    const isQuestionLine = (line: string) => line.trim().endsWith('?');
    for (const line of lines) {
      const trimmed = line.trim();

      // Preserve blank lines (structure)
      if (!trimmed) {
        if (result.length > 0 && result[result.length - 1] !== '') result.push('');
        continue;
      }

      // Headers: keep as-is (structural markers)
      if (this.isHeader(trimmed)) {
        result.push(trimmed);
        continue;
      }

      const isQuestion = isQuestionLine(trimmed);
      const bulletMatch = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
      const marker = bulletMatch ? bulletMatch[1] : '';
      let content = bulletMatch ? bulletMatch[2] : trimmed;
      // Normalize: punctuation used as word separators without spaces
      content = content.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, '$1 $3');
      const words = content.split(/\s+/);

      const lineStarts = new Set<number>([0]);
      for (let i = 0; i < words.length; i++) {
        if (/[.!?]$/.test(words[i]) && i + 1 < words.length) lineStarts.add(i + 1);
      }

      // We run the filter logic in a closure so we can retry with a lower threshold if needed
      const tryFilter = (threshold: number) => {
        // Pass 1: pre-score all words (null = negation word, Infinity = placeholder)
        const rawScores: (number | null)[] = words.map((w, i) => {
          if (w.includes('\u0000')) return Infinity;
          const wClean = w.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
          if (!wClean) {
            if (PithEngine.isPatternSymbolToken(w)) return Infinity;
            return null;
          }
          if (PithEngine.NEGATION_TOGGLE_WORD_RE.test(wClean)) return null;
          const isSentStart = lineStarts.has(i);
          return this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
        });

        // Pass 2: adjacency boost — word below threshold adjacent to strong neighbor gets pulled up
        // This preserves compound technical tokens (e.g. "API key", "rate limit") without hardcoding
        const boosted: (number | null)[] = rawScores.map((s, i) => {
          if (s === null || s === Infinity || s >= threshold) return s;
          const wClean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
          const prev = rawScores[i - 1];
          const next = rawScores[i + 1];
          const prevOk = typeof prev === 'number' && prev >= threshold;
          const nextOk = typeof next === 'number' && next >= threshold;
          // Ponte entre dois termos fortes: "fluxo de envio", "passam a ser" (só forma, sem léxico)
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

        // Pass 3: consume with negation state
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
            if (PithEngine.isPatternSymbolToken(w)) {
              // Cópula (=) após "não" — não prefixar ~ (evita "~=" ilegível)
              kept.push(w);
              negateNext = false;
            }
            continue;
          }
          if (PithEngine.NEGATION_TOGGLE_WORD_RE.test(wClean)) {
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

      // 3. Fallback Inteligente: If we decimated a sentence (only 1 or 0 words left),
      // and the original had 3+ words, lower the threshold heavily to rescue context.
      if (keptWords.length <= 1 && words.length >= 3) {
        keptWords = tryFilter(2); // Rescue threshold
      }

      const compressed = keptWords.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (compressed) result.push(marker + compressed);
    }

    return result.join('\n');
  }

  // Abbreviate known long words
  private abbreviate(text: string): string {
    return text.replace(/\b[a-zA-ZÀ-ÿ]{7,}\b/g, word => {
      return PithEngine.ABBREV.get(word.toLowerCase()) || word;
    });
  }

  // Restore placeholders and clean whitespace
  private restoreAndClean(text: string, map: Map<string, string>): string {
    let r = text;
    for (const [key, value] of map.entries()) r = r.replace(key, value);
    r = r.replace(/[ \t]{2,}/g, ' ');
    r = r.replace(/\n{3,}/g, '\n\n');
    return r.split('\n').map(l => l.trimEnd()).join('\n').trim();
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  private isHeader(line: string): boolean {
    if (/^#{1,6}\s/.test(line)) return true;
    if (/^\d+\.\s+[A-ZÀ-Ý]/.test(line)) return true;
    if (/^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$/.test(line) && line.length < 80) return true;
    return false;
  }

  private fuseProperNouns(items: { word: string; score: number; origIdx: number }[]): { word: string; score: number; origIdx: number }[] {
    const result: { word: string; score: number; origIdx: number }[] = [];
    let i = 0;

    while (i < items.length) {
      if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[i].word)) {
        let fused = items[i].word;
        let maxScore = items[i].score;
        let lastOrigIdx = items[i].origIdx;
        let j = i + 1;
        // Only fuse if the next word was originally adjacent (prevents German noun fusion)
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
}
