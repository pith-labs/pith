export class LensEngine {
  // ═══════════════════════════════════════════════════
  // MINIMAL CONFIG (domain config, not language data)
  // ═══════════════════════════════════════════════════

  // Intent tags for query symbolic mode
  private static readonly INTENT_TAGS = new Map<string, string>([
    ['como', 'ex'], ['explicar', 'ex'], ['explique', 'ex'],
    ['how', 'ex'], ['explain', 'ex'], ['what', 'ex'],
    ['analisar', 'an'], ['analyze', 'an'], ['mostrar', 'an'],
    ['otimizar', 'op'], ['optimize', 'op'], ['melhorar', 'op'], ['improve', 'op'],
    ['ideia', 'id'], ['idea', 'id'], ['suggest', 'id'], ['dicas', 'id'],
    ['criar', 'gen'], ['create', 'gen'], ['gerar', 'gen'], ['generate', 'gen'],
    ['corrigir', 'fx'], ['fix', 'fx'], ['bug', 'fx'], ['erro', 'fx'],
    ['resumir', 'sm'], ['summarize', 'sm'],
    ['task', 'tk'], ['tarefa', 'tk'],
    ['estudar', 'st'], ['learn', 'st'], ['plano', 'st'],
  ]);

  // Compact abbreviations for long words (readability optimization)
  private static readonly ABBREV = new Map<string, string>([
    ['categories', 'cats'], ['categorias', 'cats'],
    ['products', 'prods'], ['produtos', 'prods'],
    ['configuration', 'config'], ['configuração', 'config'], ['configuracao', 'config'],
    ['development', 'dev'], ['desenvolvimento', 'dev'],
    ['documentation', 'docs'], ['documentação', 'docs'], ['documentacao', 'docs'],
    ['application', 'app'], ['aplicação', 'app'], ['aplicacao', 'app'],
    ['implementation', 'impl'], ['implementação', 'impl'], ['implementacao', 'impl'],
    ['management', 'mgmt'], ['gerenciamento', 'mgmt'],
    ['information', 'info'], ['informação', 'info'], ['informacao', 'info'],
    ['authentication', 'auth'], ['autenticação', 'auth'], ['autenticacao', 'auth'],
    ['environment', 'env'], ['ambiente', 'env'],
    ['repository', 'repo'], ['repositório', 'repo'], ['repositorio', 'repo'],
    ['permission', 'perm'], ['permissão', 'perm'],
    ['description', 'desc'], ['descrição', 'desc'],
    ['responsible', 'resp'], ['responsável', 'resp'],
    ['available', 'avail'], ['disponível', 'avail'],
  ]);

  // Scoring thresholds
  private static readonly QUERY_THRESHOLD = 5;
  private static readonly COMPRESS_THRESHOLD = 4;

  // Morphological patterns (algorithmic, not word lists)
  private static readonly ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial)$/i;
  private static readonly VERB_ENDING = /(?:[aei]r|[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?)$/i;

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  public optimize(text: string): { output: string; noiseRemoved: number } {
    try {
      if (!text.trim()) return { output: '[LENS: No meaningful data found]', noiseRemoved: 0 };

      if (this.isQuery(text)) return this.queryPipeline(text);
      return this.compressPipeline(text);

    } catch (error) {
      console.error('LENS Engine Error:', error);
      return { output: text, noiseRemoved: 0 };
    }
  }

  public compressCode(code: string): string {
    return code;
  }

  // ═══════════════════════════════════════════════════
  // MODE DETECTION
  // ═══════════════════════════════════════════════════

  private isQuery(text: string): boolean {
    if (text.split(/\s+/).length > 40) return false;
    if (text.split('\n').filter(l => l.trim()).length > 3) return false;
    if (/```/.test(text)) return false;
    if (/^\s*\d+\.\s/m.test(text)) return false;
    if (/^\s*[-•–]\s/m.test(text)) return false;
    return true;
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
  ): number {
    // Always preserve tokens with symbols/digits (technical content)
    if (/\d/.test(word)) return 100;
    if (/[^a-zA-ZÀ-ÿ\s.,;:!?'"]/.test(word)) return 100;

    const clean = word.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (!clean) return 0;

    let score = 0;

    // 1. Length signal — longer words carry more semantic weight
    score += Math.min(clean.length, 8);

    // 2. Case signals — capitalization indicates entities/importance
    //    Sentence-start words get NO cap bonus (capitalized by grammar, not meaning)
    //    ALLCAPS always gets bonus (acronyms: BFF, VIP, PY)
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

    // 4. Verb penalty — detected by suffix morphology, not word lists
    //    Only for words >= 6 chars (avoids false positives: lugar, solar, bar)
    if (clean.length >= 6 && LensEngine.VERB_ENDING.test(clean.toLowerCase())) score -= 3;

    // 5. Position bonus — first word in a line is often key context
    //    But NOT for sentence-start words (they're already at a natural advantage)
    if (isFirstInLine && !isSentenceStart) score += 2;

    return score;
  }

  // ═══════════════════════════════════════════════════
  // PIPELINE 1: COMPRESSION (universal, any text type)
  // Preserve → Pattern → Score+Filter → Abbreviate → Clean
  // ═══════════════════════════════════════════════════

  private compressPipeline(text: string): { output: string; noiseRemoved: number } {
    const originalWordCount = text.split(/\s+/).length;

    // Layer 1: Preserve untouchable tokens (code, URLs, brackets, key:value)
    const { text: preserved, map: preserveMap } = this.preserveLayer(text);

    // Layer 2: Pattern transforms (slash-groups → [A|B|C])
    const patterned = this.patternLayer(preserved);

    // Layer 3: Score-based filtering (line by line, light threshold)
    const freq = this.buildFreqMap(patterned);
    const totalWords = patterned.split(/\s+/).length;
    const filtered = this.scoreFilterLines(patterned, freq, totalWords, LensEngine.COMPRESS_THRESHOLD);

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
    const originalWordCount = text.split(/\s+/).length;
    let workText = text.replace(/[?!.…]+$/g, '').trim();

    // Detect intent tag
    const lower = workText.toLowerCase();
    let tag = '';
    for (const [key, val] of LensEngine.INTENT_TAGS.entries()) {
      if (lower.includes(key)) { tag = `[${val}]`; break; }
    }

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
    };
    const skipIndices = new Set<number>();

    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i)) continue;

      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9]/g, '');
      if (!clean) continue;

      // Intent trigger words are consumed by the tag
      if (LensEngine.INTENT_TAGS.has(clean.toLowerCase())) continue;

      // Number + unit fusion: "5 dias" → "5d"
      if (/^\d+$/.test(clean) && i + 1 < words.length) {
        const nextClean = words[i + 1].replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
        if (unitMap[nextClean]) {
          survivors.push({ word: clean + unitMap[nextClean], score: 100, origIdx: i });
          skipIndices.add(i + 1);
          continue;
        }
      }

      const isSentenceStart = sentenceStarts.has(i);
      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart);
      if (score >= LensEngine.QUERY_THRESHOLD) {
        survivors.push({ word: clean, score, origIdx: i });
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
    const fused = this.fuseProperNouns(survivors);

    // Classify into symbolic tokens by PATTERN (no word lists)
    let action = '';
    const niches: string[] = [];
    const entities: string[] = [];
    const attrs: string[] = [];
    const seen = new Set<string>();

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
      if (LensEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase())) {
        attrs.push('?' + item.word.toLowerCase());
        continue;
      }

      // ALLCAPS or mid-sentence Capitalized → @entity
      if (/^[A-Z]/.test(item.word)) {
        entities.push('@' + item.word);
        continue;
      }

      // First lowercase survivor → !action, rest → #niche
      if (!action) {
        action = '!' + item.word;
      } else {
        niches.push('#' + item.word);
      }
    }

    // Assemble: [tag] !action #niche @entity ?attr
    const parts: string[] = [];
    if (tag) parts.push(tag);
    if (action) parts.push(action);
    for (const n of niches) parts.push(n);
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
  // SHARED LAYERS
  // ═══════════════════════════════════════════════════

  // Preserve untouchable tokens with placeholders
  private preserveLayer(text: string): { text: string; map: Map<string, string> } {
    const map = new Map<string, string>();
    let counter = 0;
    const ph = (v: string) => { const k = `\u0000P${counter++}\u0000`; map.set(k, v); return k; };

    let r = text;
    r = r.replace(/```[\s\S]*?```/g, m => ph(m));           // code blocks
    r = r.replace(/https?:\/\/\S+/g, m => ph(m));           // URLs
    r = r.replace(/\[[^\]]+\]/g, m => ph(m));                // bracketed groups
    r = r.replace(/\b\w+:\s?(?:True|False|true|false)\b/g, m => ph(m)); // key:bool
    r = r.replace(/\{\{.*?\}\}/g, m => ph(m));               // template vars
    r = r.replace(/\$[A-Za-z_]\w*/g, m => ph(m));           // $variables

    return { text: r, map };
  }

  // Structural pattern transforms (algorithmic, not word lists)
  private patternLayer(text: string): string {
    let r = text;

    // Slash-groups: VIP/Premiere/Stage → [VIP|Pre|Sta]
    r = r.replace(/\b(\w{2,}(?:\/\w{2,}){1,})\b/g, (_m, group: string) => {
      const parts = group.split('/');
      const collapsed = parts.map((p: string) =>
        p.length > 4 ? p[0].toUpperCase() + p.slice(1, 3).toLowerCase() : p
      ).join('|');
      return '[' + collapsed + ']';
    });

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
  private scoreFilterLines(text: string, freq: Map<string, number>, totalWords: number, threshold: number): string {
    const lines = text.split('\n');
    const result: string[] = [];

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

      // Extract bullet marker if present
      const bulletMatch = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
      const marker = bulletMatch ? bulletMatch[1] : '';
      const content = bulletMatch ? bulletMatch[2] : trimmed;

      // Score each word, keep survivors
      const words = content.split(/\s+/);
      const kept: string[] = [];

      // Detect sentence starts within the line
      const lineStarts = new Set<number>([0]);
      for (let i = 0; i < words.length; i++) {
        if (/[.!?]$/.test(words[i]) && i + 1 < words.length) lineStarts.add(i + 1);
      }

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w.includes('\u0000')) { kept.push(w); continue; } // placeholders

        const isSentStart = lineStarts.has(i);
        const score = this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart);
        if (score >= threshold) kept.push(w);
      }

      const compressed = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (compressed) result.push(marker + compressed);
    }

    return result.join('\n');
  }

  // Abbreviate known long words
  private abbreviate(text: string): string {
    return text.replace(/\b[a-zA-ZÀ-ÿ]{7,}\b/g, word => {
      return LensEngine.ABBREV.get(word.toLowerCase()) || word;
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

  private fuseProperNouns(items: { word: string; score: number }[]): { word: string; score: number }[] {
    const result: { word: string; score: number }[] = [];
    let i = 0;

    while (i < items.length) {
      if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[i].word)) {
        let fused = items[i].word;
        let maxScore = items[i].score;
        let j = i + 1;
        while (j < items.length && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[j].word)) {
          fused += items[j].word;
          maxScore = Math.max(maxScore, items[j].score);
          j++;
        }
        result.push({ word: fused, score: maxScore });
        i = j;
      } else {
        result.push(items[i]);
        i++;
      }
    }

    return result;
  }
}
