export class LensEngine {
  // Intent detection for tagging
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
    // Portuguese linking/filler
    'faço', 'como', 'ser', 'existe', 'veja', 'sentindo', 'queria', 'pode',
    'estou', 'me', 'o', 'que', 'eu', 'para', 'no', 'na', 'do', 'da',
    'de', 'em', 'um', 'uma', 'os', 'as', 'a', 'é', 'são', 'foi', 'era',
    'com', 'por', 'dos', 'das', 'nos', 'nas', 'ao', 'aos', 'às',
    'se', 'te', 'lhe', 'ele', 'ela', 'eles', 'elas', 'nós', 'você',
    'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aquele', 'aquela',
    'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'teu', 'tua',
    'mais', 'muito', 'bem', 'já', 'ainda', 'também', 'só', 'agora',
    'então', 'mas', 'ou', 'e', 'nem', 'que', 'qual', 'quais',
    'ter', 'estar', 'fazer', 'ir', 'vir', 'dar', 'ver', 'saber',
    'quero', 'gostaria', 'poderia', 'devo', 'preciso', 'consigo',
    'olá', 'oi', 'por favor', 'obrigado', 'obrigada',
    'sobre', 'entre', 'até', 'desde', 'após', 'sem', 'sob',
    'tudo', 'nada', 'algo', 'alguém', 'ninguém', 'cada',
    'aqui', 'ali', 'lá', 'onde', 'quando', 'porque', 'pois',
    'vamos', 'sou', 'fosse', 'posso', 'usar', 'algumas', 'meio',
    'alguma', 'deveria', 'quereria', 'não', 'tão', 'quanto', 'durante',
    // English linking/filler
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
  ]);

  // Adjective suffixes for attribute detection
  private static readonly attrSuffixPt = /^.+(ário|ária|lendário|lendária|oso|osa|ivo|iva|ável|ível|mente|inho|inha|ão|ões|ante|ente|udo|uda|al|il|ar|or)$/i;
  private static readonly attrSuffixEn = /^.+(ary|ous|ive|able|ible|ful|less|ing|ed|al|ial|ic|ical|ly)$/i;
  private static readonly explicitAttrs = new Set([
    'rápido', 'barato', 'caro', 'urgente', 'gourmet', 'forte', 'fraco',
    'grande', 'pequeno', 'novo', 'velho', 'bom', 'mau', 'lendário', 'lendária',
    'fofinho', 'bonito', 'feio', 'simples', 'complexo', 'fácil', 'difícil',
    'fast', 'cheap', 'expensive', 'urgent', 'strong', 'weak', 'legendary',
    'big', 'small', 'new', 'old', 'good', 'bad', 'simple', 'complex',
  ]);

  public optimize(text: string): { output: string; noiseRemoved: number } {
    try {
      if (!text.trim()) return { output: '[LENS: No meaningful data found]', noiseRemoved: 0 };

      const originalWordCount = text.split(/\s+/).length;

      // Extract code blocks to preserve them
      const codeBlockRegex = /```[\s\S]*?```/g;
      const codeBlocks = text.match(codeBlockRegex);
      let workText = text.replace(codeBlockRegex, '');

      // 1. Detect intent tag
      const lowerText = workText.toLowerCase();
      let tag = '';
      for (const [key, val] of LensEngine.intentMap.entries()) {
        if (lowerText.includes(key)) {
          tag = `[${val}]`;
          break;
        }
      }

      // 2. Clean human punctuation from end
      workText = workText.replace(/[?!.…]+$/g, '').trim();

      // 3. Tokenize
      const rawTokens = workText.split(/\s+/);

      // 4. Entity Fusion (@) - fuse consecutive capitalized words
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
            // Multiple proper nouns fused
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

      // 5. Process each token through extraction pipeline
      const actions: string[] = [];
      const entities: string[] = [];
      const attributes: string[] = [];
      const seen = new Set<string>();

      for (const token of fusedTokens) {
        // Already fused entity
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

        // Blacklist check
        if (LensEngine.blacklist.has(lower)) continue;

        // Intent words are consumed by the tag, skip them
        if (LensEngine.intentMap.has(lower)) continue;

        const key = lower;
        if (seen.has(key)) continue;
        seen.add(key);

        // Version/number -> attribute
        if (/^v?\d[\d.]*$/.test(clean)) {
          attributes.push('?' + clean);
          continue;
        }

        // Explicit attribute or adjective suffix
        if (LensEngine.explicitAttrs.has(lower) || LensEngine.attrSuffixPt.test(lower) || LensEngine.attrSuffixEn.test(lower)) {
          attributes.push('?' + lower);
          continue;
        }

        // Single proper noun not yet fused -> entity
        if (this.isProperNoun(clean)) {
          entities.push('@' + clean);
          continue;
        }

        // Acronym (2+ uppercase chars)
        if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
          entities.push('@' + clean);
          continue;
        }

        // Everything else is a potential action noun
        actions.push(lower);
      }

      // 6. Build action token - fuse remaining nouns with hyphen
      let actionStr = '';
      if (actions.length > 0) {
        actionStr = '!' + actions.join('-');
      }

      // 7. Assemble clean output: [tag] !action @entity ?attribute
      const parts: string[] = [];
      if (tag) parts.push(tag);
      if (actionStr) parts.push(actionStr);
      for (const e of entities) parts.push(e);
      for (const a of attributes) parts.push(a);

      let finalOutput = parts.join(' ');

      // Append code blocks if any
      if (codeBlocks) {
        finalOutput += '\n\n' + codeBlocks.join('\n\n');
      }

      finalOutput = finalOutput.trim();

      if (!finalOutput) {
        return { output: text, noiseRemoved: 0 };
      }

      // Calculate noise removed
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
    // Starts with uppercase, rest is not all uppercase (that's an acronym)
    return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(word);
  }

  public compressCode(code: string): string {
    return code;
  }
}
