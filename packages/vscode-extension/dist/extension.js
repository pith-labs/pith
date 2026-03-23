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
  onOptimizeResult;
  constructor(opts) {
    this.onOptimizeResult = opts?.onOptimizeResult;
  }
  emitOptimizeTelemetry(text, result, kind) {
    if (!this.onOptimizeResult)
      return;
    const payload = {
      text,
      output: result.output,
      noiseRemoved: result.noiseRemoved,
      isQuery: result.isQuery,
      kind
    };
    const run = () => {
      try {
        this.onOptimizeResult(payload);
      } catch {
      }
    };
    if (typeof queueMicrotask === "function")
      queueMicrotask(run);
    else
      void Promise.resolve().then(run);
  }
  // ═══════════════════════════════════════════════════
  // MINIMAL CONFIG (domain config, not language data)
  // ═══════════════════════════════════════════════════
  // Intent tags for query symbolic mode (PT, EN, ES, FR, DE)
  static INTENT_TAGS = /* @__PURE__ */ new Map([
    // PT
    ["como", "ex"],
    ["explicar", "ex"],
    ["explique", "ex"],
    ["analisar", "an"],
    ["mostrar", "an"],
    ["otimizar", "op"],
    ["melhorar", "op"],
    ["ideia", "id"],
    ["dicas", "id"],
    ["criar", "gen"],
    ["gerar", "gen"],
    ["corrigir", "fx"],
    ["erro", "fx"],
    ["resumir", "sm"],
    ["tarefa", "tk"],
    ["estudar", "st"],
    ["plano", "st"],
    // EN
    ["how", "ex"],
    ["explain", "ex"],
    ["what", "ex"],
    ["analyze", "an"],
    ["optimize", "op"],
    ["improve", "op"],
    ["idea", "id"],
    ["suggest", "id"],
    ["create", "gen"],
    ["generate", "gen"],
    ["fix", "fx"],
    ["bug", "fx"],
    ["summarize", "sm"],
    ["task", "tk"],
    ["learn", "st"],
    // ES (Spanish)
    ["c\xF3mo", "ex"],
    ["explicar", "ex"],
    ["explica", "ex"],
    ["qu\xE9", "ex"],
    ["analizar", "an"],
    ["analisa", "an"],
    ["optimizar", "op"],
    ["mejorar", "op"],
    ["idea", "id"],
    ["sugerir", "id"],
    ["crear", "gen"],
    ["generar", "gen"],
    ["corregir", "fx"],
    ["error", "fx"],
    ["resumir", "sm"],
    ["tarea", "tk"],
    ["aprender", "st"],
    ["plan", "st"],
    // FR (French)
    ["comment", "ex"],
    ["expliquer", "ex"],
    ["explique", "ex"],
    ["quoi", "ex"],
    ["analyser", "an"],
    ["optimiser", "op"],
    ["am\xE9liorer", "op"],
    ["id\xE9e", "id"],
    ["sugg\xE9rer", "id"],
    ["cr\xE9er", "gen"],
    ["g\xE9n\xE9rer", "gen"],
    ["corriger", "fx"],
    ["erreur", "fx"],
    ["r\xE9sumer", "sm"],
    ["t\xE2che", "tk"],
    ["apprendre", "st"],
    // DE (German)
    ["wie", "ex"],
    ["erkl\xE4ren", "ex"],
    ["erkl\xE4re", "ex"],
    ["was", "ex"],
    ["analysieren", "an"],
    ["optimieren", "op"],
    ["verbessern", "op"],
    ["idee", "id"],
    ["vorschlagen", "id"],
    ["erstellen", "gen"],
    ["generieren", "gen"],
    ["korrigieren", "fx"],
    ["fehler", "fx"],
    ["zusammenfassen", "sm"],
    ["aufgabe", "tk"],
    ["lernen", "st"]
  ]);
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
  static QUERY_THRESHOLD = 6;
  static COMPRESS_THRESHOLD = 4;
  static MAX_QUERY_NICHES = 4;
  static MAX_PAYLOAD_CHARS = 256;
  // Morphological patterns (algorithmic, not word lists)
  // Adjective/determiner suffixes — Latin-derived morphological patterns, never verb roots
  // -ular/-olar/-lear: celular, solar, nuclear, linear, popular, molecular, circular
  // -quer/-quier: qualquer, quaisquer (PT), cualquier (ES) — grammaticalized determiners
  // -ico/-ica: genérico, histórico, dinâmico, automático, específico, público, único, lógico
  static ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|olar|lear|quer|quier|ico|ica)$/i;
  static VERB_INFINITIVE = /[aei]r$/i;
  static VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;
  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  optimize(text, options) {
    const kind = options?.telemetryKind ?? "user_prompt";
    try {
      if (!text.trim())
        return { output: "[PITH: No meaningful data found]", noiseRemoved: 0, isQuery: false };
      const mode = this.detectMode(text);
      const result = mode === "compress" ? this.compressPipeline(text) : mode === "conversational" ? this.conversationalPipeline(text) : this.queryPipeline(text);
      const out = { ...result, isQuery: mode !== "compress" };
      this.emitOptimizeTelemetry(text, out, kind);
      return out;
    } catch (error) {
      console.error("Pith Engine Error:", error);
      const out = { output: text, noiseRemoved: 0, isQuery: false };
      this.emitOptimizeTelemetry(text, out, kind);
      return out;
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
  // Conversational signals (pattern-based, no word lists):
  // ≥2 question marks, OR question + personal pronoun + multiple sentences
  isConversational(text) {
    const qCount = (text.match(/\?/g) || []).length;
    const hasPersonal = /(?:^|[^a-zA-ZÀ-ÿ])(eu|tu|você|vocês|nós|I|we|you)(?:[^a-zA-ZÀ-ÿ]|$)/i.test(text);
    return qCount >= 2 || qCount >= 1 && hasPersonal;
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
    if (clean.length === 3) {
      if (!/[aeiouà-ú]/i.test(clean))
        score += 3;
      if (isQuestion)
        score += 2;
      if (/^(bom|mal|bad|boa|bug|api|app|web)$/i.test(clean))
        score += 5;
    }
    if (/^[A-Z][A-Z0-9]+$/.test(clean)) {
      score += 8;
    } else if (/^[A-ZÀ-Ý]/.test(clean) && !isSentenceStart) {
      score += 5;
    }
    if (totalWords > 30) {
      const ratio = (freq.get(clean.toLowerCase()) || 0) / totalWords;
      if (ratio > 0.02)
        score -= Math.min(Math.floor(ratio * 60), 6);
    }
    if (clean.length >= 5 && _PithEngine.VERB_CONJUGATED.test(clean.toLowerCase()))
      score -= 3;
    if (isFirstInLine && !isSentenceStart)
      score += 2;
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
    const flags = this.computeFlags(text, []);
    const finalOutput = this.buildOpcode("C", { payload: final }, flags);
    const outputWordCount = final.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: finalOutput, noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // PIPELINE 2: QUERY (symbolic token extraction)
  // [tag] !action #niche @entity ?attr
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
    const negationRegex = /^(não|nao|not|never|sem|without|nem)$/i;
    let negateNext = false;
    const isQuestion = workText.endsWith("?");
    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i))
        continue;
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9-]/g, "");
      if (!clean)
        continue;
      if (negationRegex.test(clean)) {
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
    const infinitives = fused.filter(
      (item) => !item.word.startsWith("~") && !/\d/.test(item.word) && !/^[A-Z]/.test(item.word) && item.word.length >= 6 && !_PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) && _PithEngine.VERB_INFINITIVE.test(item.word.toLowerCase())
    ).sort((a, b) => b.score - a.score);
    const actionWords = infinitives.slice(0, 2).map((i) => i.word);
    const actionKeys = new Set(actionWords.map((w) => w.toLowerCase()));
    let action = actionWords.length === 2 ? `![${actionWords[0]}|${actionWords[1]}]` : actionWords.length === 1 ? "!" + actionWords[0] : "";
    const lower = workText.toLowerCase();
    let tag = "";
    for (const aw of actionWords) {
      const t = _PithEngine.INTENT_TAGS.get(aw.toLowerCase());
      if (t) {
        tag = `[${t}]`;
        break;
      }
    }
    if (!tag) {
      for (const [key, val] of _PithEngine.INTENT_TAGS.entries()) {
        if (lower.includes(key)) {
          tag = `[${val}]`;
          break;
        }
      }
    }
    if (!action) {
      for (const [key] of _PithEngine.INTENT_TAGS.entries()) {
        if (lower.includes(key) && _PithEngine.VERB_INFINITIVE.test(key)) {
          action = "!" + key;
          actionKeys.add(key);
          break;
        }
      }
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
        action = "!" + item.word;
      } else {
        niches.push({ word: "#" + item.word, score: item.score });
      }
    }
    const topNiches = niches.sort((a, b) => b.score - a.score).slice(0, _PithEngine.MAX_QUERY_NICHES).map((n) => n.word);
    const spec = this.extractProductSpec(text);
    const lowerNorm = this.isaNorm(text);
    let { action: actionOut, niches: nichesOut } = this.applySpecToQuery(spec, action, topNiches, lowerNorm);
    const patched = this.patchGenericQueryInterpretation(lowerNorm, tag, actionOut, nichesOut, [...attrs]);
    actionOut = patched.action;
    nichesOut = patched.niches;
    const attrsFinal = patched.attrs;
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
    const flags = this.computeFlags(text, parts);
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
    const infinitives = fused.filter(
      (item) => !/\d/.test(item.word) && !/^[A-Z]/.test(item.word) && item.word.length >= 6 && !_PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase()) && _PithEngine.VERB_INFINITIVE.test(item.word.toLowerCase())
    ).sort((a, b) => b.score - a.score);
    const actionWords = infinitives.slice(0, 2).map((i) => i.word);
    const actionKeys = new Set(actionWords.map((w) => w.toLowerCase()));
    let action = actionWords.length === 2 ? `![${actionWords[0]}|${actionWords[1]}]` : actionWords.length === 1 ? "!" + actionWords[0] : "";
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
      if (/^(meu|minha|meus|minhas|nosso|nossa|nossos|nossas)$/i.test(item.word)) {
        attrs.push("?" + key);
        continue;
      }
      if (/^(esposa|esposo|marido|filho|filha)$/i.test(item.word)) {
        attrs.push("?" + key);
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
      if (!action)
        action = "!" + item.word;
      else
        niches.push({ word: "#" + item.word, score: item.score });
    }
    const topNiches = niches.sort((a, b) => b.score - a.score).slice(0, _PithEngine.MAX_QUERY_NICHES).map((n) => n.word);
    const spec = this.extractProductSpec(text);
    const lowerNorm = this.isaNorm(text);
    const { action: actionOut, niches: nichesOut } = this.applySpecToQuery(spec, action, topNiches, lowerNorm);
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
    const flags = this.computeFlags(text, parts);
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
  isaNorm(raw) {
    return raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  mergeIsaSpecParts(chunks) {
    const EMPTY = "_";
    const goal = [...new Set(chunks.flatMap((c) => c.goal))].join("+") || EMPTY;
    const cstr = [...new Set(chunks.flatMap((c) => c.cstr))].join("|") || EMPTY;
    const proto = [...new Set(chunks.flatMap((c) => c.proto))].join("|") || EMPTY;
    if (goal === EMPTY && cstr === EMPTY && proto === EMPTY) {
      return { goal: EMPTY, cstr: EMPTY, proto: EMPTY };
    }
    return { goal, cstr, proto };
  }
  detectAssemblyIsaSpec(n) {
    const goal = [];
    const cstr = [];
    const proto = [];
    const hasAssembly = /\bassembly\b/.test(n);
    const hasIa = /\b(ia|ai|llm)\b/.test(n);
    const humanOut = /linguagem\s+humana/.test(n) && /resposta/.test(n) || /\b(s[oó]|somente|apenas)\s+na\s+resposta\b/.test(n) || /\bhuman\s+language\b/.test(n) && /\bresponse\b/.test(n) || /\bonly\s+in\s+(the\s+)?response\b/.test(n);
    const asmIn = /\bvai\s+receber\s+apenas\b/.test(n) || /\b(receive|receber)\s+only\s+assembly\b/.test(n) || /\b(apenas|somente|only)\s+(o\s+)?assembly\b/.test(n) && /receber|receive|input|entrada/.test(n) || hasAssembly && /\b(apenas|somente|only)\b/.test(n) && /\b(receber|receive|entrada|input)\b/.test(n);
    if (hasAssembly && hasIa)
      goal.push("ASM_IA");
    if (humanOut)
      goal.push("HUMAN_OUT");
    if (asmIn)
      goal.push("ASM_IN");
    if (asmIn || hasAssembly && /\b(apenas|somente|only)\b/.test(n) && /\b(receber|receive)\b/.test(n)) {
      cstr.push("IN_ASM_ONLY");
    }
    if (humanOut)
      cstr.push("OUT_HUMAN_ONLY");
    if (asmIn || cstr.includes("IN_ASM_ONLY"))
      proto.push("IN=ASM");
    if (humanOut || cstr.includes("OUT_HUMAN_ONLY"))
      proto.push("OUT=HUMAN");
    return { goal, cstr, proto };
  }
  detectLearnIsaSpec(n) {
    const goal = [];
    const cstr = [];
    const proto = [];
    const hasMlCore = /\b(aprendizado de maquina|machine learning|ml)\b/.test(n) || /\b(aprendizado|learning)\b/.test(n) && /\b(maquina|machine)\b/.test(n);
    const hasAutonomyIntent = /\b(evoluir sozinho|evolua sozinho)\b/.test(n) || /\b(autonomo|autonomous|self[-\s]?improve|self[-\s]?learning)\b/.test(n) || /\b(sozinho|sozinha|automatico|automaticamente)\b/.test(n) && /\b(evoluir|evolui|evolua|melhorar|consertar|corrigir)\b/.test(n);
    const hasEngineContext = /\b(algoritmo|motor|engine|modelo|sistema|pith)\b/.test(n);
    const hasSelfHeal = /\b(se\s+consert|auto[-\s]?corrig|self[-\s]?heal|auto[-\s]?melhor)\b/.test(n);
    const strongPair = hasMlCore && hasAutonomyIntent;
    const engineEvolves = hasEngineContext && hasAutonomyIntent && (hasMlCore || hasSelfHeal);
    if (strongPair || engineEvolves) {
      goal.push("SELF_IMPROVE");
      cstr.push("SAFE_AUTONOMY");
      proto.push("LEARN=ON");
      proto.push("UPDATE=CONTROLLED");
    }
    return { goal, cstr, proto };
  }
  detectPromptIsaSpec(n) {
    const goal = [];
    const cstr = [];
    const proto = [];
    const hasPromptCore = /\b(prompt|prompts)\b/.test(n) || /\b(comando|instrucao|instrucoes)\b/.test(n);
    const hasGenericCoverage = /\b(generico|gen[eé]rico|qualquer|any|todos os casos|all cases)\b/.test(n) && /\b(funcione|funcionar|robusto|robust|consistente|consistent)\b/.test(n);
    if (hasPromptCore && hasGenericCoverage) {
      goal.push("ROBUST_PROMPT");
      cstr.push("GENERIC_COVERAGE");
      proto.push("INPUT=ANY");
      proto.push("OUTPUT=CONSISTENT");
    }
    return { goal, cstr, proto };
  }
  /** Product / protocol intent: merged detectores opt-in (assembly, learn, prompt). */
  extractProductSpec(raw) {
    const n = this.isaNorm(raw);
    return this.mergeIsaSpecParts([
      this.detectAssemblyIsaSpec(n),
      this.detectLearnIsaSpec(n),
      this.detectPromptIsaSpec(n)
    ]);
  }
  /** Preenche ACT/N/A de forma genérica quando o scoring deixou slots vazios demais. */
  patchGenericQueryInterpretation(lowerNorm, tag, actionOut, nichesOut, attrs) {
    const action = actionOut || "";
    let niches = [...nichesOut];
    const attrsOut = [...attrs];
    const tagVal = tag.replace(/[\[\]]/g, "");
    const isExplanatory = tagVal === "ex";
    const isQuestion = /\?/.test(lowerNorm) || /^(como|qual|quais|quem|onde|quando|por que|porque|o que|what|how|why|when|where)\b/.test(lowerNorm);
    let nextAction = action;
    if (isExplanatory && !nextAction.replace(/^!/, "")) {
      nextAction = "!consultar";
    }
    const hasNiche = (w) => niches.some((n) => n.replace(/^#/, "").toLowerCase() === w);
    const pushNiche = (w) => {
      if (!hasNiche(w))
        niches.push("#" + w);
    };
    if (!niches.length) {
      if (/\btempo\b/.test(lowerNorm))
        pushNiche("tempo");
      else if (/\bclima\b/.test(lowerNorm))
        pushNiche("clima");
      else if (/\bweather\b/.test(lowerNorm))
        pushNiche("weather");
    }
    if (!niches.length && (isExplanatory || isQuestion)) {
      const m = lowerNorm.match(
        /\b(?:como\s+(?:esta|está|ta|e)|qual\s+(?:e|é|seria)|o\s+que\s+(?:e|é))\s+(?:o\s+|a\s+)?([a-zà-öø-ÿ]{3,})\b/
      );
      if (m) {
        const w = m[1];
        const stop = /* @__PURE__ */ new Set([
          "esta",
          "est\xE1",
          "esse",
          "essa",
          "isso",
          "aquilo",
          "coisa",
          "situa",
          "situacao"
        ]);
        if (!stop.has(w))
          pushNiche(w);
      }
    }
    const pushAttr = (w) => {
      const key = w.toLowerCase();
      if (!attrsOut.some((a) => a.replace(/^\?/, "").toLowerCase() === key))
        attrsOut.push("?" + key);
    };
    if (/\bhoje\b|today\b/.test(lowerNorm))
      pushAttr("hoje");
    if (/\bagora\b|now\b/.test(lowerNorm))
      pushAttr("agora");
    if (/\b(amanha|amanhã|tomorrow)\b/.test(lowerNorm))
      pushAttr("amanha");
    return { action: nextAction, niches, attrs: attrsOut };
  }
  static SPEC_NICHE_STOP = /* @__PURE__ */ new Set([
    "elogiam",
    "elogio",
    "ninguem",
    "ningu\xE9m",
    "sonhou",
    "sonhar",
    "todos",
    "todas",
    "maravilhosa",
    "maravilhoso",
    "engine",
    "quero",
    "queria",
    "linguagem",
    "resposta",
    "humana",
    "humano",
    "receber",
    "perfeito",
    "agora",
    "funcione",
    "precisa",
    "qualquer",
    "generico",
    "gen\xE9rico",
    "prompt"
  ]);
  applySpecToQuery(spec, action, topNiches, lowerFull) {
    const empty = spec.goal === "_" && spec.cstr === "_" && spec.proto === "_";
    if (empty)
      return { action, niches: topNiches };
    const hasIn = spec.proto.includes("IN=ASM");
    const hasOut = spec.proto.includes("OUT=HUMAN");
    const hasLearn = spec.goal.includes("SELF_IMPROVE") || spec.proto.includes("LEARN=ON");
    const hasPromptSpec = spec.goal.includes("ROBUST_PROMPT") || spec.proto.includes("INPUT=ANY");
    let nextAction = action;
    if (hasLearn)
      nextAction = "![define|learning]";
    else if (hasPromptSpec)
      nextAction = "![define|prompt]";
    else if (hasIn && hasOut)
      nextAction = "![define|protocol]";
    else if (hasIn)
      nextAction = "!define_asm_in";
    else if (hasOut)
      nextAction = "!define_human_out";
    else
      nextAction = "!spec_product";
    const filtered = topNiches.map((n) => n.replace(/^#/, "")).filter((w) => w && !_PithEngine.SPEC_NICHE_STOP.has(w.toLowerCase()));
    const extra = [];
    if (/\bassembly\b/.test(lowerFull) && !filtered.some((x) => x.toLowerCase() === "assembly")) {
      extra.push("assembly");
    }
    if (hasLearn && !filtered.some((x) => x.toLowerCase() === "aprendizado")) {
      extra.push("aprendizado");
    }
    if (hasLearn && !filtered.some((x) => x.toLowerCase() === "maquina")) {
      extra.push("maquina");
    }
    if (hasPromptSpec && !filtered.some((x) => x.toLowerCase() === "algoritmo")) {
      extra.push("algoritmo");
    }
    if (hasPromptSpec && !filtered.some((x) => x.toLowerCase() === "prompt")) {
      extra.push("prompt");
    }
    const merged = [...extra, ...filtered];
    const seen = /* @__PURE__ */ new Set();
    const niches = [];
    for (const w of merged) {
      const k = w.toLowerCase();
      if (seen.has(k))
        continue;
      seen.add(k);
      niches.push("#" + w);
      if (niches.length >= _PithEngine.MAX_QUERY_NICHES)
        break;
    }
    return { action: nextAction, niches };
  }
  computeFlags(originalText, parts) {
    const flags = [];
    const lowerOriginal = originalText.toLowerCase();
    const hasTag = (tag) => parts.some((p) => p === tag);
    if (hasTag("[fx]") || hasTag("[gen]") || /```/.test(originalText) || /\b(código|code|script|função|function|refactor)\b/.test(lowerOriginal)) {
      flags.push("NE");
    }
    if (/\b(liste|listar|list|lista)\b/.test(lowerOriginal)) {
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
    let payload = data.payload ? data.payload.replace(/\s+/g, " ").trim() : "";
    if (payload.length > _PithEngine.MAX_PAYLOAD_CHARS) {
      payload = payload.slice(0, _PithEngine.MAX_PAYLOAD_CHARS);
    }
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
    r = r.replace(/\b(é|são|está|estão|era|eram)\b/gi, "=");
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
    const negationRegex = /^(não|nao|not|never|sem|without|nem)$/i;
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
          if (!wClean)
            return null;
          if (negationRegex.test(wClean))
            return null;
          const isSentStart = lineStarts.has(i);
          return this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart, isQuestion);
        });
        const boosted = rawScores.map((s, i) => {
          if (s === null || s === Infinity || s >= threshold)
            return s;
          const prev = rawScores[i - 1] ?? null;
          const next = rawScores[i + 1] ?? null;
          const neighborMax = Math.max(prev ?? -Infinity, next ?? -Infinity);
          if (neighborMax >= threshold + 2)
            return s + 3;
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
          if (!wClean)
            continue;
          if (negationRegex.test(wClean)) {
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
  const engine = new PithEngine({
    onOptimizeResult: (p) => {
      if (!telemetryEnabled || !telemetryApiUrl || !telemetryToken)
        return;
      if (p.noiseRemoved < 5 || p.text.trim().length < 30)
        return;
      void fetch(`${telemetryApiUrl}/v1/ml/sample`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telemetryToken}`
        },
        body: JSON.stringify({
          text: p.text,
          output: p.output,
          noiseRemoved: p.noiseRemoved,
          isQuery: p.isQuery,
          includeInputForMl: false,
          kind: p.kind
        })
      }).catch(() => {
      });
    }
  });
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
      const { output, noiseRemoved } = engine.optimize(text);
      if (copyOnly) {
        await vscode.env.clipboard.writeText(output);
        showBriefStatus(`$(check) Pith: copiado (-${noiseRemoved}%)`, statusBarItem);
      } else {
        await editor.edit((editBuilder) => editBuilder.replace(targetRange, output));
        showBriefStatus(`$(check) Pith: otimizado (-${noiseRemoved}%)`, statusBarItem);
      }
    } catch (error) {
      console.error("Pith optimize failed", error);
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
      const { output, noiseRemoved } = engine.optimize(text);
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
