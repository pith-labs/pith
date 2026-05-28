#!/usr/bin/env node

// src/cli.ts
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

// ../core/src/engine/constants.ts
var ABBREV = /* @__PURE__ */ new Map([
  // PT
  ["categorias", "cats"],
  ["produtos", "prods"],
  ["configura\xE7\xE3o", "config"],
  ["configuracao", "config"],
  ["desenvolvimento", "dev"],
  ["documenta\xE7\xE3o", "docs"],
  ["documentacao", "docs"],
  ["aplica\xE7\xE3o", "app"],
  ["aplicacao", "app"],
  ["implementa\xE7\xE3o", "impl"],
  ["implementacao", "impl"],
  ["gerenciamento", "mgmt"],
  ["informa\xE7\xE3o", "info"],
  ["informacao", "info"],
  ["autentica\xE7\xE3o", "auth"],
  ["autenticacao", "auth"],
  ["ambiente", "env"],
  ["reposit\xF3rio", "repo"],
  ["repositorio", "repo"],
  ["permiss\xE3o", "perm"],
  ["descri\xE7\xE3o", "desc"],
  ["respons\xE1vel", "resp"],
  ["dispon\xEDvel", "avail"],
  // EN
  ["categories", "cats"],
  ["products", "prods"],
  ["configuration", "config"],
  ["development", "dev"],
  ["documentation", "docs"],
  ["application", "app"],
  ["implementation", "impl"],
  ["management", "mgmt"],
  ["information", "info"],
  ["authentication", "auth"],
  ["environment", "env"],
  ["repository", "repo"],
  ["permission", "perm"],
  ["description", "desc"],
  ["responsible", "resp"],
  ["available", "avail"],
  // ES (Spanish)
  ["categor\xEDas", "cats"],
  ["categorias", "cats"],
  ["productos", "prods"],
  ["configuraci\xF3n", "config"],
  ["configuracion", "config"],
  ["desarrollo", "dev"],
  ["documentaci\xF3n", "docs"],
  ["documentacion", "docs"],
  ["aplicaci\xF3n", "app"],
  ["aplicacion", "app"],
  ["implementaci\xF3n", "impl"],
  ["implementacion", "impl"],
  ["gesti\xF3n", "mgmt"],
  ["gestion", "mgmt"],
  ["informaci\xF3n", "info"],
  ["informacion", "info"],
  ["autenticaci\xF3n", "auth"],
  ["autenticacion", "auth"],
  ["entorno", "env"],
  ["repositorio", "repo"],
  ["permiso", "perm"],
  ["descripci\xF3n", "desc"],
  ["descripcion", "desc"],
  ["disponible", "avail"],
  // FR (French)
  ["cat\xE9gories", "cats"],
  ["categories", "cats"],
  ["produits", "prods"],
  ["configuration", "config"],
  ["d\xE9veloppement", "dev"],
  ["developpement", "dev"],
  ["documentation", "docs"],
  ["application", "app"],
  ["impl\xE9mentation", "impl"],
  ["implementation", "impl"],
  ["gestion", "mgmt"],
  ["information", "info"],
  ["authentification", "auth"],
  ["environnement", "env"],
  ["d\xE9p\xF4t", "repo"],
  ["depot", "repo"],
  ["permission", "perm"],
  ["description", "desc"],
  ["disponible", "avail"],
  // DE (German)
  ["kategorien", "cats"],
  ["produkte", "prods"],
  ["konfiguration", "config"],
  ["entwicklung", "dev"],
  ["dokumentation", "docs"],
  ["anwendung", "app"],
  ["implementierung", "impl"],
  ["verwaltung", "mgmt"],
  ["information", "info"],
  ["informationen", "info"],
  ["authentifizierung", "auth"],
  ["umgebung", "env"],
  ["repository", "repo"],
  ["berechtigung", "perm"],
  ["beschreibung", "desc"],
  ["verf\xFCgbar", "avail"]
]);
var QUERY_THRESHOLD = 5;
var COMPRESS_THRESHOLD = 4;
var MAX_QUERY_NICHES = 4;
var COPULA_PT_RE = /(?<![\p{L}\p{M}\p{N}])(é|são|está|estão|era|eram)(?![\p{L}\p{M}\p{N}])/giu;
var NEGATION_TOGGLE_WORD_RE = /^(não|nao|not|never|nem)$/i;
var ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|ural|olar|lear|quer|quier|ico|ica)$/i;
var VERB_INFINITIVE = /[aei]r$/i;
var VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;

