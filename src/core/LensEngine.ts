export class LensEngine {
  // ─── Intent detection -> [tag] (Query mode only) ───
  private static readonly intentMap = new Map<string, string>([
    ['como', 'ex'], ['explicar', 'ex'], ['explique', 'ex'], ['receita', 'ex'],
    ['analisar', 'an'], ['analise', 'an'], ['mostrar', 'an'],
    ['otimizar', 'op'], ['melhorar', 'op'], ['melhore', 'op'],
    ['ideia', 'id'], ['ideias', 'id'], ['dicas', 'id'], ['sugestão', 'id'],
    ['estudar', 'st'], ['aprender', 'st'], ['estratégia', 'st'], ['plano', 'st'],
    ['corrigir', 'fx'], ['erro', 'fx'], ['bug', 'fx'],
    ['criar', 'gen'], ['gerar', 'gen'],
    ['resumir', 'sm'], ['resumo', 'sm'],
    ['task', 'tk'], ['tarefa', 'tk'],
  ]);

  // ─── Blacklist (shared by both modes) ───
  private static readonly blacklist = new Set([
    // PT linking verbs / filler
    'faço', 'como', 'ser', 'existe', 'existem', 'veja', 'sentindo', 'queria',
    'pode', 'estou', 'me', 'o', 'que', 'eu', 'para', 'no', 'na', 'do', 'da',
    'de', 'em', 'um', 'uma', 'os', 'as', 'a', 'é', 'são', 'foi', 'era',
    'com', 'por', 'dos', 'das', 'nos', 'nas', 'ao', 'aos', 'às',
    'se', 'te', 'lhe', 'ele', 'ela', 'eles', 'elas', 'nós', 'você',
    'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aquele', 'aquela',
    'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'teu', 'tua',
    'mais', 'muito', 'bem', 'já', 'ainda', 'também', 'só', 'agora',
    'então', 'mas', 'ou', 'e', 'nem', 'qual', 'quais',
    'ter', 'estar', 'fazer', 'ir', 'vir', 'dar', 'ver', 'saber',
    'quero', 'gostaria', 'poderia', 'devo', 'preciso', 'consigo',
    'olá', 'oi', 'por favor', 'obrigado', 'obrigada',
    'sobre', 'entre', 'até', 'desde', 'após', 'sem', 'sob',
    'tudo', 'nada', 'algo', 'alguém', 'ninguém', 'cada',
    'aqui', 'ali', 'lá', 'onde', 'quando', 'porque', 'pois',
    'vamos', 'sou', 'fosse', 'posso', 'usar', 'algumas', 'meio',
    'alguma', 'deveria', 'quereria', 'não', 'tão', 'quanto', 'durante',
    'ajudar', 'conseguir', 'focando',
    // EN linking/filler
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'must',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
    'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'how', 'get', 'got', 'just', 'also', 'very', 'really', 'please',
    'want', 'need', 'like', 'know', 'think', 'make', 'take',
    'there', 'here', 'where', 'when', 'why', 'if', 'then',
    'some', 'any', 'all', 'each', 'every', 'no', 'many', 'much',
    'help', 'focusing',
  ]);

  // ─── Document-mode: extra filler stripped per-line ───
  private static readonly docFiller = new Set([
    // PT connective tissue that's safe to remove inside structured docs
    'será', 'serão', 'sejam', 'seja', 'sendo', 'foram', 'seria',
    'terá', 'terão', 'tendo', 'possui', 'possuem', 'possui',
    'deverá', 'deverão', 'deve', 'devem',
    'pode', 'podem', 'poderá', 'poderão',
    'existe', 'existem', 'existir',
    'apenas', 'porém', 'contudo', 'entretanto',
    'dessa', 'desse', 'dessas', 'desses', 'nessa', 'nesse',
    'pela', 'pelo', 'pelas', 'pelos',
    'assim', 'conforme', 'segundo',
    'sim', 'não',
    // EN doc filler
    'however', 'therefore', 'furthermore', 'moreover', 'thus',
    'respectively', 'additionally', 'specifically',
  ]);

  // ─── Query-mode dictionaries ───
  private static readonly nounTranslate = new Map<string, string>([
    ['roteiro', 'itinerary'], ['viagem', 'travel'], ['dias', 'd'],
    ['templos', 'temples'], ['templo', 'temple'],
    ['eletrônicos', 'electronics'], ['eletrônico', 'electronic'],
    ['espada', 'sword'], ['receita', 'recipe'], ['bolo', 'cake'],
    ['código', 'code'], ['script', 'script'], ['jogo', 'game'],
    ['arquivo', 'file'], ['sistema', 'system'], ['projeto', 'project'],
    ['problema', 'problem'], ['solução', 'solution'], ['resultado', 'result'],
    ['carro', 'car'], ['casa', 'house'], ['comida', 'food'],
    ['música', 'music'], ['filme', 'movie'], ['livro', 'book'],
    ['logística', 'logistics'], ['tutorial', 'tutorial'],
    ['rescisão', 'termination'], ['contrato', 'contract'],
  ]);

  private static readonly outputTypes = new Set([
    'logistics', 'logística', 'tutorial', 'prático', 'prática',
    'resumo', 'summary', 'comparison', 'comparação', 'análise',
    'guide', 'guia', 'walkthrough', 'passo-a-passo', 'checklist',
  ]);

  private static readonly explicitAttrs = new Set([
    'rápido', 'barato', 'caro', 'urgente', 'gourmet', 'forte', 'fraco',
    'grande', 'pequeno', 'novo', 'velho', 'bom', 'mau', 'lendário', 'lendária',
    'fofinho', 'bonito', 'feio', 'simples', 'complexo', 'fácil', 'difícil',
    'fast', 'cheap', 'expensive', 'urgent', 'strong', 'weak', 'legendary',
    'big', 'small', 'new', 'old', 'good', 'bad', 'simple', 'complex',
    'balanced', 'equilibrado',
  ]);

  private static readonly attrSuffixPt = /^.+(ário|ária|oso|osa|ivo|iva|ável|ível|mente|inho|inha|ante|ente|udo|uda)$/i;
  private static readonly attrSuffixEn = /^.+(ary|ous|ive|able|ible|ful|less|al|ial|ic|ical|ly)$/i;

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  public optimize(text: string): { output: string; noiseRemoved: number } {
    try {
      if (!text.trim()) return { output: '[LENS: No meaningful data found]', noiseRemoved: 0 };

      // Mode detection: document vs query
      if (this.isDocument(text)) {
        return this.compressDocument(text);
      }
      return this.extractQuery(text);

    } catch (error) {
      console.error('LENS Engine Error:', error);
      return { output: text, noiseRemoved: 0 };
    }
  }

  // ═══════════════════════════════════════════════════
  // MODE DETECTION
  // ═══════════════════════════════════════════════════

  private isDocument(text: string): boolean {
    const lines = text.split('\n');
    if (lines.length < 4) return false;

    let structureSignals = 0;
    // Has numbered lists
    if (/^\s*\d+\.\s/m.test(text)) structureSignals++;
    // Has bullet points or dashes
    if (/^\s*[-•–]\s/m.test(text)) structureSignals++;
    // Has headers (lines ending with no period, followed by content)
    if (/^[A-ZÀ-Ý#].{3,80}$/m.test(text)) structureSignals++;
    // Has multiple paragraphs
    if ((text.match(/\n\s*\n/g) || []).length >= 2) structureSignals++;
    // Word count > 80
    if (text.split(/\s+/).length > 80) structureSignals++;

    return structureSignals >= 2;
  }

  // ═══════════════════════════════════════════════════
  // DOCUMENT MODE - Structural compression
  // Preserves hierarchy, strips filler, keeps meaning
  // ═══════════════════════════════════════════════════

  private compressDocument(text: string): { output: string; noiseRemoved: number } {
    const originalWordCount = text.split(/\s+/).length;

    // Preserve code blocks
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = text.match(codeBlockRegex);
    let workText = text.replace(codeBlockRegex, '\u0000CODE\u0000');

    const lines = workText.split('\n');
    const compressed: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Preserve empty lines (structure separators)
      if (!trimmed) {
        // Avoid consecutive blank lines
        if (compressed.length > 0 && compressed[compressed.length - 1] !== '') {
          compressed.push('');
        }
        continue;
      }

      // Detect line type
      const isHeader = /^#{1,6}\s/.test(trimmed) ||
                       /^\d+\.\s+[A-ZÀ-Ý]/.test(trimmed) ||
                       /^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$/.test(trimmed);
      const isBullet = /^[-•–]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);

      if (isHeader) {
        // Headers: keep as-is, they're structural
        compressed.push(this.compressLine(trimmed, true));
      } else if (isBullet) {
        // Bullet items: compress content but keep marker
        const match = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
        if (match) {
          const marker = match[1];
          const content = this.compressLine(match[2], false);
          if (content) compressed.push(marker + content);
        } else {
          compressed.push(this.compressLine(trimmed, false));
        }
      } else {
        // Regular lines: full compression
        const result = this.compressLine(trimmed, false);
        if (result) compressed.push(result);
      }
    }

    let finalOutput = compressed.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Restore code blocks
    if (codeBlocks) {
      let blockIdx = 0;
      finalOutput = finalOutput.replace(/\u0000CODE\u0000/g, () => {
        return codeBlocks[blockIdx++] || '';
      });
    }

    if (!finalOutput) return { output: text, noiseRemoved: 0 };

    const outputWordCount = finalOutput.split(/\s+/).length;
    const noisePercentage = originalWordCount > 0
      ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
      : 0;

    return { output: finalOutput, noiseRemoved: noisePercentage };
  }

  private compressLine(line: string, isHeader: boolean): string {
    // Headers get light compression - only strip obvious filler
    if (isHeader) {
      return line
        .replace(/\b(Sobre as?|Sobre os?)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    const words = line.split(/\s+/);
    const kept: string[] = [];

    for (const word of words) {
      const clean = word.replace(/^[.,;:]+|[.,;:]+$/g, '');
      if (!clean) {
        // Preserve punctuation-only tokens (structural)
        if (word) kept.push(word);
        continue;
      }

      const lower = clean.toLowerCase();

      // Strip blacklist + doc filler
      if (LensEngine.blacklist.has(lower) || LensEngine.docFiller.has(lower)) continue;

      // Keep everything else (preserves meaning)
      kept.push(word);
    }

    return kept.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  // ═══════════════════════════════════════════════════
  // QUERY MODE - Symbolic token extraction
  // [tag] !action #niche @entity %output ?attr
  // ═══════════════════════════════════════════════════

  private extractQuery(text: string): { output: string; noiseRemoved: number } {
    const originalWordCount = text.split(/\s+/).length;

    // Preserve code blocks
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = text.match(codeBlockRegex);
    let workText = text.replace(codeBlockRegex, '');

    // 1. Detect intent -> [tag]
    const lowerText = workText.toLowerCase();
    let tag = '';
    for (const [key, val] of LensEngine.intentMap.entries()) {
      if (lowerText.includes(key)) {
        tag = `[${val}]`;
        break;
      }
    }

    // 2. Strip trailing human punctuation
    workText = workText.replace(/[?!.…]+$/g, '').trim();

    // 3. Tokenize
    const rawTokens = workText.split(/\s+/);

    // 4. Entity Fusion (@) - fuse consecutive proper nouns
    const fusedTokens: string[] = [];
    let i = 0;
    while (i < rawTokens.length) {
      if (this.isProperNoun(rawTokens[i])) {
        let fused = rawTokens[i];
        let j = i + 1;
        while (j < rawTokens.length && this.isProperNoun(rawTokens[j])) {
          fused += rawTokens[j];
          j++;
        }
        if (j > i + 1) {
          fusedTokens.push('@' + fused);
        } else {
          fusedTokens.push(rawTokens[i]);
        }
        i = j;
      } else {
        fusedTokens.push(rawTokens[i]);
        i++;
      }
    }

    // 5. Classify tokens
    let action = '';
    const niches: string[] = [];
    const entities: string[] = [];
    const outputs: string[] = [];
    const attrs: string[] = [];
    const seen = new Set<string>();

    for (let idx = 0; idx < fusedTokens.length; idx++) {
      const token = fusedTokens[idx];

      // Already fused entity (@)
      if (token.startsWith('@')) {
        const key = token.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          entities.push(token);
        }
        continue;
      }

      const clean = token.replace(/^[.,;:]+|[.,;:]+$/g, '');
      if (!clean) continue;
      const lower = clean.toLowerCase();

      if (LensEngine.blacklist.has(lower)) continue;
      if (LensEngine.intentMap.has(lower)) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);

      const translated = LensEngine.nounTranslate.get(lower) || lower;

      // Number + unit fusion
      if (/^\d+$/.test(clean)) {
        const next = idx + 1 < fusedTokens.length ? fusedTokens[idx + 1].toLowerCase().replace(/[.,;:]/g, '') : '';
        const unitMap: Record<string, string> = {
          'dias': 'd', 'dia': 'd', 'days': 'd', 'day': 'd',
          'meses': 'm', 'mês': 'm', 'months': 'm', 'month': 'm',
          'anos': 'y', 'ano': 'y', 'years': 'y', 'year': 'y',
          'horas': 'h', 'hora': 'h', 'hours': 'h', 'hour': 'h',
          'minutos': 'min', 'min': 'min', 'minutes': 'min',
        };
        if (unitMap[next]) {
          attrs.push('?' + clean + unitMap[next]);
          seen.add(next);
        } else {
          attrs.push('?' + clean);
        }
        continue;
      }

      // Version/number pattern
      if (/^v?\d[\d.]*$/.test(clean)) {
        attrs.push('?' + clean);
        continue;
      }

      // Output type (%)
      if (LensEngine.outputTypes.has(lower) || LensEngine.outputTypes.has(translated)) {
        outputs.push('%' + translated);
        continue;
      }

      // Attribute (?)
      if (LensEngine.explicitAttrs.has(lower) || LensEngine.explicitAttrs.has(translated)
        || LensEngine.attrSuffixPt.test(lower) || LensEngine.attrSuffixEn.test(lower)) {
        attrs.push('?' + translated);
        continue;
      }

      // Single proper noun -> @
      if (this.isProperNoun(clean)) {
        entities.push('@' + clean);
        continue;
      }

      // Acronym -> @
      if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
        entities.push('@' + clean);
        continue;
      }

      // First noun = !action, rest = #niche
      if (!action) {
        action = '!' + translated;
      } else {
        niches.push('#' + translated);
      }
    }

    // 6. Assemble: [tag] !action #niche @entity %output ?attr
    const parts: string[] = [];
    if (tag) parts.push(tag);
    if (action) parts.push(action);
    for (const n of niches) parts.push(n);
    for (const e of entities) parts.push(e);
    for (const o of outputs) parts.push(o);
    for (const a of attrs) parts.push(a);

    let finalOutput = parts.join(' ');

    if (codeBlocks) {
      finalOutput += '\n\n' + codeBlocks.join('\n\n');
    }

    finalOutput = finalOutput.trim();

    if (!finalOutput) return { output: text, noiseRemoved: 0 };

    const outputWordCount = finalOutput.split(/\s+/).length;
    const noisePercentage = originalWordCount > 0
      ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
      : 0;

    return { output: finalOutput, noiseRemoved: noisePercentage };
  }

  private isProperNoun(word: string): boolean {
    if (!word || word.length < 2) return false;
    return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(word);
  }

  public compressCode(code: string): string {
    return code;
  }
}
