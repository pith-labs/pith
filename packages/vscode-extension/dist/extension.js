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
  // Intent tags for query symbolic mode
  static INTENT_TAGS = /* @__PURE__ */ new Map([
    ["como", "ex"],
    ["explicar", "ex"],
    ["explique", "ex"],
    ["how", "ex"],
    ["explain", "ex"],
    ["what", "ex"],
    ["analisar", "an"],
    ["analyze", "an"],
    ["mostrar", "an"],
    ["otimizar", "op"],
    ["optimize", "op"],
    ["melhorar", "op"],
    ["improve", "op"],
    ["ideia", "id"],
    ["idea", "id"],
    ["suggest", "id"],
    ["dicas", "id"],
    ["criar", "gen"],
    ["create", "gen"],
    ["gerar", "gen"],
    ["generate", "gen"],
    ["corrigir", "fx"],
    ["fix", "fx"],
    ["bug", "fx"],
    ["erro", "fx"],
    ["resumir", "sm"],
    ["summarize", "sm"],
    ["task", "tk"],
    ["tarefa", "tk"],
    ["estudar", "st"],
    ["learn", "st"],
    ["plano", "st"]
  ]);
  // Compact abbreviations for long words (readability optimization)
  static ABBREV = /* @__PURE__ */ new Map([
    ["categories", "cats"],
    ["categorias", "cats"],
    ["products", "prods"],
    ["produtos", "prods"],
    ["configuration", "config"],
    ["configura\xE7\xE3o", "config"],
    ["configuracao", "config"],
    ["development", "dev"],
    ["desenvolvimento", "dev"],
    ["documentation", "docs"],
    ["documenta\xE7\xE3o", "docs"],
    ["documentacao", "docs"],
    ["application", "app"],
    ["aplica\xE7\xE3o", "app"],
    ["aplicacao", "app"],
    ["implementation", "impl"],
    ["implementa\xE7\xE3o", "impl"],
    ["implementacao", "impl"],
    ["management", "mgmt"],
    ["gerenciamento", "mgmt"],
    ["information", "info"],
    ["informa\xE7\xE3o", "info"],
    ["informacao", "info"],
    ["authentication", "auth"],
    ["autentica\xE7\xE3o", "auth"],
    ["autenticacao", "auth"],
    ["environment", "env"],
    ["ambiente", "env"],
    ["repository", "repo"],
    ["reposit\xF3rio", "repo"],
    ["repositorio", "repo"],
    ["permission", "perm"],
    ["permiss\xE3o", "perm"],
    ["description", "desc"],
    ["descri\xE7\xE3o", "desc"],
    ["responsible", "resp"],
    ["respons\xE1vel", "resp"],
    ["available", "avail"],
    ["dispon\xEDvel", "avail"]
  ]);
  // Scoring thresholds
  static QUERY_THRESHOLD = 5;
  static COMPRESS_THRESHOLD = 4;
  // Morphological patterns (algorithmic, not word lists)
  static ADJECTIVE_SUFFIX = /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial)$/i;
  static VERB_ENDING = /(?:[aei]r|[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?)$/i;
  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  optimize(text) {
    try {
      if (!text.trim())
        return { output: "[PITH: No meaningful data found]", noiseRemoved: 0, isQuery: false };
      const query = this.isQuery(text);
      const result = query ? this.queryPipeline(text) : this.compressPipeline(text);
      return { ...result, isQuery: query };
    } catch (error) {
      console.error("Pith Engine Error:", error);
      return { output: text, noiseRemoved: 0, isQuery: false };
    }
  }
  compressCode(code) {
    return code;
  }
  // ═══════════════════════════════════════════════════
  // MODE DETECTION
  // ═══════════════════════════════════════════════════
  isQuery(text) {
    if (text.split(/\s+/).length > 40)
      return false;
    if (text.split("\n").filter((l) => l.trim()).length > 3)
      return false;
    if (/```/.test(text))
      return false;
    if (/^\s*\d+\.\s/m.test(text))
      return false;
    if (/^\s*[-•–]\s/m.test(text))
      return false;
    return true;
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
  scoreWord(word, freq, totalWords, isFirstInLine, isSentenceStart = false) {
    if (/\d/.test(word))
      return 100;
    if (/[^a-zA-ZÀ-ÿ\s.,;:!?'"]/.test(word))
      return 100;
    const clean = word.replace(/[^a-zA-ZÀ-ÿ]/g, "");
    if (!clean)
      return 0;
    let score = 0;
    score += Math.min(clean.length, 8);
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
    if (clean.length >= 6 && _PithEngine.VERB_ENDING.test(clean.toLowerCase()))
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
    const originalWordCount = text.split(/\s+/).length;
    const { text: preserved, map: preserveMap } = this.preserveLayer(text);
    const patterned = this.patternLayer(preserved);
    const freq = this.buildFreqMap(patterned);
    const totalWords = patterned.split(/\s+/).length;
    const filtered = this.scoreFilterLines(patterned, freq, totalWords, _PithEngine.COMPRESS_THRESHOLD);
    const abbreviated = this.abbreviate(filtered);
    const final = this.restoreAndClean(abbreviated, preserveMap);
    if (!final.trim())
      return { output: text, noiseRemoved: 0 };
    const outputWordCount = final.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: final.trim(), noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // PIPELINE 2: QUERY (symbolic token extraction)
  // [tag] !action #niche @entity ?attr
  // ═══════════════════════════════════════════════════
  queryPipeline(text) {
    const originalWordCount = text.split(/\s+/).length;
    let workText = text.replace(/[?!.…]+$/g, "").trim();
    const lower = workText.toLowerCase();
    let tag = "";
    for (const [key, val] of _PithEngine.INTENT_TAGS.entries()) {
      if (lower.includes(key)) {
        tag = `[${val}]`;
        break;
      }
    }
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
      "minutes": "min"
    };
    const skipIndices = /* @__PURE__ */ new Set();
    for (let i = 0; i < words.length; i++) {
      if (skipIndices.has(i))
        continue;
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
      if (!clean)
        continue;
      if (_PithEngine.INTENT_TAGS.has(clean.toLowerCase()))
        continue;
      if (/^\d+$/.test(clean) && i + 1 < words.length) {
        const nextClean = words[i + 1].replace(/[^a-zA-ZÀ-ÿ]/g, "").toLowerCase();
        if (unitMap[nextClean]) {
          survivors.push({ word: clean + unitMap[nextClean], score: 100, origIdx: i });
          skipIndices.add(i + 1);
          continue;
        }
      }
      const isSentenceStart = sentenceStarts.has(i);
      const score = this.scoreWord(words[i], freq, totalWords, i === 0, isSentenceStart);
      if (score >= _PithEngine.QUERY_THRESHOLD) {
        survivors.push({ word: clean, score, origIdx: i });
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
    let action = "";
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
      if (_PithEngine.ADJECTIVE_SUFFIX.test(item.word.toLowerCase())) {
        attrs.push("?" + item.word.toLowerCase());
        continue;
      }
      if (/^[A-Z]/.test(item.word)) {
        entities.push("@" + item.word);
        continue;
      }
      if (!action) {
        action = "!" + item.word;
      } else {
        niches.push("#" + item.word);
      }
    }
    const parts = [];
    if (tag)
      parts.push(tag);
    if (action)
      parts.push(action);
    for (const n of niches)
      parts.push(n);
    for (const e of entities)
      parts.push(e);
    for (const a of attrs)
      parts.push(a);
    const finalOutput = parts.join(" ").trim();
    if (!finalOutput)
      return { output: text, noiseRemoved: 0 };
    const outputWordCount = finalOutput.split(/\s+/).length;
    const noise = originalWordCount > 0 ? Math.max(0, Math.floor((originalWordCount - outputWordCount) / originalWordCount * 100)) : 0;
    return { output: finalOutput, noiseRemoved: noise };
  }
  // ═══════════════════════════════════════════════════
  // SHARED LAYERS
  // ═══════════════════════════════════════════════════
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
      const collapsed = parts.map(
        (p) => p.length > 4 ? p[0].toUpperCase() + p.slice(1, 3).toLowerCase() : p
      ).join("|");
      return "[" + collapsed + "]";
    });
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
  scoreFilterLines(text, freq, totalWords, threshold) {
    const lines = text.split("\n");
    const result = [];
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
      const bulletMatch = trimmed.match(/^([-•–]\s+|\d+\.\s+)(.*)/);
      const marker = bulletMatch ? bulletMatch[1] : "";
      const content = bulletMatch ? bulletMatch[2] : trimmed;
      const words = content.split(/\s+/);
      const kept = [];
      const lineStarts = /* @__PURE__ */ new Set([0]);
      for (let i = 0; i < words.length; i++) {
        if (/[.!?]$/.test(words[i]) && i + 1 < words.length)
          lineStarts.add(i + 1);
      }
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w.includes("\0")) {
          kept.push(w);
          continue;
        }
        const isSentStart = lineStarts.has(i);
        const score = this.scoreWord(w, freq, totalWords, i === 0 && !marker, isSentStart);
        if (score >= threshold)
          kept.push(w);
      }
      const compressed = kept.join(" ").replace(/\s{2,}/g, " ").trim();
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
};

// src/extension.ts
function activate(context) {
  console.log("====================================");
  console.log("PITH EXTENSION IS ACTIVATING...");
  console.log("====================================");
  const engine = new PithEngine();
  const participant = vscode.chat.createChatParticipant("pith.assistant", async (request, chatContext, response, token) => {
    const userInput = request.prompt;
    if (!userInput.trim()) {
      response.markdown("Por favor, digite algum texto para o Pith otimizar.");
      return;
    }
    let optimizedPrompt = userInput;
    try {
      const { output, noiseRemoved } = engine.optimize(userInput);
      optimizedPrompt = output;
      response.markdown(`*\u{1F9F9} Pith otimizou seu prompt (removeu ${noiseRemoved}% de ru\xEDdo).*

---

`);
    } catch (error) {
      console.error("Pith compression failed", error);
      response.markdown("\u26A0\uFE0F Ocorreu um erro ao otimizar seu prompt com o Pith.\n\n");
    }
    try {
      const [model] = await vscode.lm.selectChatModels({ vendor: "copilot" });
      if (!model) {
        response.markdown("\u26A0\uFE0F N\xE3o foi poss\xEDvel encontrar um modelo de linguagem ativo. Certifique-se de que o Copilot ou Antigravity est\xE1 ativado no VS Code.");
        return;
      }
      const messages = [
        vscode.LanguageModelChatMessage.User(optimizedPrompt)
      ];
      const chatResponse = await model.sendRequest(messages, {}, token);
      for await (const chunk of chatResponse.text) {
        if (token.isCancellationRequested)
          break;
        response.markdown(chunk);
      }
    } catch (error) {
      console.error("Language model request failed", error);
      response.markdown(`\u26A0\uFE0F Erro ao comunicar com a IA: ${error.message || error}`);
    }
  });
  context.subscriptions.push(participant);
  const optimizeCommand = vscode.commands.registerCommand("pith.optimize", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Abra um arquivo e selecione um texto para usar o Pith.");
      return;
    }
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showWarningMessage("Por favor, selecione algum texto.");
      return;
    }
    try {
      vscode.window.showInformationMessage("Pith: Otimizando seu prompt...");
      const { output, noiseRemoved } = engine.optimize(text);
      await vscode.env.clipboard.writeText(output);
      vscode.window.showInformationMessage(
        `[PITH] Prompt copiado! (${noiseRemoved}% de ru\xEDdo removido)`
      );
      const doc = await vscode.workspace.openTextDocument({
        content: `// Pith Engine Optimizations
// Noise Removed: ${noiseRemoved}%
// Prompt copiado automaticamente para sua \xE1rea de transfer\xEAncia!

${output}`,
        language: "markdown"
      });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    } catch (error) {
      console.error("Command Pith optimize failed", error);
      vscode.window.showErrorMessage(`Erro ao otimizar com o Pith: ${error.message}`);
    }
  });
  context.subscriptions.push(optimizeCommand);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