// ../core/src/engine/opcode.ts
function normalizeMachineToken(raw) {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
}
function isaCrc(baseWithoutCrc) {
  let hash = 2166136261;
  for (let i = 0; i < baseWithoutCrc.length; i++) {
    hash ^= baseWithoutCrc.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase();
  return hex.padStart(8, "0").slice(-8);
}
function computeFlags(originalText) {
  const flags = [];
  const codeLike = /```/.test(originalText) || /[;{}]{3,}/.test(originalText) || /(?:[\s)\]\},;:]|\breturn)\s*=>/.test(originalText);
  if (codeLike) {
    flags.push("NE");
  }
  if (/^\s*[-*•]\s/m.test(originalText) || /^\s*\d+\.\s/m.test(originalText)) {
    flags.push("BL");
  }
  const origWords = originalText.split(/\s+/).length;
  if (origWords < 15 && flags.length === 0) {
    flags.push("DT");
  }
  return flags;
}
function compactValue(value, key) {
  if (value === "_")
    return value;
  if (key !== "A")
    return value;
  return value.split(",").map((part) => /^\d+$/.test(part) ? `~${Number(part).toString(36)}` : part).join(",");
}
function compactOpcode(baseWithCrc) {
  const keyMap = {
    M: "m",
    IO: "i",
    TAG: "t",
    S: "s",
    ACT: "a",
    GOAL: "g",
    CSTR: "c",
    PROTO: "r",
    N: "n",
    E: "e",
    A: "x",
    P: "p",
    F: "f",
    CRC: "k"
  };
  return baseWithCrc.split(" ").map((part) => {
    const idx = part.indexOf("=");
    if (idx <= 0)
      return part;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    const outKey = keyMap[key] ?? key.toLowerCase();
    return `${outKey}:${compactValue(value, key)}`;
  }).join("|");
}
function buildOpcode(mode, data, flags, options = {}) {
  const EMPTY = "_";
  const stance = data.stance ? data.stance.replace(/[\[\]]/g, "").replace(/[^~?]/g, "") : "";
  const tag = data.tag ? normalizeMachineToken(data.tag.replace(/[\[\]]/g, "")) : "";
  const action = data.action ? normalizeMachineToken(data.action.replace(/^!/, "")) : "";
  const goal = data.goal && data.goal !== EMPTY ? data.goal : EMPTY;
  const cstr = data.cstr && data.cstr !== EMPTY ? data.cstr : EMPTY;
  const proto = data.proto && data.proto !== EMPTY ? data.proto : EMPTY;
  const niches = data.niches && data.niches.length ? data.niches.map((n) => normalizeMachineToken(n.replace(/^#/, ""))).filter(Boolean).join(",") : "";
  const entities = data.entities && data.entities.length ? data.entities.map((e) => normalizeMachineToken(e.replace(/^@/, ""))).filter(Boolean).join(",") : "";
  const attrs = data.attrs && data.attrs.length ? data.attrs.map((a) => normalizeMachineToken(a.replace(/^\?/, ""))).map((a) => a.replace(/^(\d+)[a-z]+$/i, "$1")).filter(Boolean).join(",") : "";
  const payload = data.payload ? data.payload.replace(/\s+/g, " ").trim() : "";
  const flagsOut = flags.length ? flags.join(",") : "";
  const ordered = [
    `M=${mode}`,
    "IO=A2H",
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
    `F=${flagsOut || EMPTY}`
  ];
  const base = ordered.join(" ");
  const crc = isaCrc(base);
  const full = `${base} CRC=${crc}`;
  if (!options.ultraCompact)
    return full;
  return compactOpcode(full);
}

// ../core/src/engine/textLayers.ts
function isPatternSymbolToken(w) {
  const t = w.trim();
  if (!t || t.includes("\0"))
    return false;
  return /^[+\-|=<>→]+$/.test(t);
}
function humanNoiseLayer(text) {
  let r = text;
  r = r.replace(/^(Hi|Hello|Hey|Greetings)[,!]?\s+/gim, "");
  r = r.replace(/^(Of course|Sure|Certainly|Absolutely|Gladly)[,!.]?\s*/gim, "");
  r = r.replace(/^(I'm happy to|I'd be happy to|Happy to)[^.!?\n]*/gim, "");
  r = r.replace(/\b(Hope this helps|Let me know if you|Feel free to ask)[^.!?\n]*/gi, "");
  r = r.replace(/\b(Please (don't hesitate|feel free) to)[^.!?\n]*/gi, "");
  r = r.replace(/\b(quero|queria|gostaria( de)?|preciso( de)?|precisamos( de)?|queremos|desejo|desejamos)\s+/gi, "");
  r = r.replace(/\bporque\b[,]?\s*/gi, "");
  r = r.replace(/\bpois\b[,]?\s*/gi, "");
  r = r.replace(/\balém disso\b[,]?\s*/gi, "+ ");
  r = r.replace(/\b(no entanto|porém|todavia|contudo|entretanto)\b[,]?\s*/gi, "| ");
  r = r.replace(/\b(portanto|logo|por isso|dessa forma|assim sendo|então|assim)\b[,]?\s*/gi, "\u2192 ");
  r = r.replace(/\b(mesmo que|ainda que|embora)\b\s*/gi, "~ ");
  r = r.replace(/\b(para que|tudo para|a fim de que)\b\s*/gi, "");
  r = r.replace(/\b(however|nevertheless|yet|still)\b[,]?\s*/gi, "| ");
  r = r.replace(/\b(therefore|thus|hence|consequently)\b[,]?\s*/gi, "\u2192 ");
  r = r.replace(/\b(moreover|furthermore|besides|additionally)\b[,]?\s*/gi, "+ ");
  r = r.replace(/\b(although|even though|despite|regardless)\b\s*/gi, "~ ");
  r = r.replace(/\b(so that|in order that)\b\s*/gi, "");
  r = r.replace(/\bI('ll| will) (now |proceed to |go ahead and )/gi, "");
  r = r.replace(/\bLet me (now |just )?/gi, "");
  r = r.replace(/\bI'm going to /gi, "");
  r = r.replace(/\bI (can |will )?just /gi, "");
  r = r.replace(/\b(I think|I believe|I feel|In my opinion|It seems|It appears)[,]?\s*/gi, "");
  r = r.replace(/\b(perhaps|maybe|sort of|kind of|arguably)\s+/gi, "");
  r = r.replace(/\b(Unfortunately|Fortunately|Sadly|Luckily|Great news)[,!]?\s*/gi, "");
  r = r.replace(/\bI('m| am) (excited|pleased|glad|sorry) to (say|report|share|announce)[^,.\n]*(,\s*)?/gi, "");
  r = r.replace(/\b(really|just|literally|basically|essentially|actually|simply|obviously|clearly)\s+/gi, "");
  r = r.replace(/\bin order to\b/gi, "to");
  r = r.replace(/\bdue to the fact that\b/gi, "because");
  r = r.replace(/\bit is (important|worth|necessary) to note that\b/gi, "");
  r = r.replace(/\bas (you may|you might|we all) know[,]?\s*/gi, "");
  r = r.replace(/\b(as mentioned|as noted|as stated) (above|before|earlier|previously)[,]?\s*/gi, "");
  r = r.replace(/\bin (the context of|terms of|the case of)\b/gi, "for");
  r = r.replace(/\bin addition to\b/gi, "+");
  r = r.replace(/\bas a result( of)?\b/gi, "->");
  r = r.replace(/\b(the|an)\s+/gi, "");
  r = r.replace(/\bum(a|ns|as)?\s+/gi, "");
  return r;
}
function preserveLayer(text) {
  const map = /* @__PURE__ */ new Map();
  let counter = 0;
  const ph = (v) => {
    const k = `\0P${counter++}\0`;
    map.set(k, v);
    return k;
  };
  let r = text;
  r = r.replace(/```[\s\S]*?```/g, (m) => ph(m));
  r = r.replace(/https?:\/\/\S+/g, (m) => ph(m));
  r = r.replace(/\b[\w.-]+(?:\/[\w.-]+)+\.[\w]+\b/g, (m) => ph(m));
  r = r.replace(/\[[^\]]+\]/g, (m) => ph(m));
  r = r.replace(/\b\w+:\s?(?:True|False|true|false)\b/g, (m) => ph(m));
  r = r.replace(/\{\{.*?\}\}/g, (m) => ph(m));
  r = r.replace(/\$[A-Za-z_]\w*/g, (m) => ph(m));
  return { text: r, map };
}
function patternLayer(text) {
  let r = text;
  r = r.replace(/\b(\w{2,}(?:\/\w{2,}){1,})\b/g, (_m, group) => {
    const parts = group.split("/");
    if (parts.every((p) => p.length <= 6))
      return group;
    const collapsed = parts.map(
      (p) => p.length > 4 ? p[0].toUpperCase() + p.slice(1, 3).toLowerCase() : p
    ).join("|");
    return "[" + collapsed + "]";
  });
  r = r.replace(/\band\b/gi, "+");
  r = r.replace(/\bor\b/gi, "|");
  r = r.replace(/\be\b/gi, "+");
  r = r.replace(/\bou\b/gi, "|");
  r = r.replace(/\bbefore\b/gi, "<");
  r = r.replace(/\bafter\b/gi, ">");
  r = r.replace(/\bantes( de)?\b/gi, "<");
  r = r.replace(/\bdepois( de)?\b/gi, ">");
  r = r.replace(/\bapós\b/gi, ">");
  r = r.replace(/\b(is|are|was|were)\b/gi, "=");
  r = r.replace(COPULA_PT_RE, "=");
  r = r.replace(/[Jj]ust as we have for\s+(\w+)\s+and\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);
  r = r.replace(/[Aa]ssim como (?:temos|fizemos) para\s+(\w+)\s+e\s+(\w+)/g, (_m, a, b) => `$${a},$${b}`);
  r = r.replace(/\baccording to\b/gi, "=>");
  r = r.replace(/\bde acordo com\b/gi, "=>");
  r = r.replace(/\bbased on\b/gi, "<-");
  r = r.replace(/\bcom base em\b/gi, "<-");
  r = r.replace(/\bshould show\b/gi, "-> show");
  r = r.replace(/\bshould display\b/gi, "-> show");
  r = r.replace(/\bdeve mostrar\b/gi, "-> show");
  r = r.replace(/\bit should\b/gi, "->");
  return r;
}
function abbreviate(text) {
  return text.replace(/\b[a-zA-ZÀ-ÿ]{7,}\b/g, (word) => {
    return ABBREV.get(word.toLowerCase()) || word;
  });
}
function restoreAndClean(text, map) {
  let r = text;
  for (const [key, value] of map.entries())
    r = r.replace(key, value);
  r = r.replace(/[ \t]{2,}/g, " ");
  r = r.replace(/\n{3,}/g, "\n\n");
  return r.split("\n").map((l) => l.trimEnd()).join("\n").trim();
}
function isHeader(line) {
  if (/^#{1,6}\s/.test(line))
    return true;
  if (/^\d+\.\s+[A-ZÀ-Ý]/.test(line))
    return true;
  if (/^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$/.test(line) && line.length < 80)
    return true;
  return false;
}

// ../core/src/engine/morphology.ts
function isRomanceInfinitiveShape(lower) {
  if (lower.length < 2 || lower.length > 24)
    return false;
  if (ADJECTIVE_SUFFIX.test(lower))
    return false;
  if (lower.length > 3 && lower.endsWith("ver"))
    return false;
  if (/(?:ar|ir)$/i.test(lower))
    return true;
  if (!/er$/i.test(lower))
    return false;
  if (lower.length <= 4)
    return true;
  if (lower.length <= 18 && /^[bcdfghjklmnpqrstvwxz]/.test(lower))
    return true;
  return false;
}
function isInfinitiveCandidate(word) {
  const lower = word.toLowerCase();
  return word.length >= 3 && word.length <= 24 && !word.startsWith("~") && !/\d/.test(word) && !ADJECTIVE_SUFFIX.test(lower) && VERB_INFINITIVE.test(lower) && isRomanceInfinitiveShape(lower);
}
function isGerundCandidate(word) {
  const lower = word.toLowerCase();
  return word.length >= 5 && word.length <= 24 && !word.startsWith("~") && !/\d/.test(word) && !/^[A-Z]/.test(word) && !ADJECTIVE_SUFFIX.test(lower) && /(?:ando|endo|indo)$/i.test(lower);
}
function isNominalLikelyShape(lower) {
  if (lower.length < 4)
    return false;
  if (/(?:ção|ções|dade|idade|ismo|ismos|mento|mentos|ncia|ncias|ência|ências|agem|agens|eza|ezas|ura|uras|ice|ices|ise|ises|oma|omas|ema|emas)$/i.test(
    lower
  )) {
    return true;
  }
  if (lower.length >= 5 && /(?:ão|ões)$/i.test(lower))
    return true;
  if (lower.length >= 6 && /(?:os|as)$/i.test(lower) && !/(?:ando|endo|indo)$/i.test(lower)) {
    return true;
  }
  if (lower.length >= 8 && /(?:ais|eis)$/i.test(lower))
    return true;
  if (lower.length >= 6 && /(?:nces|sses|oses|ises)$/i.test(lower))
    return true;
  if (lower.length >= 7 && /ores$/i.test(lower))
    return true;
  if (lower.length >= 8 && /entes$/i.test(lower))
    return true;
  if (lower.length >= 10 && /guarda$/i.test(lower))
    return true;
  if (lower.length >= 7 && /eito$/i.test(lower))
    return true;
  if (lower.length >= 6 && /(?:ado|ido)$/i.test(lower))
    return true;
  if (lower.length >= 8 && /osto$/i.test(lower))
    return true;
  if (lower.length >= 6 && /ude$/i.test(lower))
    return true;
  if (lower.length >= 7 && /eto$/i.test(lower))
    return true;
  return false;
}
function isFiniteVerbSurfaceCandidate(word) {
  const lower = word.toLowerCase();
  if (word.length < 5 || word.length > 24)
    return false;
  if (word.startsWith("~") || /\d/.test(word) || /^[A-Z]/.test(word))
    return false;
  if (ADJECTIVE_SUFFIX.test(lower))
    return false;
  if (isNominalLikelyShape(lower))
    return false;
  if (/(?:iam|ria|aria|ariam|eria|eriam|iria|iriam)$/i.test(lower))
    return true;
  return false;
}

// ../core/src/engine/shared.ts
function buildFreqMap(text) {
  const freq = /* @__PURE__ */ new Map();
  for (const w of text.toLowerCase().split(/\s+/)) {
    const clean = w.replace(/[^a-zA-ZÀ-ÿ]/g, "");
    if (clean)
      freq.set(clean, (freq.get(clean) || 0) + 1);
  }
  return freq;
}
function scoreWord(word, freq, totalWords, isFirstInLine, isSentenceStart = false, isQuestion = false) {
  if (/\d/.test(word))
    return 100;
  if (/[^a-zA-ZÀ-ÿ\s.,;:!?'"/-]/.test(word))
    return 100;
  const clean = word.replace(/[^a-zA-ZÀ-ÿ-]/g, "");
  if (!clean)
    return 0;
  let score = 0;
  score += Math.min(clean.length, 8);
  const st = clean.toLowerCase();
  if (isRomanceInfinitiveShape(st) && /[aei]r$/i.test(st)) {
    score += 6;
  }
  if (/(?:ando|endo|indo)$/i.test(st) && st.length >= 5) {
    score += 5;
  }
  if (isQuestion && /(?:iam|ria|aria|ariam|eria|eriam|iria|iriam)$/i.test(st)) {
    score += 4;
  }
  if (clean.length === 3) {
    if (!/[aeiouà-ú]/i.test(clean))
      score += 3;
    if (isQuestion)
      score += 2;
  }
  if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
    score += 8;
  } else if (/^[A-ZÀ-Ý]/.test(clean) && !isSentenceStart) {
    score += 5;
  }
  if (totalWords > 30) {
    const ratio = (freq.get(clean.toLowerCase()) || 0) / totalWords;
    if (ratio > 0.02 && !(isSentenceStart && isFirstInLine && clean.length <= 5)) {
      score -= Math.min(Math.floor(ratio * 60), 6);
    }
  }
  if (clean.length >= 5 && VERB_CONJUGATED.test(clean.toLowerCase()))
    score -= 3;
  if (isFirstInLine && !isSentenceStart)
    score += 2;
  if (isSentenceStart && isFirstInLine && clean.length >= 2 && clean.length <= 6) {
    score += 2;
  }
  return score;
}
function weightInfinitiveAction(baseScore, word, freq, totalWords, origIdx) {
  const key = word.toLowerCase();
  const tf = freq.get(key) ?? 0;
  const idf = Math.log1p(totalWords / (tf + 1));
  const pos = Math.max(0, 1 - origIdx / Math.max(totalWords, 1));
  return baseScore * (1 + 0.35 * idf) + pos * 1.5;
}
function pickVerbalAction(fused, freq, totalWords) {
  const weigh = (item) => ({
    ...item,
    score: weightInfinitiveAction(item.score, item.word, freq, totalWords, item.origIdx)
  });
  const inf = fused.filter((item) => isInfinitiveCandidate(item.word)).map(weigh);
  const ger = fused.filter((item) => isGerundCandidate(item.word)).map(weigh);
  const fin = fused.filter((item) => isFiniteVerbSurfaceCandidate(item.word)).map(weigh);
  const merged = [...inf, ...ger, ...fin].sort((a, b) => b.score - a.score);
  const seen = /* @__PURE__ */ new Set();
  const dedup = [];
  for (const x of merged) {
    const k = x.word.toLowerCase();
    if (seen.has(k))
      continue;
    seen.add(k);
    dedup.push(x);
  }
  if (dedup.length) {
    const top = dedup[0].word;
    return { action: "!" + top, actionKeys: /* @__PURE__ */ new Set([top.toLowerCase()]) };
  }
  const sorted = [...fused].sort((a, b) => b.score - a.score);
  for (const item of sorted) {
    const k = item.word.toLowerCase();
    if (item.word.startsWith("~") || /\d/.test(item.word))
      continue;
    if (/^[A-Z]/.test(item.word))
      continue;
    if (ADJECTIVE_SUFFIX.test(k))
      continue;
    if (isNominalLikelyShape(k))
      continue;
    return { action: "!" + item.word, actionKeys: /* @__PURE__ */ new Set([k]) };
  }
  return { action: "", actionKeys: /* @__PURE__ */ new Set() };
}
function fuseProperNouns(items) {
  const result = [];
  let i = 0;
  while (i < items.length) {
    if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[i].word)) {
      let fused = items[i].word;
      let maxScore = items[i].score;
      let lastOrigIdx = items[i].origIdx;
      let j = i + 1;
      while (j < items.length && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[j].word) && items[j].origIdx === lastOrigIdx + 1 && !isInfinitiveCandidate(items[i].word) && !isInfinitiveCandidate(items[j].word)) {
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
function scoreFilterLines(text, freq, totalWords, defaultThreshold) {
  const lines = text.split("\n");
  const result = [];
  const isQuestionLine = (line) => line.trim().endsWith("?");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (result.length > 0 && result[result.length - 1] !== "")
        result.push("");
      continue;
    }
    if (isHeader(trimmed)) {
      result.push(trimmed);
      continue;
    }
    const isQuestion = isQuestionLine(trimmed);
    const bulletMatch = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
    const marker = bulletMatch ? bulletMatch[1] : "";
    let content = bulletMatch ? bulletMatch[2] : trimmed;
    content = content.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, "$1 $3");
    const words = content.split(/\s+/);
    const lineStarts = /* @__PURE__ */ new Set([0]);
    for (let i = 0; i < words.length; i++) {
      if (/[.!?]$/.test(words[i]) && i + 1 < words.length)
        lineStarts.add(i + 1);
    }
    const tryFilter = (threshold) => {
      const rawScores = words.map((w, i) => {
        if (w.includes("\0"))
          return Infinity;
        const wClean = w.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
        if (!wClean) {
          if (isPatternSymbolToken(w))
            return Infinity;
          return null;
        }
        if (NEGATION_TOGGLE_WORD_RE.test(wClean))
          return null;
        const isSentStart = lineStarts.has(i);
        return scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
      });
      const boosted = rawScores.map((s, i) => {
        if (s === null || s === Infinity || s >= threshold)
          return s;
        const wClean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
        const prev = rawScores[i - 1];
        const next = rawScores[i + 1];
        const prevOk = typeof prev === "number" && prev >= threshold;
        const nextOk = typeof next === "number" && next >= threshold;
        if (wClean.length >= 1 && wClean.length <= 3 && prevOk && nextOk) {
          return Math.max(s ?? 0, threshold);
        }
        const neighborMax = Math.max(
          typeof prev === "number" ? prev : -Infinity,
          typeof next === "number" ? next : -Infinity
        );
        if (neighborMax >= threshold + 2)
          return (s ?? 0) + 3;
        return s;
      });
      const kept = [];
      let negateNext = false;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const s = boosted[i];
        if (w.includes("\0")) {
          kept.push(negateNext ? "~" + w : w);
          negateNext = false;
          continue;
        }
        const wClean = w.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
        if (!wClean) {
          if (isPatternSymbolToken(w)) {
            kept.push(w);
            negateNext = false;
          }
          continue;
        }
        if (NEGATION_TOGGLE_WORD_RE.test(wClean)) {
          negateNext = !negateNext;
          continue;
        }
        if (s !== null && s >= threshold) {
          kept.push(negateNext ? "~" + w : w);
          negateNext = false;
        }
      }
      return kept;
    };
    let keptWords = tryFilter(defaultThreshold);
    if (keptWords.length <= 1 && words.length >= 3) {
      keptWords = tryFilter(2);
    }
    const compressed = keptWords.join(" ").replace(/\s{2,}/g, " ").trim();
    if (compressed)
      result.push(marker + compressed);
  }
  return result.join("\n");
}

// ../core/src/engine/compress.ts
function compressPipeline(text, options = {}) {
  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  const { text: preserved, map: preserveMap } = preserveLayer(cleaned);
  const patterned = patternLayer(preserved);
  const freq = buildFreqMap(patterned);
  const totalWords = patterned.split(/\s+/).length;
  const filtered = scoreFilterLines(patterned, freq, totalWords, COMPRESS_THRESHOLD);
  const abbreviated = abbreviate(filtered);
  const final = restoreAndClean(abbreviated, preserveMap).trim();
  if (!final)
    return { output: text, noiseRemoved: 0 };
  const flags = computeFlags(text);
  const finalOutput = buildOpcode("C", { payload: final }, flags, options);
  const outputWordCount = final.split(/\s+/).length;
  const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
  return { output: finalOutput, noiseRemoved: noise };
}

// ../core/src/engine/query.ts
function pickBriefAction(text) {
  const escopo = text.match(
    /(?:^|\n)\s*escopo\s*\n([\s\S]{0,1400}?)(?=\n\s*(?:resultado esperado|critérios? de aceite|objetivo|contexto)\s*$|$)/im
  )?.[1] ?? "";
  const objetivo = text.match(
    /(?:^|\n)\s*objetivo\s*\n([\s\S]{0,800}?)(?=\n\s*(?:escopo|resultado esperado|critérios? de aceite|contexto)\s*$|$)/im
  )?.[1] ?? "";
  const section = escopo || objetivo;
  if (!section.trim())
    return "";
  const verbs = Array.from(section.matchAll(/\b([a-zà-ÿ]{4,24}(?:ar|er|ir))\b/gi)).map((m) => m[1].toLowerCase());
  if (!verbs.length)
    return "";
  const priority = {
    separar: 11,
    classificar: 11,
    tratar: 10,
    revisar: 10,
    implementar: 10,
    integrar: 9,
    criar: 8,
    automatizar: 8,
    orquestrar: 8,
    definir: 7,
    ajustar: 6,
    reaproveitar: 6,
    registrar: 5
  };
  const generic = {
    fazer: -4,
    melhorar: -2,
    garantir: -2
  };
  let best = "";
  let bestScore = -Infinity;
  for (let i = 0; i < verbs.length; i++) {
    const v = verbs[i];
    const p = priority[v] ?? 0;
    const positionBoost = Math.max(0, 3 - i * 0.25);
    const score = p + positionBoost + (generic[v] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}
function rankBriefNiches(words, text) {
  const lowerText = text.toLowerCase();
  const isFailureBrief = /\b(retry|retryable|non-retryable|dlq|redrive|transit[óo]ria|definitiv[oa]|idempot[êe]ncia)\b/i.test(text);
  if (!isFailureBrief)
    return words;
  const priority = (w) => {
    const k = w.toLowerCase();
    let p = 0;
    if (/^(retryable|non-retryable|transitoria|transitória|definitivo|definitiva|idempotencia|idempotência|dlq|redrive)$/.test(k))
      p += 12;
    if (/^(erro|falha|retry|payload|invalido|inválido|negocio|negócio|classe|acao|ação|logs)$/.test(k))
      p += 6;
    if (/^(worker|rodar|resultado|hoje|passar|deixar)$/.test(k))
      p -= 8;
    if (lowerText.includes(` ${k} `))
      p += 1;
    return p;
  };
  return words.map((x) => ({ ...x, score: x.score + priority(x.word) })).sort((a, b) => b.score - a.score);
}
function isFailureRetryBrief(text) {
  return /\b(retry|retryable|non-retryable|dlq|redrive|transit[óo]ria|definitiv[oa]|idempot[êe]ncia)\b/i.test(text);
}
function isFailureDomainToken(w) {
  return /^(retryable|non-retryable|retry|dlq|redrive|transitoria|transitória|definitivo|definitiva|idempotencia|idempotência)$/i.test(w);
}
function isNameLookupQuestion(text) {
  const t = text.toLowerCase();
  return /\bqual\s+(?:é\s+)?(?:o\s+|a\s+)?(?:nome|site|ferramenta|plataforma|ferramentas)\b/i.test(text) || /\b(?:que|qual)\s+(?:é\s+)?(?:o\s+|a\s+)?nome\s+(?:do|da|de)\s+/i.test(text) || /\b(?:sabe|sabem|algu[eé]m\s+sabe)\s+(?:qual|o\s+que)\s+(?:é\s+)?(?:o\s+)?(?:nome|site)\b/i.test(t);
}
var NAME_LOOKUP_STOP = /* @__PURE__ */ new Set([
  "que",
  "qual",
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "do",
  "da",
  "dos",
  "das",
  "de",
  "no",
  "na",
  "nos",
  "nas",
  "com",
  "por",
  "pelo",
  "pela",
  "pra",
  "pro",
  "e",
  "ou",
  "site",
  "nome",
  "tira",
  "tire",
  "tiram",
  "voce",
  "voc\xEA",
  "cujo",
  "cuja",
  "esse",
  "essa",
  "isso",
  "este",
  "esta"
]);
function rankNameLookupNiches(words) {
  return words.map((x) => {
    const k = x.word.replace(/^#/, "").toLowerCase();
    let bonus = 0;
    if (/^(marketing|gasto|gastos|media|medias|média|médias|benchmark|spend|métrica|métricas|metrica|metricas)$/i.test(k)) {
      bonus += 22;
    }
    if (NAME_LOOKUP_STOP.has(k))
      bonus -= 35;
    return { ...x, score: x.score + bonus };
  }).sort((a, b) => b.score - a.score);
}
function pickNameLookupPayload(text) {
  const n = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const parts = [];
  if (/\bmarketing\b/.test(n))
    parts.push("marketing");
  if (/\bgastos?\b/.test(n))
    parts.push("gasto");
  if (/\bmedias?\b/.test(n))
    parts.push("media");
  if (/\b(benchmark|spend)\b/.test(n))
    parts.push("benchmark");
  if (/\bsite\b/.test(n))
    parts.push("nome_site");
  return parts.join(",");
}
function queryPipeline(text, options = {}) {
  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  let workText = cleaned.replace(/[?!.…]+$/g, "").trim();
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, "$1 $3");
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, "$1 $2");
  const freq = buildFreqMap(workText);
  const totalWords = workText.split(/\s+/).length;
  const words = workText.split(/\s+/);
  const sentenceStarts = /* @__PURE__ */ new Set([0]);
  for (let i = 0; i < words.length; i++) {
    if (/[.!?]$/.test(words[i]) && i + 1 < words.length)
      sentenceStarts.add(i + 1);
  }
  const survivors = [];
  const unitMap = {
    "dias": "d",
    "dia": "d",
    "days": "d",
    "day": "d",
    "meses": "m",
    "m\xEAs": "m",
    "months": "m",
    "month": "m",
    "anos": "y",
    "ano": "y",
    "years": "y",
    "year": "y",
    "horas": "h",
    "hora": "h",
    "hours": "h",
    "hour": "h",
    "minutos": "min",
    "minutes": "min",
    "semanas": "w",
    "semana": "w",
    "weeks": "w",
    "week": "w"
  };
  const skipIndices = /* @__PURE__ */ new Set();
  let negateNext = false;
  const isQuestion = /\?/.test(text);
  const briefActionCandidate = pickBriefAction(text);
  const isFailureBrief = isFailureRetryBrief(text);
  const isBrief = /(?:^|\n)\s*contexto\b/im.test(text) && /(?:^|\n)\s*(?:objetivo|escopo)\b/im.test(text);
  const nameLookup = isNameLookupQuestion(text) && !isBrief;
  const isGenericBriefToken = (w) => /^(contexto|hoje|resultado|objetivo|escopo|criterios?|menos|validado|codigo|código)$/i.test(w);
  const qActionMatch = isQuestion ? workText.match(/\bcomo\s+[\p{L}\p{M}]+\s+([\p{L}\p{M}]{4,24}(?:ria|aria|eria|iria|iam|ariam|eriam|iriam))\b/iu) : null;
  const questionActionCandidate = qActionMatch?.[1]?.toLowerCase() ?? "";
  for (let i = 0; i < words.length; i++) {
    if (skipIndices.has(i))
      continue;
    const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
    if (!clean)
      continue;
    if (NEGATION_TOGGLE_WORD_RE.test(clean)) {
      negateNext = !negateNext;
      continue;
    }
    if (/n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i])) {
      negateNext = !negateNext;
      continue;
    }
    if (/^\d+$/.test(clean) && i + 1 < words.length) {
      const nextClean = words[i + 1].replace(/[^a-zA-ZÀ-ÿ-]/g, "").toLowerCase();
      if (unitMap[nextClean]) {
        const finalWord = negateNext ? "~" + clean + unitMap[nextClean] : clean + unitMap[nextClean];
        survivors.push({ word: finalWord, score: 100, origIdx: i });
        negateNext = false;
        skipIndices.add(i + 1);
        continue;
      }
    }
    const isSentenceStart = sentenceStarts.has(i);
    if (isSentenceStart)
      negateNext = false;
    const score = scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, isQuestion);
    if (score >= QUERY_THRESHOLD) {
      survivors.push({ word: negateNext ? "~" + clean : clean, score, origIdx: i });
      negateNext = false;
    }
  }
  for (let si = 0; si < survivors.length; si++) {
    const w = survivors[si].word;
    if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
      survivors[si] = { ...survivors[si], word: w.toLowerCase() };
    }
  }
  const fused = fuseProperNouns(survivors);
  const niches = [];
  const entities = [];
  const attrs = [];
  const seen = /* @__PURE__ */ new Set();
  const picked = pickVerbalAction(fused, freq, totalWords);
  let action = picked.action;
  let actionKeys = picked.actionKeys;
  const tag = "";
  const forcedAction = briefActionCandidate || (nameLookup ? "identificar" : "") || questionActionCandidate;
  if (forcedAction) {
    action = "!" + forcedAction;
    actionKeys = /* @__PURE__ */ new Set([forcedAction]);
  }
  for (const item of fused) {
    const key = item.word.toLowerCase();
    if (seen.has(key))
      continue;
    seen.add(key);
    if (/\d/.test(item.word)) {
      attrs.push("?" + item.word);
      continue;
    }
    if (isFailureBrief && isFailureDomainToken(item.word)) {
      niches.push({ word: "#" + item.word.toLowerCase(), score: item.score + 20 });
      continue;
    }
    if (ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) && item.word.length >= 8 && !/mente$/i.test(item.word) && !/^(objetivo|canonica|relevante|auditavel|suficiente|resultado)$/i.test(item.word)) {
      attrs.push("?" + item.word.toLowerCase());
      continue;
    }
    if (/^[A-Z]/.test(item.word) && item.word.length >= 3 && !isInfinitiveCandidate(item.word) && !/^(contexto|objetivo|escopo|resultado|criterios?|hoje)$/i.test(item.word)) {
      if (isBrief && isGenericBriefToken(item.word))
        continue;
      entities.push("@" + item.word);
      continue;
    }
    if (actionKeys.has(key))
      continue;
    if (isBrief && /^(fazer|melhorar|garantir|revisar|resultado|indicar|deixar|passar|hoje|contexto)$/i.test(item.word))
      continue;
    if (!action) {
      if (!isNominalLikelyShape(key)) {
        action = "!" + item.word;
      } else {
        niches.push({ word: "#" + item.word, score: item.score });
      }
    } else {
      niches.push({ word: "#" + item.word, score: item.score });
    }
  }
  let rankedNiches = rankBriefNiches(niches, text);
  if (nameLookup)
    rankedNiches = rankNameLookupNiches(rankedNiches);
  const topNiches = rankedNiches.filter((n) => !(isBrief && isGenericBriefToken(n.word.replace(/^#/, "")))).filter((n) => !(isFailureBrief && /^(#?worker|#?rodar|#?hoje|#?contexto)$/i.test(n.word))).filter((n) => {
    if (!nameLookup)
      return true;
    const k = n.word.replace(/^#/, "").toLowerCase();
    return !NAME_LOOKUP_STOP.has(k);
  }).slice(0, MAX_QUERY_NICHES).map((n) => n.word);
  const spec = { goal: "_", cstr: "_", proto: "_" };
  const flags = computeFlags(text);
  const lookupPayload = nameLookup ? pickNameLookupPayload(text) : "";
  const finalOutput = buildOpcode("Q", {
    tag,
    action,
    goal: spec.goal,
    cstr: spec.cstr,
    proto: spec.proto,
    niches: topNiches,
    entities,
    attrs,
    payload: lookupPayload || void 0
  }, flags, options);
  if (!finalOutput)
    return { output: text, noiseRemoved: 0 };
  const outputWordCount = finalOutput.split(/\s+/).length;
  const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
  return { output: finalOutput, noiseRemoved: noise };
}

// ../core/src/engine/conversational.ts
function conversationalPipeline(text, options = {}) {
  const qCount = (text.match(/\?/g) || []).length;
  const negCount = (text.match(/\b(não|nao|not|never|sem|without|nem)\b|n't\b/gi) || []).length;
  let stance = "";
  if (negCount > 0 && qCount > 0)
    stance = "[~?]";
  else if (negCount > 0)
    stance = "[~]";
  else if (qCount >= 1)
    stance = "[?]";
  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  let workText = cleaned.replace(/[?!.…]+$/g, "").trim();
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, "$1 $3");
  workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, "$1 $2");
  const freq = buildFreqMap(workText);
  const totalWords = workText.split(/\s+/).length;
  const words = workText.split(/\s+/);
  const CONV_THRESHOLD = 5;
  const sentenceStarts = /* @__PURE__ */ new Set([0]);
  for (let i = 0; i < words.length; i++) {
    if (/[.!?]$/.test(words[i]) && i + 1 < words.length)
      sentenceStarts.add(i + 1);
  }
  const survivors = [];
  const seenLower = /* @__PURE__ */ new Set();
  const convNegRegex = /^(não|nao|not|never|sem|without|nem)$/i;
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
    if (!clean)
      continue;
    if (convNegRegex.test(clean) || /n't$/i.test(words[i]) || /[a-z]'t$/i.test(words[i]))
      continue;
    const key = clean.toLowerCase();
    if (seenLower.has(key))
      continue;
    seenLower.add(key);
    const isSentenceStart = sentenceStarts.has(i);
    const score = scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, false);
    if (score >= CONV_THRESHOLD)
      survivors.push({ word: clean, score, origIdx: i });
  }
  for (let si = 0; si < survivors.length; si++) {
    const w = survivors[si].word;
    if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
      survivors[si] = { ...survivors[si], word: w.toLowerCase() };
    }
  }
  const fused = fuseProperNouns(survivors);
  const picked = pickVerbalAction(fused, freq, totalWords);
  let action = picked.action;
  const actionKeys = picked.actionKeys;
  const niches = [];
  const entities = [];
  const attrs = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of fused) {
    const key = item.word.toLowerCase();
    if (seen.has(key))
      continue;
    seen.add(key);
    if (/\d/.test(item.word)) {
      attrs.push("?" + item.word);
      continue;
    }
    if (ADJECTIVE_SUFFIX.test(key) && item.word.length >= 8 && !/mente$/i.test(item.word) && !/^(objetivo|canonica|relevante|auditavel|suficiente|resultado)$/i.test(item.word)) {
      attrs.push("?" + key);
      continue;
    }
    if (/^[A-Z]/.test(item.word) && item.word.length >= 3 && !isInfinitiveCandidate(item.word)) {
      entities.push("@" + item.word);
      continue;
    }
    if (actionKeys.has(key))
      continue;
    if (!action) {
      if (!isNominalLikelyShape(key)) {
        action = "!" + item.word;
      } else {
        niches.push({ word: "#" + item.word, score: item.score });
      }
    } else {
      niches.push({ word: "#" + item.word, score: item.score });
    }
  }
  const topNiches = niches.sort((a, b) => b.score - a.score).slice(0, MAX_QUERY_NICHES).map((n) => n.word);
  const spec = { goal: "_", cstr: "_", proto: "_" };
  const flags = computeFlags(text);
  const finalOutput = buildOpcode("V", {
    stance,
    tag: "",
    action,
    goal: spec.goal,
    cstr: spec.cstr,
    proto: spec.proto,
    niches: topNiches,
    entities,
    attrs: attrs.slice(0, 3)
  }, flags, options);
  if (!finalOutput)
    return { output: text, noiseRemoved: 0 };
  const outputWordCount = finalOutput.split(/\s+/).length;
  const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
  return { output: finalOutput, noiseRemoved: noise };
}

// ../core/src/engine/devOutput.ts
var ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
var DEFAULTS = {
  maxTotalLines: 4e3,
  headLines: 400,
  tailLines: 400,
  maxLineLength: 480,
  testAware: true
};
function stripAnsi(text) {
  return text.replace(ANSI_RE, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function clampLine(line, maxLen) {
  if (line.length <= maxLen)
    return line;
  const keep = maxLen - 20;
  return `${line.slice(0, keep)} \u2026 [+${line.length - keep} chars]`;
}
function collapseDuplicateRuns(lines) {
  if (lines.length === 0)
    return [];
  const out = [];
  let prev = lines[0];
  let count = 1;
  for (let i = 1; i <= lines.length; i++) {
    const cur = lines[i];
    if (cur === prev && i < lines.length) {
      count++;
      continue;
    }
    out.push(count > 1 ? `${prev} (\xD7${count})` : prev);
    if (i < lines.length) {
      prev = cur;
      count = 1;
    }
  }
  return out;
}
function looksLikeTestOutput(text) {
  const head = text.slice(0, 12e3);
  return /running\s+\d+\s+tests?\b/i.test(head) || /\btest\s+result:\s/i.test(head) || /^\s*FAIL\s+/m.test(head) || /\bfailures?:\s*$/m.test(head) || /\b\d+\s+passed\b.*\b\d+\s+failed\b/i.test(head) || /^\s*●\s/m.test(head) && /\btests?\b/i.test(head) || /test\s+.*\s+\.\.\.\s+(ok|FAILED)\b/i.test(head) && /\b\d+\s*;\s*\d+\s+failed/i.test(head);
}
function shrinkTestLines(lines) {
  const n = lines.length;
  const important = (i) => {
    const line = lines[i];
    return /FAIL|failed|error\[E|ERROR|Error:|AssertionError|panicked at|test\s+result|failures?:|^\s*●\s|^\s*✕\s|expected|Received|Diff|assert_eq!|panic|thread\s+'/i.test(
      line
    ) || /^\s+at\s/.test(line) || /^running\s+\d+/i.test(line) || /^\s*#\d+\s+/.test(line) || /-->\s/.test(line);
  };
  const kept = /* @__PURE__ */ new Set();
  const head = Math.min(24, n);
  const tail = Math.min(20, n);
  for (let i = 0; i < head; i++)
    kept.add(i);
  for (let i = n - tail; i < n; i++)
    if (i >= 0)
      kept.add(i);
  for (let i = 0; i < n; i++)
    if (important(i))
      kept.add(i);
  const sorted = [...kept].sort((a, b) => a - b);
  let out = sorted.map((i) => lines[i]);
  const max = 450;
  if (out.length > max) {
    const drop = out.length - max + 1;
    out = [...out.slice(0, max - 1), `... [+${drop} linhas omitidas]`];
  }
  return out;
}
function truncateMiddle(lines, head, tail) {
  if (lines.length <= head + tail + 8)
    return lines;
  const omitted = lines.length - head - tail;
  return [...lines.slice(0, head), `\u2026 [${omitted} linhas omitidas] \u2026`, ...lines.slice(-tail)];
}
function devOutputPipeline(text, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const raw = text.length;
  let s = stripAnsi(text);
  if (!s.trim())
    return { output: "", noiseRemoved: 0 };
  let lines = s.split("\n");
  if (o.testAware && looksLikeTestOutput(s)) {
    lines = shrinkTestLines(lines);
  }
  lines = lines.map((l) => clampLine(l, o.maxLineLength));
  lines = collapseDuplicateRuns(lines);
  if (lines.length > o.maxTotalLines) {
    lines = truncateMiddle(lines, o.headLines, o.tailLines);
  }
  const out = lines.join("\n").trimEnd();
  const noiseRemoved = raw > 0 ? Math.max(0, Math.floor((raw - out.length) / raw * 100)) : 0;
  return { output: out, noiseRemoved };
}

// ../core/src/PithEngine.ts
var PithEngine = class {
  optimize(text, options = { ultraCompact: true }) {
    try {
      if (!text.trim())
        return { output: "[PITH: No meaningful data found]", noiseRemoved: 0, isQuery: false };
      const mode = options.mode && options.mode !== "auto" ? options.mode : this.detectMode(text);
      const result = mode === "compress" ? compressPipeline(text, options) : mode === "conversational" ? conversationalPipeline(text, options) : queryPipeline(text, options);
      return { ...result, isQuery: mode !== "compress" };
    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }
  /** Saída de terminal / logs / ferramentas — sem pipeline lexical de prompts. */
  optimizeDevOutput(text, options = {}) {
    return devOutputPipeline(text, options);
  }
  optimizeMachine(text) {
    return this.optimize(text, { ultraCompact: true });
  }
  compressCode(code) {
    return code;
  }
  /** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
  static isaCrc(baseWithoutCrc) {
    return isaCrc(baseWithoutCrc);
  }
  detectMode(text) {
    const decision = this.detectModeWithConfidence(text);
    return decision.mode;
  }
  detectModeWithConfidence(text) {
    const words = text.split(/\s+/).length;
    const nonEmptyLines = text.split("\n").filter((l) => l.trim()).length;
    const qCount = (text.match(/\?/g) || []).length;
    const hasQuestion = qCount > 0;
    const hasCodeFence = /```/.test(text);
    const hasNumberedList = /^\s*\d+\.\s/m.test(text);
    const hasBulletList = /^\s*[-•–]\s/m.test(text);
    const looksLikeSpec = this.looksLikeSpecBrief(text);
    const looksTechnicalQuery = /\b(llm|token|tokens|prompt|output|input|api|backend|worker|sqs|dlq|retry|idempot[eê]ncia)\b/i.test(text);
    const strongCompress = this.hasStrongCompressEvidence(text, words, nonEmptyLines, hasQuestion, looksLikeSpec);
    const queryScore = (hasQuestion ? 4 : 0) + (looksLikeSpec ? 5 : 0) + (!hasCodeFence && !hasNumberedList && !hasBulletList ? 1 : 0) + (looksTechnicalQuery ? 2 : 0);
    const conversationalScore = (qCount >= 2 ? 6 : 0) + (qCount >= 2 && nonEmptyLines <= 4 ? 1 : 0) + (!looksTechnicalQuery ? 1 : -3);
    const compressScore = (words > 40 ? 3 : 0) + (nonEmptyLines > 3 ? 2 : 0) + (hasCodeFence ? 5 : 0) + (hasNumberedList ? 3 : 0) + (hasBulletList ? 3 : 0) + (!hasQuestion && !looksLikeSpec ? 1 : 0);
    const ranked = [
      { mode: "query", score: queryScore },
      { mode: "conversational", score: conversationalScore },
      { mode: "compress", score: compressScore }
    ].sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const second = ranked[1];
    const confidence = top.score <= 0 ? 0 : (top.score - second.score) / top.score;
    const uncertain = confidence < 0.22;
    if (top.mode === "compress" && !strongCompress) {
      return { mode: "query", confidence, uncertain: true };
    }
    if (uncertain && top.mode === "compress") {
      return { mode: "query", confidence, uncertain: true };
    }
    if (uncertain && top.mode === "conversational" && qCount < 2) {
      return { mode: "query", confidence, uncertain: true };
    }
    return { mode: top.mode, confidence, uncertain };
  }
  hasStrongCompressEvidence(text, words, nonEmptyLines, hasQuestion, looksLikeSpec) {
    const hasCodeFence = /```/.test(text);
    const hasList = /^\s*[-•–]\s/m.test(text) || /^\s*\d+\.\s/m.test(text);
    const manyLines = nonEmptyLines >= 4;
    const veryLong = words >= 45;
    if (hasQuestion || looksLikeSpec)
      return false;
    if (hasCodeFence)
      return true;
    if (hasList && nonEmptyLines >= 3)
      return true;
    if (manyLines)
      return true;
    if (veryLong)
      return true;
    return false;
  }
  looksLikeSpecBrief(text) {
    const sections = [
      /(^|\n)\s*contexto\s*$/im,
      /(^|\n)\s*objetivo\s*$/im,
      /(^|\n)\s*escopo\s*$/im,
      /(^|\n)\s*resultado esperado\s*$/im,
      /(^|\n)\s*critérios? de aceite\s*$/im,
      /(^|\n)\s*scope\s*$/im,
      /(^|\n)\s*goal\s*$/im,
      /(^|\n)\s*acceptance criteria\s*$/im
    ].filter((re) => re.test(text)).length;
    const techSignals = [
      /(?:^|\s)(app|src|packages)\/[^\s]+/i.test(text),
      /\b[a-z_]+\.(?:py|ts|js)\b/i.test(text),
      /\b(send_[a-z_]+)\b/i.test(text),
      /\b(?:idempot[eê]ncia|idempotency|retry|reprocessamentos?)\b/i.test(text),
      /\b(?:eventos?|transiç(?:ão|oes)|transition|notifier|orquestraç(?:ão|oes))\b/i.test(text),
      /\b(?:dependency|dependencies|provider|providers|repository|repositories|service|services|factory|factories|depends)\b/i.test(text)
    ].filter(Boolean).length;
    return sections >= 2 && techSignals >= 1;
  }
};

// src/cli.ts
var engine = new PithEngine();
var IGNORE_DIR_NAMES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".obsidian",
  ".trash",
  "target"
]);
function help() {
  console.log(`pith \u2014 Pith CLI (Zero-G)

  pith brain <pasta> [-o ficheiro] [--max-file-bytes N] [--ext .md,.txt]
      L\xEA notas (estilo Obsidian: .md, .mdc, .txt), aplica compress\xE3o por ficheiro,
      gera um \xFAnico Markdown com sec\xE7\xF5es por caminho. Sa\xEDda predefinida: ./pith-brain.md

  pith prompt | opt   < stdin
      Otimiza texto de prompt (motor principal).

  pith dev | shrink   < stdin
      Compacta sa\xEDda de terminal (logs, testes).

  pith run | exec <cmd...>
      Executa comando e envia stdout+stderr compactados para stdout.
`);
}
async function readStdin() {
  if (process.stdin.isTTY)
    return "";
  const chunks = [];
  for await (const c of process.stdin)
    chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}
function stripYamlFrontmatter(s) {
  if (!s.startsWith("---\n"))
    return s;
  const end = s.indexOf("\n---\n", 4);
  if (end === -1)
    return s;
  return s.slice(end + 5);
}
async function* walkMarkdownFiles(root, exts) {
  const { readdir } = await import("node:fs/promises");
  async function* inner(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(e.name))
          continue;
        if (e.name.startsWith("."))
          continue;
        yield* inner(p);
      } else {
        const ext = e.name.includes(".") ? "." + e.name.split(".").pop().toLowerCase() : "";
        if (exts.has(ext))
          yield p;
      }
    }
  }
  yield* inner(root);
}
async function readFileHead(path, maxBytes) {
  const st = await stat(path);
  if (st.size <= maxBytes)
    return readFile(path, "utf8");
  const chunks = [];
  let read = 0;
  const stream = createReadStream(path, { encoding: "utf8", highWaterMark: 64 * 1024 });
  try {
    for await (const chunk of stream) {
      const s = chunk;
      if (read + s.length <= maxBytes) {
        chunks.push(s);
        read += s.length;
      } else {
        chunks.push(s.slice(0, maxBytes - read));
        break;
      }
    }
  } finally {
    stream.destroy();
  }
  return chunks.join("");
}
function parseBrainArgs(argv) {
  const rest = [];
  let outPath = join(process.cwd(), "pith-brain.md");
  let maxFileBytes = 384 * 1024;
  let exts = [".md", ".mdc", ".txt"];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      help();
      process.exit(0);
    }
    if (a === "-o" || a === "--out") {
      outPath = resolve(process.cwd(), argv[++i] ?? "");
      continue;
    }
    if (a === "--max-file-bytes") {
      maxFileBytes = parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(maxFileBytes) || maxFileBytes < 1024) {
        console.error("pith brain: --max-file-bytes inv\xE1lido");
        process.exit(1);
      }
      continue;
    }
    if (a === "--ext" || a === "--extensions") {
      const raw = argv[++i] ?? "";
      exts = raw.split(",").map((x) => {
        const t = x.trim().toLowerCase();
        return t.startsWith(".") ? t : `.${t}`;
      });
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`pith brain: op\xE7\xE3o desconhecida: ${a}`);
      process.exit(1);
    }
    rest.push(a);
  }
  const rootArg = rest[0] ?? ".";
  const root = resolve(process.cwd(), rootArg);
  return { root, outPath, maxFileBytes, exts };
}
async function cmdBrain(argv) {
  const { root, outPath, maxFileBytes, exts } = parseBrainArgs(argv);
  const extSet = new Set(exts);
  let stRoot;
  try {
    stRoot = await stat(root);
  } catch {
    console.error(`pith brain: pasta inexistente: ${root}`);
    process.exit(1);
  }
  if (!stRoot.isDirectory()) {
    console.error("pith brain: o caminho tem de ser uma pasta");
    process.exit(1);
  }
  const paths = [];
  for await (const p of walkMarkdownFiles(root, extSet))
    paths.push(p);
  paths.sort((a, b) => a.localeCompare(b));
  if (paths.length === 0) {
    console.error("pith brain: nenhum ficheiro encontrado (extens\xF5es: " + exts.join(", ") + ")");
    process.exit(1);
  }
  const header = [
    "# Pith brain",
    "",
    `- **origem:** \`${root}\``,
    `- **ficheiros:** ${paths.length}`,
    `- **gerado:** ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    "---",
    ""
  ].join("\n");
  const sections = [header];
  for (const abs of paths) {
    const rel = relative(root, abs) || basename(abs);
    let raw = await readFileHead(abs, maxFileBytes);
    raw = stripYamlFrontmatter(raw).trim();
    if (!raw)
      continue;
    const truncated = (await stat(abs)).size > maxFileBytes;
    const { output } = engine.optimize(raw, { ultraCompact: true, mode: "compress" });
    if (output.includes("No meaningful data"))
      continue;
    sections.push(`## ${rel.replace(/\\/g, "/")}`);
    if (truncated)
      sections.push("_(truncado ao limite de bytes)_\n");
    sections.push("");
    sections.push(output);
    sections.push("");
    sections.push("---");
    sections.push("");
  }
  const body = sections.join("\n").trimEnd() + "\n";
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, body, "utf8");
  console.error(`pith brain: escrito ${outPath} (${paths.length} ficheiros lidos)`);
}
async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === "-h" || cmd === "--help") {
    help();
    if (!cmd)
      process.exit(1);
    return;
  }
  if (cmd === "brain") {
    await cmdBrain(argv.slice(1));
    return;
  }
  if (cmd === "dev" || cmd === "shrink") {
    const text = await readStdin();
    if (!text.trim()) {
      console.error("pith dev: espera stdin (ex: npm test 2>&1 | pith dev)");
      process.exit(1);
    }
    const r = engine.optimizeDevOutput(text);
    process.stdout.write(r.output.endsWith("\n") ? r.output : `${r.output}
`);
    return;
  }
  if (cmd === "prompt" || cmd === "opt") {
    const text = await readStdin();
    if (!text.trim()) {
      console.error("pith prompt: espera stdin");
      process.exit(1);
    }
    const r = engine.optimize(text);
    process.stdout.write(`${r.output}
`);
    return;
  }
  if (cmd === "run" || cmd === "exec") {
    const rest = argv.slice(1);
    if (rest.length === 0) {
      console.error("pith run: falta comando");
      process.exit(1);
    }
    const subprocess = spawn(rest[0], rest.slice(1), { stdio: ["inherit", "pipe", "pipe"] });
    let out = "";
    let err = "";
    subprocess.stdout?.on("data", (d) => {
      out += d.toString();
    });
    subprocess.stderr?.on("data", (d) => {
      err += d.toString();
    });
    const code = await new Promise((res) => {
      subprocess.on("close", (c) => {
        res(c ?? 0);
      });
    });
    const combined = err ? `${out}${out && !out.endsWith("\n") ? "\n" : ""}${err}` : out;
    const r = engine.optimizeDevOutput(combined);
    process.stdout.write(`${r.output}
`);
    process.exit(code);
  }
  help();
  process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
