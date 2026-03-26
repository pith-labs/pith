import { COMPRESS_THRESHOLD } from './constants.js';
import { buildOpcode, computeFlags, type OpcodeRenderOptions } from './opcode.js';
import { abbreviate, humanNoiseLayer, patternLayer, preserveLayer, restoreAndClean } from './textLayers.js';
import { buildFreqMap, scoreFilterLines } from './shared.js';

export function compressPipeline(text: string, options: OpcodeRenderOptions = {}): { output: string; noiseRemoved: number } {
  const cleaned = humanNoiseLayer(text);
  const originalWordCount = cleaned.split(/\s+/).length;
  const { text: preserved, map: preserveMap } = preserveLayer(cleaned);
  const patterned = patternLayer(preserved);
  const freq = buildFreqMap(patterned);
  const totalWords = patterned.split(/\s+/).length;
  const filtered = scoreFilterLines(patterned, freq, totalWords, COMPRESS_THRESHOLD);
  const abbreviated = abbreviate(filtered);
  const final = restoreAndClean(abbreviated, preserveMap).trim();

  if (!final) return { output: text, noiseRemoved: 0 };

  const flags = computeFlags(text);
  const finalOutput = buildOpcode('C', { payload: final }, flags, options);

  const outputWordCount = final.split(/\s+/).length;
  const noise = originalWordCount > 0
    ? Math.max(0, Math.floor(((originalWordCount - outputWordCount) / originalWordCount) * 100))
    : 0;

  return { output: finalOutput, noiseRemoved: noise };
}
