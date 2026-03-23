"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// ../core/src/PithEngine.ts
var PithEngine = class _PithEngine {
  // ═══════════════════════════════════════════════════
  // MINIMAL CONFIG (domain config, not language data)
  // ═══════════════════════════════════════════════════
  // Compact abbreviations for long words (PT, EN, ES, FR, DE)
  static ABBREV = /* @__PURE__ */ new Map([
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
  // Scoring thresholds
  static QUERY_THRESHOLD = 5;
  static COMPRESS_THRESHOLD = 4;
  static MAX_QUERY_NICHES = 4;
  /** Cópulas PT como token isolado — JS `\b` não trata letras acentuadas como `\w` (evita `técnica`→`t=cnica`). */
  static COPULA_PT_RE = /(?<![\p{L}\p{M}\p{N}])(é|são|está|estão|era|eram)(?![\p{L}\p{M}\p{N}])/giu;
  /** Símbolos da `patternLayer` (sem letras → `wClean` vazio); não podem ser descartados no scoreFilter. */
  static isPatternSymbolToken(w) {
    const t = w.trim();
    if (!t || t.includes("\0"))
      return false;
    return /^[+\-|=<>→]+$/.test(t);
  }
  /** Alterna ~ no termo seguinte; exclui sem/without — "sem ambiguidade" não é ~ambiguidade */
  static NEGATION_TOGGLE_WORD_RE = /^(não|nao|not|never|nem)$/i;
  // Morphological patterns (algorithmic, not word lists)
  // Adjective/determiner suffixes — Latin-derived morphological patterns, never verb roots
  // -ular/-olar/-lear: celular, solar, nuclear, linear, popular, molecular, circular
  // -quer/-quier: qualquer, quaisquer (PT), cualquier (ES) — grammaticalized determiners
  // -ico/-ica: genérico, histórico, dinâmico, automático, específico, público, único, lógico
  static ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|ural|olar|lear|quer|quier|ico|ica)$/i;
  static VERB_INFINITIVE = /[aei]r$/i;
  static VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;
  /** Terminações de infinitivo (romance); exclui adjetivos e falsos -er ingleses por forma. */
  static isRomanceInfinitiveShape(lower) {
    if (lower.length < 2 || lower.length > 24)
      return false;
    if (_PithEngine.ADJECTIVE_SUFFIX.test(lower))
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
  static isInfinitiveCandidate(word) {
    const lower = word.toLowerCase();
    return word.length >= 3 && word.length <= 24 && !word.startsWith("~") && !/\d/.test(word) && !/^[A-Z]/.test(word) && !_PithEngine.ADJECTIVE_SUFFIX.test(lower) && _PithEngine.VERB_INFINITIVE.test(lower) && _PithEngine.isRomanceInfinitiveShape(lower);
  }
  /** Gerúndio romance (-ando/-endo/-indo); sem lista de verbos. */
  static isGerundCandidate(word) {
    const lower = word.toLowerCase();
    return word.length >= 5 && word.length <= 24 && !word.startsWith("~") && !/\d/.test(word) && !/^[A-Z]/.test(word) && !_PithEngine.ADJECTIVE_SUFFIX.test(lower) && /(?:ando|endo|indo)$/i.test(lower);
  }
  /** Superfície de verbo finito (PT), só morfologia; evita substantivo quando há condicional em -iam. */
  static isFiniteVerbSurfaceCandidate(word) {
    const lower = word.toLowerCase();
    if (word.length < 5 || word.length > 24)
      return false;
    if (word.startsWith("~") || /\d/.test(word) || /^[A-Z]/.test(word))
      return false;
    if (_PithEngine.ADJECTIVE_SUFFIX.test(lower))
      return false;
    if (_PithEngine.isNominalLikelyShape(lower))
      return false;
    if (/iam$/i.test(lower))
      return true;
    return false;
  }
  /** Substantivo provável só por sufixo / plurais (sem léxico). */
  static isNominalLikelyShape(lower) {
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
  /** Peso intratextual (sem léxico): raridade local ≈ log(N/(tf+1)) — mesmo idioma/frase. */
  static weightInfinitiveAction(baseScore, word, freq, totalWords) {
    const key = word.toLowerCase();
    const tf = freq.get(key) ?? 0;
    const idf = Math.log1p(totalWords / (tf + 1));
    return baseScore * (1 + 0.35 * idf);
  }
  static pickVerbalAction(fused, freq, totalWords) {
    const weigh = (item) => ({
      ...item,
      score: _PithEngine.weightInfinitiveAction(item.score, item.word, freq, totalWords)
    });
    const inf = fused.filter((item) => _PithEngine.isInfinitiveCandidate(item.word)).map(weigh);
    const ger = fused.filter((item) => _PithEngine.isGerundCandidate(item.word)).map(weigh);
    const fin = fused.filter((item) => _PithEngine.isFiniteVerbSurfaceCandidate(item.word)).map(weigh);
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
      if (_PithEngine.ADJECTIVE_SUFFIX.test(k))
        continue;
      if (_PithEngine.isNominalLikelyShape(k))
        continue;
      return { action: "!" + item.word, actionKeys: /* @__PURE__ */ new Set([k]) };
    }
    return { action: "", actionKeys: /* @__PURE__ */ new Set() };
  }
  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  optimize(text) {
    try {
      if (!text.trim())
        return { output: "[PITH: No meaningful data found]", noiseRemoved: 0, isQuery: false };
      const mode = this.detectMode(text);
      const result = mode === "compress" ? this.compressPipeline(text) : mode === "conversational" ? this.conversationalPipeline(text) : this.queryPipeline(text);
      return { ...result, isQuery: mode !== "compress" };
    } catch {
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }
  compressCode(code) {
    return code;
  }
  // ═══════════════════════════════════════════════════
  // MODE DETECTION (compress | query | conversational)
  // ═══════════════════════════════════════════════════
  detectMode(text) {
    if (text.split(/\s+/).length > 40)
      return "compress";
    if (text.split("\n").filter((l) => l.trim()).length > 3)
      return "compress";
    if (/```/.test(text))
      return "compress";
    if (/^\s*\d+\.\s/m.test(text))
      return "compress";
    if (/^\s*[-•–]\s/m.test(text))
      return "compress";
    if (this.isConversational(text))
      return "conversational";
    return "query";
  }
  // Conversational: só sinal estrutural (≥2 '?'), sem léxico de pronome/tópico
  isConversational(text) {
    const qCount = (text.match(/\?/g) || []).length;
    return qCount >= 2;
  }
  // ═══════════════════════════════════════════════════
  // SCORING ENGINE (core intelligence — zero word lists)
  // ═══════════════════════════════════════════════════
  buildFreqMap(text) {
    const freq = /* @__PURE__ */ new Map();
    for (const w of text.toLowerCase().split(/\s+/)) {
      const clean = w.replace(/[^a-zA-ZÀ-ÿ]/g, "");
      if (clean)
        freq.set(clean, (freq.get(clean) || 0) + 1);
    }
    return freq;
  }
  scoreWord(word, freq, totalWords, isFirstInLine, isSentenceStart = false, isQuestion = false) {
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
    if (_PithEngine.isRomanceInfinitiveShape(st) && _PithEngine.VERB_INFINITIVE.test(st)) {
      score += 6;
    }
    if (/(?:ando|endo|indo)$/i.test(st) && st.length >= 5) {
      score += 5;
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
    if (clean.length >= 5 && _PithEngine.VERB_CONJUGATED.test(clean.toLowerCase()))
      score -= 3;
    if (isFirstInLine && !isSentenceStart)
      score += 2;
    if (isSentenceStart && isFirstInLine && clean.length >= 2 && clean.length <= 6) {
      score += 2;
    }
    return score;
  }
  // ═══════════════════════════════════════════════════
  // PIPELINE 1: COMPRESSION (universal, any text type)
  // Preserve → Pattern → Score+Filter → Abbreviate → Clean
  // ═══════════════════════════════════════════════════
  compressPipeline(text) {
    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;
    const { text: preserved, map: preserveMap } = this.preserveLayer(cleaned);
    const patterned = this.patternLayer(preserved);
    const freq = this.buildFreqMap(patterned);
    const totalWords = patterned.split(/\s+/).length;
    const filtered = this.scoreFilterLines(patterned, freq, totalWords, _PithEngine.COMPRESS_THRESHOLD);
    const abbreviated = this.abbreviate(filtered);
    const final = this.restoreAndClean(abbreviated, preserveMap).trim();
    if (!final)
      return { output: text, noiseRemoved: 0 };
    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode("C", { payload: final }, flags);
    const outputWordCount = final.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: finalOutput, noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // PIPELINE 2: QUERY (symbolic token extraction)
  // [tag] !action #niche @entity ?attr — TAG/GOAL/CSTR/PROTO sem mapas de domínio (só scoring+morfologia)
  // ═══════════════════════════════════════════════════
  queryPipeline(text) {
    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;
    let workText = cleaned.replace(/[?!.…]+$/g, "").trim();
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, "$1 $3");
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, "$1 $2");
    const freq = this.buildFreqMap(workText);
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
    const isQuestion = workText.endsWith("?");
    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i))
        continue;
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
      if (!clean)
        continue;
      if (_PithEngine.NEGATION_TOGGLE_WORD_RE.test(clean)) {
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
      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, isQuestion);
      if (score >= _PithEngine.QUERY_THRESHOLD) {
        survivors.push({ word: negateNext ? "~" + clean : clean, score, origIdx: i });
        negateNext = false;
      }
    }
    for (let si = 0; si < survivors.length; si++) {
      const w = survivors[si].word;
      if (sentenceStarts.has(survivors[si].origIdx)) {
        if (!/^[A-Z][A-Z0-9]+$/.test(w)) {
          survivors[si] = { ...survivors[si], word: w.toLowerCase() };
        }
      }
    }
    const fused = this.fuseProperNouns(survivors);
    const niches = [];
    const entities = [];
    const attrs = [];
    const seen = /* @__PURE__ */ new Set();
    const picked = _PithEngine.pickVerbalAction(fused, freq, totalWords);
    let action = picked.action;
    const actionKeys = picked.actionKeys;
    const tag = "";
    for (const item of fused) {
      const key = item.word.toLowerCase();
      if (seen.has(key))
        continue;
      seen.add(key);
      if (/\d/.test(item.word)) {
        attrs.push("?" + item.word);
        continue;
      }
      if (_PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase())) {
        attrs.push("?" + item.word.toLowerCase());
        continue;
      }
      if (/^[A-Z]/.test(item.word)) {
        entities.push("@" + item.word);
        continue;
      }
      if (actionKeys.has(key))
        continue;
      if (!action) {
        if (!_PithEngine.isNominalLikelyShape(key)) {
          action = "!" + item.word;
        } else {
          niches.push({ word: "#" + item.word, score: item.score });
        }
      } else {
        niches.push({ word: "#" + item.word, score: item.score });
      }
    }
    const topNiches = niches.sort((a, b) => b.score - a.score).slice(0, _PithEngine.MAX_QUERY_NICHES).map((n) => n.word);
    const spec = { goal: "_", cstr: "_", proto: "_" };
    const actionOut = action;
    const nichesOut = topNiches;
    const attrsFinal = attrs;
    const parts = [];
    if (tag)
      parts.push(tag);
    if (actionOut)
      parts.push(actionOut);
    for (const n of nichesOut)
      parts.push(n);
    for (const e of entities)
      parts.push(e);
    for (const a of attrsFinal)
      parts.push(a);
    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode("Q", {
      tag,
      action: actionOut,
      goal: spec.goal,
      cstr: spec.cstr,
      proto: spec.proto,
      niches: nichesOut,
      entities,
      attrs: attrsFinal
    }, flags);
    if (!finalOutput)
      return { output: text, noiseRemoved: 0 };
    const outputWordCount = finalOutput.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: finalOutput, noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // PIPELINE 3: CONVERSATIONAL (multi-sentence, implicit intent)
  // [stance] ![action] #topic @entity ?attr
  // stance: [?]=questioning [~]=negative [~?]=both
  // ═══════════════════════════════════════════════════
  conversationalPipeline(text) {
    const qCount = (text.match(/\?/g) || []).length;
    const negCount = (text.match(/\b(não|nao|not|never|sem|without|nem)\b|n't\b/gi) || []).length;
    let stance = "";
    if (negCount > 0 && qCount > 0)
      stance = "[~?]";
    else if (negCount > 0)
      stance = "[~]";
    else if (qCount >= 1)
      stance = "[?]";
    const cleaned = this.humanNoiseLayer(text);
    const originalWordCount = cleaned.split(/\s+/).length;
    let workText = cleaned.replace(/[?!.…]+$/g, "").trim();
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])/g, "$1 $3");
    workText = workText.replace(/([a-zA-ZÀ-ÿ0-9])\/([a-zA-ZÀ-ÿ0-9])/g, "$1 $2");
    const freq = this.buildFreqMap(workText);
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
      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart, false);
      if (score >= CONV_THRESHOLD)
        survivors.push({ word: clean, score, origIdx: i });
    }
    for (let si = 0; si < survivors.length; si++) {
      const w = survivors[si].word;
      if (sentenceStarts.has(survivors[si].origIdx) && !/^[A-Z][A-Z0-9]+$/.test(w)) {
        survivors[si] = { ...survivors[si], word: w.toLowerCase() };
      }
    }
    const fused = this.fuseProperNouns(survivors);
    const picked = _PithEngine.pickVerbalAction(fused, freq, totalWords);
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
      if (_PithEngine.ADJECTIVE_SUFFIX.test(key)) {
        attrs.push("?" + key);
        continue;
      }
      if (/^[A-Z]/.test(item.word)) {
        entities.push("@" + item.word);
        continue;
      }
      if (actionKeys.has(key))
        continue;
      if (!action) {
        if (!_PithEngine.isNominalLikelyShape(key)) {
          action = "!" + item.word;
        } else {
          niches.push({ word: "#" + item.word, score: item.score });
        }
      } else {
        niches.push({ word: "#" + item.word, score: item.score });
      }
    }
    const topNiches = niches.sort((a, b) => b.score - a.score).slice(0, _PithEngine.MAX_QUERY_NICHES).map((n) => n.word);
    const spec = { goal: "_", cstr: "_", proto: "_" };
    const actionOut = action;
    const nichesOut = topNiches;
    const parts = [];
    if (stance)
      parts.push(stance);
    if (actionOut)
      parts.push(actionOut);
    for (const n of nichesOut)
      parts.push(n);
    for (const e of entities)
      parts.push(e);
    for (const a of attrs.slice(0, 3))
      parts.push(a);
    const flags = this.computeFlags(text);
    const finalOutput = this.buildOpcode("V", {
      stance,
      tag: "",
      action: actionOut,
      goal: spec.goal,
      cstr: spec.cstr,
      proto: spec.proto,
      niches: nichesOut,
      entities,
      attrs: attrs.slice(0, 3)
    }, flags);
    if (!finalOutput)
      return { output: text, noiseRemoved: 0 };
    const outputWordCount = finalOutput.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: finalOutput, noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // SHARED LAYERS
  // ═══════════════════════════════════════════════════
  /** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
  static isaCrc(baseWithoutCrc) {
    let hash = 2166136261;
    for (let i = 0; i < baseWithoutCrc.length; i++) {
      hash ^= baseWithoutCrc.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const hex = (hash >>> 0).toString(16).toUpperCase();
    return hex.padStart(8, "0").slice(-8);
  }
  /** Flags só por forma (código, lista, densidade), sem léxico de domínio. */
  computeFlags(originalText) {
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
  buildOpcode(mode, data, flags) {
    const EMPTY = "_";
    const stance = data.stance ? data.stance.replace(/[\[\]]/g, "") : "";
    const tag = data.tag ? data.tag.replace(/[\[\]]/g, "") : "";
    const action = data.action ? data.action.replace(/^!/, "") : "";
    const goal = data.goal && data.goal !== EMPTY ? data.goal : EMPTY;
    const cstr = data.cstr && data.cstr !== EMPTY ? data.cstr : EMPTY;
    const proto = data.proto && data.proto !== EMPTY ? data.proto : EMPTY;
    const niches = data.niches && data.niches.length ? data.niches.map((n) => n.replace(/^#/, "")).filter(Boolean).join(",") : "";
    const entities = data.entities && data.entities.length ? data.entities.map((e) => e.replace(/^@/, "")).filter(Boolean).join(",") : "";
    const attrs = data.attrs && data.attrs.length ? data.attrs.map((a) => a.replace(/^\?/, "")).map((a) => a.replace(/^(\d+)[a-z]+$/i, "$1")).filter(Boolean).join(",") : "";
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
    return ordered.join(" ");
  }
  humanNoiseLayer(text) {
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
  // Preserve untouchable tokens with placeholders
  preserveLayer(text) {
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
  // Structural pattern transforms (algorithmic, not word lists)
  patternLayer(text) {
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
    r = r.replace(_PithEngine.COPULA_PT_RE, "=");
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
  // Score-based line-by-line filtering
  scoreFilterLines(text, freq, totalWords, defaultThreshold) {
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
      if (this.isHeader(trimmed)) {
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
            if (_PithEngine.isPatternSymbolToken(w))
              return Infinity;
            return null;
          }
          if (_PithEngine.NEGATION_TOGGLE_WORD_RE.test(wClean))
            return null;
          const isSentStart = lineStarts.has(i);
          return this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
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
            if (_PithEngine.isPatternSymbolToken(w)) {
              kept.push(w);
              negateNext = false;
            }
            continue;
          }
          if (_PithEngine.NEGATION_TOGGLE_WORD_RE.test(wClean)) {
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
  // Abbreviate known long words
  abbreviate(text) {
    return text.replace(/\b[a-zA-ZÀ-ÿ]{7,}\b/g, (word) => {
      return _PithEngine.ABBREV.get(word.toLowerCase()) || word;
    });
  }
  // Restore placeholders and clean whitespace
  restoreAndClean(text, map) {
    let r = text;
    for (const [key, value] of map.entries())
      r = r.replace(key, value);
    r = r.replace(/[ \t]{2,}/g, " ");
    r = r.replace(/\n{3,}/g, "\n\n");
    return r.split("\n").map((l) => l.trimEnd()).join("\n").trim();
  }
  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════
  isHeader(line) {
    if (/^#{1,6}\s/.test(line))
      return true;
    if (/^\d+\.\s+[A-ZÀ-Ý]/.test(line))
      return true;
    if (/^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$/.test(line) && line.length < 80)
      return true;
    return false;
  }
  fuseProperNouns(items) {
    const result = [];
    let i = 0;
    while (i < items.length) {
      if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(items[i].word)) {
        let fused = items[i].word;
        let maxScore = items[i].score;
        let lastOrigIdx = items[i].origIdx;
        let j = i + 1;
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
};

// src/extension.ts
function getTargetRange(editor) {
  const { selection, document } = editor;
  if (!selection.isEmpty)
    return selection;
  return new vscode.Range(
    new vscode.Position(0, 0),
    document.lineCount > 0 ? new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length) : new vscode.Position(0, 0)
  );
}
var STATUS_DEFAULT = "$(sparkle) Pith";
function showBriefStatus(message, statusBar) {
  statusBar.text = message;
  statusBar.show();
  setTimeout(() => {
    statusBar.text = STATUS_DEFAULT;
  }, 2500);
}
function activate(context) {
  const cfg = vscode.workspace.getConfiguration("pith");
  const telemetryApiUrl = String(cfg.get("telemetryApiUrl") || "").trim();
  const telemetryToken = String(cfg.get("telemetryToken") || "").trim();
  const telemetryEnabled = Boolean(cfg.get("telemetryEnabled", false));
  const engine = new PithEngine();
  async function optimizeWithPersist(text) {
    if (!telemetryEnabled || !telemetryApiUrl || !telemetryToken) {
      return engine.optimize(text);
    }
    try {
      const res = await fetch(`${telemetryApiUrl}/v1/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telemetryToken}`
        },
        body: JSON.stringify({ text })
      });
      if (!res.ok)
        return engine.optimize(text);
      const j = await res.json();
      return { output: j.output, noiseRemoved: j.noiseRemoved };
    } catch {
      return engine.optimize(text);
    }
  }
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);
  const runOptimize = async (copyOnly) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Abra um arquivo para usar o Pith.");
      return;
    }
    const targetRange = getTargetRange(editor);
    const text = editor.document.getText(targetRange);
    if (!text.trim()) {
      vscode.window.showWarningMessage("Selecione texto ou use em um arquivo com conte\xFAdo.");
      return;
    }
    try {
      const { output, noiseRemoved } = await optimizeWithPersist(text);
      if (copyOnly) {
        await vscode.env.clipboard.writeText(output);
        showBriefStatus(`$(check) Pith: copiado (-${noiseRemoved}%)`, statusBarItem);
      } else {
        await editor.edit((editBuilder) => editBuilder.replace(targetRange, output));
        showBriefStatus(`$(check) Pith: otimizado (-${noiseRemoved}%)`, statusBarItem);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Pith: ${error.message}`);
    }
  };
  const runOptimizeClipboard = async () => {
    let text;
    try {
      text = await vscode.env.clipboard.readText();
    } catch {
      vscode.window.showErrorMessage("N\xE3o foi poss\xEDvel ler a \xE1rea de transfer\xEAncia.");
      return;
    }
    if (!text?.trim()) {
      vscode.window.showWarningMessage("\xC1rea de transfer\xEAncia vazia. Copie o texto do chat primeiro.");
      return;
    }
    try {
      const { output, noiseRemoved } = await optimizeWithPersist(text);
      await vscode.env.clipboard.writeText(output);
      showBriefStatus(`$(check) Pith: clipboard (-${noiseRemoved}%) \u2192 Cole no chat`, statusBarItem);
    } catch (error) {
      vscode.window.showErrorMessage(`Pith: ${error.message}`);
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("pith.optimize", () => runOptimize(false)),
    vscode.commands.registerCommand("pith.optimizeCopy", () => runOptimize(true)),
    vscode.commands.registerCommand("pith.optimizeClipboard", runOptimizeClipboard)
  );
  statusBarItem.text = STATUS_DEFAULT;
  statusBarItem.tooltip = "Editor: Ctrl+Alt+P. Chat: copie o texto \u2192 Ctrl+Alt+Shift+P \u2192 cole.";
  statusBarItem.command = "pith.optimize";
  statusBarItem.show();
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
