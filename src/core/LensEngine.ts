export class LensEngine {
  // LENS Universal Intent Mappings
  private static readonly taskMappings = new Map<string, string>([
      ['analisar', 'an'], ['analise', 'an'], ['anl', 'an'], ['mostrar', 'an'],
      ['otimizar', 'op'], ['melhorar', 'op'], ['melhore', 'op'],
      ['ideia', 'id'], ['ideias', 'id'], ['dicas', 'id'],
      ['explicar', 'ex'], ['explique', 'ex'], ['cuidar', 'ex'],
      ['corrigir', 'fx'], ['erro', 'fx'], ['bug', 'fx'],
      ['criar', 'gen'], ['gerar', 'gen'],
      ['resumir', 'sm'], ['resumo', 'sm'],
      ['task', 'tk'], ['tarefa', 'tk']
  ]);

  private static readonly contextMappings = new Map<string, string>([
      ['código', 'sr'], ['codigo', 'sr'], ['script', 'sr'],
      ['performance', 'pf'], ['desempenho', 'pf']
  ]);

  private static readonly fluffWords = new Set([
      // Portuguese
      'que', 'o', 'a', 'os', 'as', 'para', 'com', 'me', 'dê', 'diga',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'sobre',
      'um', 'uma', 'uns', 'umas', 'como', 'qual', 'quais', 'quem', 'onde', 'quando',
      'porque', 'porquê', 'pois', 'então', 'mas', 'e', 'ou',
      'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'você', 'vocês',
      'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
      'aquele', 'aquela', 'aquilo', 'isso', 'isto', 'meu', 'minha', 'teu', 'tua',
      'seu', 'sua', 'nosso', 'nossa', 'lhe', 'lhes', 'te', 'se', 'vos',
      'vamos', 'fazer', 'falar', 'ser', 'estar', 'ter', 'deve', 'quero', 'gostaria',
      'poderia', 'por favor', 'agradeço', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite',
      'baseado', 'acordo', 'tudo', 'bem', 'texto',
      // English Aggressive Blacklist
      'just', 'as', 'we', 'have', 'for', 'based', 'on', 'the', 'type', 'of', 'and', 'by', 
      'user', 'when', 'they', 'access', 'should', 'show', 'that', 'have', 'display',
      'according', 'to', 'chosen', 'page', 'prop', 'is', 'are', 'was', 'were', 'be', 'it', 
      'we', 'have', 'like', 'in', 'at', 'with', 'about', 'could', 'please', 'would'
  ]);

  public optimize(text: string): { output: string, noiseRemoved: number } {
    try {
        if (!text.trim()) return { output: '[LENS: No meaningful data found]', noiseRemoved: 0 };

        const lowerText = text.toLowerCase();
        const tags = new Set<string>();
        
        // 1. Tagging (Intent)
        for (const [key, val] of LensEngine.taskMappings.entries()) {
            if (lowerText.includes(key)) tags.add(`[${val}]`);
        }
        for (const [key, val] of LensEngine.contextMappings.entries()) {
            if (lowerText.includes(key)) tags.add(`[${val}]`);
        }
        
        // Fallback intent if task is mentioned
        if (text.toLowerCase().includes('task') && !tags.has('[tk]')) tags.add('[tk]');

        // 2. Extraction & Semantic White-List Filtering
        let remainingText = text;

        // Strip known structural labels regardless of case
        remainingText = remainingText.replace(/(?:task|tarefa|pergunta|instrução|instrucao|instruction)s?:\s*/gi, '');

        // Extract markdown code blocks safely
        const codeBlockRegex = /```[\s\S]*?```/g;
        const codeBlocks = remainingText.match(codeBlockRegex);
        if (codeBlocks) {
            remainingText = remainingText.replace(codeBlockRegex, ''); 
        }

        // Semantic Translation rules
        remainingText = remainingText.replace(/just as we have for/gi, 'Ref:');
        remainingText = remainingText.replace(/ and /gi, '/');
        
        // Remove possessives ('s)
        remainingText = remainingText.replace(/'s/gi, '');

        // Tokenize by breaking at spaces
        const tokens = remainingText.split(/\s+/);
        const keptTokens: string[] = [];
        const seenTokens = new Set<string>();
        let originalWordCount = tokens.length;
        
        for (let token of tokens) {
            let cleanToken = token;
            
            // Allow trailing punctuation if it's attached to a logic block, otherwise strip trailing generic punctuation.
            if (!/[\]=:\->}]+$/.test(cleanToken)) {
                 cleanToken = cleanToken.replace(/^[.,!?]+|[.,!?]+$/g, '');
            }
            if (!cleanToken) continue;

            const lw = cleanToken.toLowerCase();

            // Intent words themselves are fully dropped as text since they became tags
            if (LensEngine.taskMappings.has(lw) || LensEngine.contextMappings.has(lw)) {
                continue;
            }

            // --- SEMANTIC WHITE-LIST RULES ---
            let shouldKeep = false;
            
            // 1. Structural Formatting / Logic (Brackets, Slashes, Colons, Equals, technical symbols)
            if (/[\[\]\/=:\-<>{}+*&|^%()$#@!~]/.test(cleanToken)) {
                shouldKeep = true;
            }
            // 2. Proper Nouns / Acronyms / Numbers
            else if (/^[A-Z]/.test(cleanToken) || /\d/.test(cleanToken)) {
                shouldKeep = true;
            }
            // 3. Fluff Slaughter (The Kill): Drop if in the massive bilingual blacklist
            else if (!LensEngine.fluffWords.has(lw)) {
                // If it made it here, it's a technical lowercase noun or surviving word
                shouldKeep = true;
            }

            if (shouldKeep) {
                // Deduplication logic: Only add if we haven't seen this exact token (case-insensitive deduplication for nouns, strict for logic)
                const dedupKey = /[A-Z]/.test(cleanToken) || /[\[\]\/=:\-<>{}+*&|^%()$#@!~]/.test(cleanToken) ? cleanToken : lw;
                if (!seenTokens.has(dedupKey)) {
                    seenTokens.add(dedupKey);
                    
                    // Logic post-processing inline: VIP: True -> VIP:True
                    let finalToken = cleanToken.replace(/:\s+/g, ':').replace(/=\s+/g, '=');
                    keptTokens.push(finalToken);
                }
            }
        }

        // 3. Assemble
        const header = Array.from(tags).join('');
        let payloadString = keptTokens.join(' ');

        if (codeBlocks) {
            payloadString += '\n\n' + codeBlocks.join('\n\n');
        }

        let finalOutput = header;
        // Never remove spaces between words. Tokenizers need spaces.
        if (payloadString) {
            finalOutput += (header ? ' ' : '') + payloadString.trim();
        }

        finalOutput = finalOutput.trim();

        if (!finalOutput) {
            return { output: text, noiseRemoved: 0 };
        }

        // Calculate Noise Removed (Massa Gorda)
        // Calculated based on the number of WORDS dropped rather than characters 
        // to reflect true semantic distillation.
        const keptWordCount = keptTokens.length;
        let noisePercentage = 0;
        if (originalWordCount > 0) {
            noisePercentage = Math.max(0, Math.floor(((originalWordCount - keptWordCount) / originalWordCount) * 100));
        }

        return { output: finalOutput, noiseRemoved: noisePercentage };

    } catch (error) {
        console.error("LENS Engine Error:", error);
        return { output: text, noiseRemoved: 0 }; 
    }
  }

  public compressCode(code: string): string {
    return code; 
  }
}
