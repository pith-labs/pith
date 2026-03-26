import { ABBREV, COPULA_PT_RE } from './constants.js';

/** Símbolos da `patternLayer` (sem letras → `wClean` vazio); não podem ser descartados no scoreFilter. */
export function isPatternSymbolToken(w: string): boolean {
  const t = w.trim();
  if (!t || t.includes('\u0000')) return false;
  return /^[+\-|=<>→]+$/.test(t);
}

export function humanNoiseLayer(text: string): string {
  let r = text;

  r = r.replace(/^(Hi|Hello|Hey|Greetings)[,!]?\s+/gim, '');
  r = r.replace(/^(Of course|Sure|Certainly|Absolutely|Gladly)[,!.]?\s*/gim, '');
  r = r.replace(/^(I'm happy to|I'd be happy to|Happy to)[^.!?\n]*/gim, '');
  r = r.replace(/\b(Hope this helps|Let me know if you|Feel free to ask)[^.!?\n]*/gi, '');
  r = r.replace(/\b(Please (don't hesitate|feel free) to)[^.!?\n]*/gi, '');
  r = r.replace(/\b(quero|queria|gostaria( de)?|preciso( de)?|precisamos( de)?|queremos|desejo|desejamos)\s+/gi, '');
  r = r.replace(/\bporque\b[,]?\s*/gi, '');
  r = r.replace(/\bpois\b[,]?\s*/gi, '');
  r = r.replace(/\balém disso\b[,]?\s*/gi, '+ ');
  r = r.replace(/\b(no entanto|porém|todavia|contudo|entretanto)\b[,]?\s*/gi, '| ');
  r = r.replace(/\b(portanto|logo|por isso|dessa forma|assim sendo|então|assim)\b[,]?\s*/gi, '→ ');
  r = r.replace(/\b(mesmo que|ainda que|embora)\b\s*/gi, '~ ');
  r = r.replace(/\b(para que|tudo para|a fim de que)\b\s*/gi, '');
  r = r.replace(/\b(however|nevertheless|yet|still)\b[,]?\s*/gi, '| ');
  r = r.replace(/\b(therefore|thus|hence|consequently)\b[,]?\s*/gi, '→ ');
  r = r.replace(/\b(moreover|furthermore|besides|additionally)\b[,]?\s*/gi, '+ ');
  r = r.replace(/\b(although|even though|despite|regardless)\b\s*/gi, '~ ');
  r = r.replace(/\b(so that|in order that)\b\s*/gi, '');
  r = r.replace(/\bI('ll| will) (now |proceed to |go ahead and )/gi, '');
  r = r.replace(/\bLet me (now |just )?/gi, '');
  r = r.replace(/\bI'm going to /gi, '');
  r = r.replace(/\bI (can |will )?just /gi, '');
  r = r.replace(/\b(I think|I believe|I feel|In my opinion|It seems|It appears)[,]?\s*/gi, '');
  r = r.replace(/\b(perhaps|maybe|sort of|kind of|arguably)\s+/gi, '');
  r = r.replace(/\b(Unfortunately|Fortunately|Sadly|Luckily|Great news)[,!]?\s*/gi, '');
  r = r.replace(/\bI('m| am) (excited|pleased|glad|sorry) to (say|report|share|announce)[^,.\n]*(,\s*)?/gi, '');
  r = r.replace(/\b(really|just|literally|basically|essentially|actually|simply|obviously|clearly)\s+/gi, '');
  r = r.replace(/\bin order to\b/gi, 'to');
  r = r.replace(/\bdue to the fact that\b/gi, 'because');
  r = r.replace(/\bit is (important|worth|necessary) to note that\b/gi, '');
  r = r.replace(/\bas (you may|you might|we all) know[,]?\s*/gi, '');
  r = r.replace(/\b(as mentioned|as noted|as stated) (above|before|earlier|previously)[,]?\s*/gi, '');
  r = r.replace(/\bin (the context of|terms of|the case of)\b/gi, 'for');
  r = r.replace(/\bin addition to\b/gi, '+');
  r = r.replace(/\bas a result( of)?\b/gi, '->');
  r = r.replace(/\b(the|an)\s+/gi, '');
  r = r.replace(/\bum(a|ns|as)?\s+/gi, '');

  return r;
}

export function preserveLayer(text: string): { text: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let counter = 0;
  const ph = (v: string) => { const k = `\u0000P${counter++}\u0000`; map.set(k, v); return k; };

  let r = text;
  r = r.replace(/```[\s\S]*?```/g, m => ph(m));
  r = r.replace(/https?:\/\/\S+/g, m => ph(m));
  r = r.replace(/\b[\w.-]+(?:\/[\w.-]+)+\.[\w]+\b/g, m => ph(m));
  r = r.replace(/\[[^\]]+\]/g, m => ph(m));
  r = r.replace(/\b\w+:\s?(?:True|False|true|false)\b/g, m => ph(m));
  r = r.replace(/\{\{.*?\}\}/g, m => ph(m));
  r = r.replace(/\$[A-Za-z_]\w*/g, m => ph(m));

  return { text: r, map };
}

export function patternLayer(text: string): string {
  let r = text;

  r = r.replace(/\b(\w{2,}(?:\/\w{2,}){1,})\b/g, (_m, group: string) => {
    const parts = group.split('/');
    if (parts.every((p: string) => p.length <= 6)) return group;
    const collapsed = parts.map((p: string) =>
      p.length > 4 ? p[0].toUpperCase() + p.slice(1, 3).toLowerCase() : p
    ).join('|');
    return '[' + collapsed + ']';
  });

  r = r.replace(/\band\b/gi, '+');
  r = r.replace(/\bor\b/gi, '|');
  r = r.replace(/\be\b/gi, '+');
  r = r.replace(/\bou\b/gi, '|');
  r = r.replace(/\bbefore\b/gi, '<');
  r = r.replace(/\bafter\b/gi, '>');
  r = r.replace(/\bantes( de)?\b/gi, '<');
  r = r.replace(/\bdepois( de)?\b/gi, '>');
  r = r.replace(/\bapós\b/gi, '>');
  r = r.replace(/\b(is|are|was|were)\b/gi, '=');
  r = r.replace(COPULA_PT_RE, '=');
  r = r.replace(/[Jj]ust as we have for\s+(\w+)\s+and\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);
  r = r.replace(/[Aa]ssim como (?:temos|fizemos) para\s+(\w+)\s+e\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);
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

export function abbreviate(text: string): string {
  return text.replace(/\b[a-zA-ZÀ-ÿ]{7,}\b/g, word => {
    return ABBREV.get(word.toLowerCase()) || word;
  });
}

export function restoreAndClean(text: string, map: Map<string, string>): string {
  let r = text;
  for (const [key, value] of map.entries()) r = r.replace(key, value);
  r = r.replace(/[ \t]{2,}/g, ' ');
  r = r.replace(/\n{3,}/g, '\n\n');
  return r.split('\n').map(l => l.trimEnd()).join('\n').trim();
}

export function isHeader(line: string): boolean {
  if (/^#{1,6}\s/.test(line)) return true;
  if (/^\d+\.\s+[A-ZÀ-Ý]/.test(line)) return true;
  if (/^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$/.test(line) && line.length < 80) return true;
  return false;
}
