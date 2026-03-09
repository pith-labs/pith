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
      'tudo', 'bem', 'texto',
      // English Aggressive Blacklist
      'the', 'of', 'by', 'user', 'they', 'access', 'that',
      'to', 'chosen', 'page', 'prop', 'is', 'are', 'was', 'were', 'be', 'it', 
      'in', 'at', 'with', 'about', 'could', 'please', 'would', 'have', 'we', 'on'
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

        // 2. Machine Symbology Processing (God Mode)
        let processedText = text;

        // Strip structural labels
        processedText = processedText.replace(/(?:task|tarefa|pergunta|instrução|instrucao|instruction)s?:\s*/gi, '');

        // Extract markdown code blocks safely
        const codeBlockRegex = /```[\s\S]*?```/g;
        const codeBlocks = processedText.match(codeBlockRegex);
        if (codeBlocks) {
            processedText = processedText.replace(codeBlockRegex, ''); 
        }

        // Structural Grouping (VIP/Premiere/Stage -> [VIP|Pre|Stg])
        processedText = processedText.replace(/\b([A-Z][a-zA-Z0-9_]*)\/([A-Z][a-zA-Z0-9_]*)(?:\/([A-Z][a-zA-Z0-9_]*))?\b/g, (_match, p1, p2, p3) => {
            let res = `[${p1.substring(0,3)}|${p2.substring(0,3)}`;
            if (p3) res += `|${p3.substring(0,3)}`;
            res += ']';
            return res;
        });

        // Grouping 2 ( [Purchase/Tickets/Candy] -> [P/T/C] )
        processedText = processedText.replace(/\[([a-zA-Z0-9_\/]+)\]/g, (_match, inner) => {
            if (!inner.includes('/')) return _match;
            return '[' + inner.split('/').map((p:string) => p.substring(0,1).toUpperCase()).join('/') + ']';
        });

        // @ Local / Context
        processedText = processedText.replace(/(?:when they access|na página de|no contexto de)\s+([a-zA-Z0-9_]+)'?s?(?:\s+page|\s+context)?/gi, '@$1:');
        
        // ! Action
        processedText = processedText.replace(/(?:display|should show|obrigatório|deve mostrar|show)/gi, '!show');
        
        // => Flow / Result
        processedText = processedText.replace(/(?:according to|de acordo com|então|then)/gi, '=>');
        
        // $ Reference / Condition
        processedText = processedText.replace(/(?:just as we have for|based on(?: the type of)?|like|como o|referência)/gi, '$');
        
        // ? Condition / Requirement
        processedText = processedText.replace(/(?:that have the prop|tem que ter|onde|where|must have)/gi, '?');

        // + Logical AND
        processedText = processedText.replace(/\s+and\s+/gi, '+');

        // Remove possessives ('s)
        processedText = processedText.replace(/'s/gi, '');

        // Abbreviate long tech nouns
        processedText = processedText.replace(/\b(categories|category)\b/gi, 'cats');
        processedText = processedText.replace(/\b(products|product)\b/gi, 'prod');
        processedText = processedText.replace(/\b(tickets|ticket)\b/gi, 'tkt');

        // 3. Extraction & Semantic Filtering
        const tokens = processedText.split(/\s+/);
        const keptTokens: string[] = [];
        const seenTokens = new Set<string>();
        let originalWordCount = text.split(/\s+/).length; // Base noise on original unmodified length
        
        for (let token of tokens) {
            let cleanToken = token;
            
            // Strip trailing generic punctuation unless it's a bracket/logic symbol
            if (!/[\]=:\->}]+$/.test(cleanToken)) {
                 cleanToken = cleanToken.replace(/^[.,]+|[.,]+$/g, '');
            }
            if (!cleanToken) continue;

            const lw = cleanToken.toLowerCase();

            // Intent words logic
            if (LensEngine.taskMappings.has(lw) || LensEngine.contextMappings.has(lw)) {
                continue;
            }

            // --- SEMANTIC WHITE-LIST RULES ---
            let shouldKeep = false;
            
            // 1. Structural Formatting / Logic (Symbols: @, !, =>, ?, $, +, Brackets, Slashes, Colons, Equals)
            if (/[\[\]\/=:\-<>{}+*&|^%()$#@!~?]/.test(cleanToken)) {
                shouldKeep = true;
            }
            // 2. Proper Nouns / Acronyms / Numbers
            else if (/^[A-Z]/.test(cleanToken) || /\d/.test(cleanToken)) {
                shouldKeep = true;
            }
            // 3. Fluff Slaughter (The Kill): Drop if in the massive bilingual blacklist
            else if (!LensEngine.fluffWords.has(lw)) {
                // Technical lowercase noun
                shouldKeep = true;
            }

            if (shouldKeep) {
                // Deduplication logic
                const dedupKey = /[A-Z]/.test(cleanToken) || /[\[\]\/=:\-<>{}+*&|^%()$#@!~?]/.test(cleanToken) ? cleanToken : lw;
                
                // Allow duplicate logic symbols and symbols attached to words
                if (/[@!$?=>+]/.test(cleanToken) || !seenTokens.has(dedupKey)) {
                    if (!/[@!$?=>+]/.test(cleanToken)) {
                        seenTokens.add(dedupKey);
                    }
                    
                    // Logic post-processing inline
                    let finalToken = cleanToken.replace(/:\s+/g, ':').replace(/=\s+/g, '=');
                    keptTokens.push(finalToken);
                }
            }
        }

        // 4. Assemble
        const header = Array.from(tags).join('');
        let payloadString = keptTokens.join(' ');

        if (codeBlocks) {
            payloadString += '\n\n' + codeBlocks.join('\n\n');
        }

        let finalOutput = header;
        if (payloadString) {
            finalOutput += (header ? ' ' : '') + payloadString.trim();
        }

        finalOutput = finalOutput.trim();

        if (!finalOutput) {
            return { output: text, noiseRemoved: 0 };
        }

        // Calculate Noise Removed (Massa Gorda)
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
