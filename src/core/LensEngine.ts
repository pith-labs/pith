export class LensEngine {
  // Intent detection -> [tag]
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

  // Absolute blacklist - 100% deletion
  private static readonly blacklist = new Set([
    // PT linking/filler
    'faço', 'como', 'ser', 'existe', 'veja', 'sentindo', 'queria', 'pode',
    'estou', 'me', 'o', 'que', 'eu', 'para', 'no', 'na', 'do', 'da',
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

  // PT->compact noun translation (deliverables & themes)
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

  // Output-type words -> %
  private static readonly outputTypes = new Set([
    'logistics', 'logística', 'tutorial', 'prático', 'prática',
    'resumo', 'summary', 'comparison', 'comparação', 'análise',
    'guide', 'guia', 'walkthrough', 'passo-a-passo', 'checklist',
  ]);

  // Explicit attributes -> ?
  private static readonly explicitAttrs = new Set([
    'rápido', 'barato', 'caro', 'urgente', 'gourmet', 'forte', 'fraco',
    'grande', 'pequeno', 'novo', 'velho', 'bom', 'mau', 'lendário', 'lendária',
    'fofinho', 'bonito', 'feio', 'simples', 'complexo', 'fácil', 'difícil',
    'fast', 'cheap', 'expensive', 'urgent', 'strong', 'weak', 'legendary',
    'big', 'small', 'new', 'old', 'good', 'bad', 'simple', 'complex',
    'balanced', 'equilibrado',
  ]);

  // Adjective suffixes for ? detection
  private static readonly attrSuffixPt = /^.+(ário|ária|oso|osa|ivo|iva|ável|ível|mente|inho|inha|ante|ente|udo|uda)$/i;
  private static readonly attrSuffixEn = /^.+(ary|ous|ive|able|ible|ful|less|al|ial|ic|ical|ly)$/i;

  public optimize(text: string): { output: string; noiseRemoved: number } {
    try {
      if (!text.trim()) return { output: '[LENS: No meaningful data found]', noiseRemoved: 0 };

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

      // 5. Classify each token
      let action = '';           // ! single core deliverable
      const niches: string[] = [];    // # themes
      const entities: string[] = [];  // @ proper nouns/locations
      const outputs: string[] = [];   // % output type
      const attrs: string[] = [];     // ? attributes
      const seen = new Set<string>();

      for (const token of fusedTokens) {
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

        // Blacklist
        if (LensEngine.blacklist.has(lower)) continue;
        // Intent words consumed by tag
        if (LensEngine.intentMap.has(lower)) continue;

        if (seen.has(lower)) continue;
        seen.add(lower);

        // Translate PT -> compact EN
        const translated = LensEngine.nounTranslate.get(lower) || lower;

        // Number attached to unit (e.g., "5" near "dias" -> fuse as ?5d)
        if (/^\d+$/.test(clean)) {
          // Look ahead for a unit word
          const idx = fusedTokens.indexOf(token);
          const next = idx + 1 < fusedTokens.length ? fusedTokens[idx + 1].toLowerCase() : '';
          const unitMap: Record<string, string> = {
            'dias': 'd', 'dia': 'd', 'days': 'd', 'day': 'd',
            'meses': 'm', 'mês': 'm', 'months': 'm', 'month': 'm',
            'anos': 'y', 'ano': 'y', 'years': 'y', 'year': 'y',
            'horas': 'h', 'hora': 'h', 'hours': 'h', 'hour': 'h',
            'minutos': 'min', 'min': 'min', 'minutes': 'min',
          };
          if (unitMap[next]) {
            attrs.push('?' + clean + unitMap[next]);
            seen.add(next); // consume the unit word
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

        // Explicit attribute or adjective suffix (?)
        if (LensEngine.explicitAttrs.has(lower) || LensEngine.explicitAttrs.has(translated)
          || LensEngine.attrSuffixPt.test(lower) || LensEngine.attrSuffixEn.test(lower)) {
          attrs.push('?' + translated);
          continue;
        }

        // Single proper noun -> @entity
        if (this.isProperNoun(clean)) {
          entities.push('@' + clean);
          continue;
        }

        // Acronym -> @entity
        if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
          entities.push('@' + clean);
          continue;
        }

        // First surviving noun = !action (the deliverable)
        // Subsequent nouns = #niche (themes)
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

      if (!finalOutput) {
        return { output: text, noiseRemoved: 0 };
      }

      const outputWordCount = finalOutput.split(/\s+/).length;
      const noisePercentage = originalWordCount > 0
        ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
        : 0;

      return { output: finalOutput, noiseRemoved: noisePercentage };

    } catch (error) {
      console.error('LENS Engine Error:', error);
      return { output: text, noiseRemoved: 0 };
    }
  }

  private isProperNoun(word: string): boolean {
    if (!word || word.length < 2) return false;
    return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(word);
  }

  public compressCode(code: string): string {
    return code;
  }
}
