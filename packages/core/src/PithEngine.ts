export class PithEngine {
  // ═══════════════════════════════════════════════════
  // MINIMAL CONFIG (domain config, not language data)
  // ═══════════════════════════════════════════════════

  // Intent tags for query symbolic mode (PT, EN, ES, FR, DE)
  private static readonly INTENT_TAGS = new Map<string, string>([
    // PT
    ['como', 'ex'], ['explicar', 'ex'], ['explique', 'ex'],
    ['analisar', 'an'], ['mostrar', 'an'],
    ['otimizar', 'op'], ['melhorar', 'op'],
    ['ideia', 'id'], ['dicas', 'id'],
    ['criar', 'gen'], ['gerar', 'gen'],
    ['corrigir', 'fx'], ['erro', 'fx'],
    ['resumir', 'sm'],
    ['tarefa', 'tk'],
    ['estudar', 'st'], ['plano', 'st'],
    // EN
    ['how', 'ex'], ['explain', 'ex'], ['what', 'ex'],
    ['analyze', 'an'],
    ['optimize', 'op'], ['improve', 'op'],
    ['idea', 'id'], ['suggest', 'id'],
    ['create', 'gen'], ['generate', 'gen'],
    ['fix', 'fx'], ['bug', 'fx'],
    ['summarize', 'sm'],
    ['task', 'tk'],
    ['learn', 'st'],
    // ES (Spanish)
    ['cómo', 'ex'], ['explicar', 'ex'], ['explica', 'ex'], ['qué', 'ex'],
    ['analizar', 'an'], ['analisa', 'an'],
    ['optimizar', 'op'], ['mejorar', 'op'],
    ['idea', 'id'], ['sugerir', 'id'],
    ['crear', 'gen'], ['generar', 'gen'],
    ['corregir', 'fx'], ['error', 'fx'],
    ['resumir', 'sm'],
    ['tarea', 'tk'],
    ['aprender', 'st'], ['plan', 'st'],
    // FR (French)
    ['comment', 'ex'], ['expliquer', 'ex'], ['explique', 'ex'], ['quoi', 'ex'],
    ['analyser', 'an'],
    ['optimiser', 'op'], ['améliorer', 'op'],
    ['idée', 'id'], ['suggérer', 'id'],
    ['créer', 'gen'], ['générer', 'gen'],
    ['corriger', 'fx'], ['erreur', 'fx'],
    ['résumer', 'sm'],
    ['tâche', 'tk'],
    ['apprendre', 'st'],
    // DE (German)
    ['wie', 'ex'], ['erklären', 'ex'], ['erkläre', 'ex'], ['was', 'ex'],
    ['analysieren', 'an'],
    ['optimieren', 'op'], ['verbessern', 'op'],
    ['idee', 'id'], ['vorschlagen', 'id'],
    ['erstellen', 'gen'], ['generieren', 'gen'],
    ['korrigieren', 'fx'], ['fehler', 'fx'],
    ['zusammenfassen', 'sm'],
    ['aufgabe', 'tk'],
    ['lernen', 'st'],
  ]);

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
  private static readonly QUERY_THRESHOLD = 6;
  private static readonly COMPRESS_THRESHOLD = 4;
  private static readonly MAX_QUERY_NICHES = 4;

  // Morphological patterns (algorithmic, not word lists)
  // Adjective/determiner suffixes — Latin-derived morphological patterns, never verb roots
  // -ular/-olar/-lear: celular, solar, nuclear, linear, popular, molecular, circular
  // -quer/-quier: qualquer, quaisquer (PT), cualquier (ES) — grammaticalized determiners
  // -ico/-ica: genérico, histórico, dinâmico, automático, específico, público, único, lógico
  private static readonly ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|olar|lear|quer|quier|ico|ica)$/i;
  private static readonly VERB_INFINITIVE = /[aei]r$/i;
  private static readonly VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;

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

    } catch (error) {
      console.error('Pith Engine Error:', error);
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

  // Conversational signals (pattern-based, no word lists):
  // ≥2 question marks, OR question + personal pronoun + multiple sentences
  private isConversational(text: string): boolean {
    const qCount = (text.match(/\?/g) || []).length;
    const hasPersonal = /\b(eu|tu|você|vocês|nós|I|we|you)\b/i.test(text);
    const sCount = text.split(/[.!?]+/).filter(s => s.trim().length > 2).length;
    return qCount >= 2 || (qCount >= 1 && hasPersonal && sCount >= 2);
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

    // 1.5 Short semantic lifeline: Give a baseline bump to 3-letter words if they seem important
    if (clean.length === 3) {
      if (!/[aeiouà-ú]/i.test(clean)) score += 3; // Acronyms/Tech terms (e.g. jwt, npm, sql)
      if (isQuestion) score += 2; // In questions, short words like 'how', 'que', 'why' matter more
      if (/^(bom|mal|bad|boa|bug|api|app|web)$/i.test(clean)) score += 5; // Vital short nouns/adjectives
    }

    // 2. Case signals — capitalization indicates entities/importance
    if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
      score += 8; // Acronym — always important
    } else if (/^[A-ZÀ-Ý]/.test(clean) && !isSentenceStart) {
      score += 5; // Mid-sentence capitalization = proper noun/entity
    }

    // 3. Frequency penalty — ubiquitous words are likely structural filler
    if (totalWords > 30) {
      const ratio = (freq.get(clean.toLowerCase()) || 0) / totalWords;
      if (ratio > 0.02) score -= Math.min(Math.floor(ratio * 60), 6);
    }

    // 4. Verb penalty — only conjugated forms (auxiliary/filler): -3
    // Infinitives are content verbs → no penalty (they become !action in queryPipeline)
    // Threshold ≥5 to also catch short conjugated filler: "vamos"(5), "sendo"(5), "demos"(5)
    if (clean.length >= 5 && PithEngine.VERB_CONJUGATED.test(clean.toLowerCase())) score -= 3;

    // 5. Position bonus — first word in a line is often key context
    if (isFirstInLine && !isSentenceStart) score += 2;

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
    const final = this.restoreAndClean(abbreviated, preserveMap);

    if (!final.trim()) return { output: text, noiseRemoved: 0 };

    const outputWordCount = final.split(/\s+/).length;
    const noise = originalWordCount > 0
      ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
      : 0;

    return { output: final.trim(), noiseRemoved: noise };
  }

  // ═══════════════════════════════════════════════════
  // PIPELINE 2: QUERY (symbolic token extraction)
  // [tag] !action #niche @entity ?attr
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
    const negationRegex = /^(não|nao|not|never|sem|without|nem)$/i;
    let negateNext = false;
    const isQuestion = workText.endsWith('?');

    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i)) continue;

      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
      if (!clean) continue;

      // Intent trigger words: short ones score below threshold naturally;
      // long content verbs (e.g. "melhorar", "corrigir") survive and become !action
      if (negationRegex.test(clean)) {
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

    // Action = best-scoring infinitive verb(s) among survivors (generic: VERB_INFINITIVE pattern)
    // Compound: top 2 infinitives → ![verb1|verb2]; single → !verb; fallback → first survivor
    const infinitives = fused
      .filter(item =>
        !item.word.startsWith('~') &&
        !/\d/.test(item.word) &&
        !/^[A-Z]/.test(item.word) &&
        !PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) &&
        PithEngine.VERB_INFINITIVE.test(item.word.toLowerCase())
      )
      .sort((a, b) => b.score - a.score);
    const actionWords = infinitives.slice(0, 2).map(i => i.word);
    const actionKeys = new Set(actionWords.map(w => w.toLowerCase()));
    let action = actionWords.length === 2
      ? `![${actionWords[0]}|${actionWords[1]}]`
      : actionWords.length === 1
        ? '!' + actionWords[0]
        : '';

    // Detect intent tag — action word first (semantic), fallback to full-text scan
    const lower = workText.toLowerCase();
    let tag = '';
    for (const aw of actionWords) {
      const t = PithEngine.INTENT_TAGS.get(aw.toLowerCase());
      if (t) { tag = `[${t}]`; break; }
    }
    if (!tag) {
      for (const [key, val] of PithEngine.INTENT_TAGS.entries()) {
        if (lower.includes(key)) { tag = `[${val}]`; break; }
      }
    }

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

      // First lowercase survivor → !action (fallback if no infinitive found), rest → #niche
      if (!action) {
        action = '!' + item.word;
      } else {
        niches.push({ word: '#' + item.word, score: item.score });
      }
    }

    // Cap niches: keep top MAX_QUERY_NICHES by score — most semantically dense wins
    const topNiches = niches
      .sort((a, b) => b.score - a.score)
      .slice(0, PithEngine.MAX_QUERY_NICHES)
      .map(n => n.word);

    // Assemble: [tag] !action #niche @entity ?attr
    const parts: string[] = [];
    if (tag) parts.push(tag);
    if (action) parts.push(action);
    for (const n of topNiches) parts.push(n);
    for (const e of entities) parts.push(e);
    for (const a of attrs) parts.push(a);

    const finalOutput = parts.join(' ').trim();
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
    else if (qCount >= 2) stance = '[?]';

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

    for (let i = 0; i < words.length; i++) {
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '');
      if (!clean) continue;
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

    // Compound action: top 2 infinitives (same logic as queryPipeline)
    const infinitives = fused
      .filter(item =>
        !/\d/.test(item.word) &&
        !/^[A-Z]/.test(item.word) &&
        !PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) &&
        PithEngine.VERB_INFINITIVE.test(item.word.toLowerCase())
      )
      .sort((a, b) => b.score - a.score);
    const actionWords = infinitives.slice(0, 2).map(i => i.word);
    const actionKeys = new Set(actionWords.map(w => w.toLowerCase()));
    let action = actionWords.length === 2
      ? `![${actionWords[0]}|${actionWords[1]}]`
      : actionWords.length === 1
        ? '!' + actionWords[0]
        : '';

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
      if (!action) action = '!' + item.word;
      else niches.push({ word: '#' + item.word, score: item.score });
    }

    const topNiches = niches
      .sort((a, b) => b.score - a.score)
      .slice(0, PithEngine.MAX_QUERY_NICHES)
      .map(n => n.word);

    const parts: string[] = [];
    if (stance) parts.push(stance);
    if (action) parts.push(action);
    for (const n of topNiches) parts.push(n);
    for (const e of entities) parts.push(e);
    for (const a of attrs.slice(0, 3)) parts.push(a);

    const finalOutput = parts.join(' ').trim();
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
    r = r.replace(/\b(é|são|está|estão|era|eram)\b/gi, '=');

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
    const negationRegex = /^(não|nao|not|never|sem|without|nem)$/i;

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
          if (!wClean) return null;
          if (negationRegex.test(wClean)) return null;
          const isSentStart = lineStarts.has(i);
          return this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
        });

        // Pass 2: adjacency boost — word below threshold adjacent to strong neighbor gets pulled up
        // This preserves compound technical tokens (e.g. "API key", "rate limit") without hardcoding
        const boosted: (number | null)[] = rawScores.map((s, i) => {
          if (s === null || s === Infinity || s >= threshold) return s;
          const prev = rawScores[i - 1] ?? null;
          const next = rawScores[i + 1] ?? null;
          const neighborMax = Math.max(prev ?? -Infinity, next ?? -Infinity);
          if (neighborMax >= threshold + 2) return s + 3;
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
          if (!wClean) continue;
          if (negationRegex.test(wClean)) {
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
