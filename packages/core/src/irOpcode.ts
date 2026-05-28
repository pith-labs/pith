import { buildOpcode, computeFlags, type OpcodeMode } from './engine/opcode.js';
import type { IntentIR } from './ir.js';

function pickModeFromIR(ir: IntentIR): OpcodeMode {
  if (ir.signals.hasQuestion) return 'Q';
  if (ir.signals.hasCode) return 'C';
  return 'Q';
}

export function generateOpcodeFromIR(ir: IntentIR, originalText: string, ultraCompact = true): string {
  const mode = pickModeFromIR(ir);
  const domains = ir.intent.domain.map((d) => `#${d}`);
  const entities = ir.intent.entities.map((e) => `@${e}`);
  const attrs: string[] = [];

  if (typeof ir.constraints.maxLength === 'number') attrs.push(`?max${ir.constraints.maxLength}`);
  for (const q of ir.slots.quality) attrs.push(`?${q}`);

  const payloadParts: string[] = [];
  if (ir.slots.runtime.length) payloadParts.push(`rt:${ir.slots.runtime.join(',')}`);
  if (ir.slots.transport.length) payloadParts.push(`tr:${ir.slots.transport.join(',')}`);
  if (ir.slots.storage.length) payloadParts.push(`db:${ir.slots.storage.join(',')}`);
  if (ir.constraints.mustInclude.length) payloadParts.push(`in:${ir.constraints.mustInclude.join(',')}`);
  if (ir.constraints.mustAvoid.length) payloadParts.push(`out:${ir.constraints.mustAvoid.join(',')}`);

  const flags = computeFlags(originalText);
  if (ir.constraints.preserveNegation) flags.push('NEG');

  return buildOpcode(
    mode,
    {
      action: `!${ir.intent.action}`,
      tag: ir.signals.hasQuestion ? 'ex' : 'op',
      goal: ir.constraints.outputFormat,
      cstr: ir.constraints.preserveNegation ? 'keep-negation' : '_',
      proto: ir.signals.languageHint,
      niches: domains,
      entities,
      attrs,
      payload: payloadParts.join('|') || '_',
    },
    Array.from(new Set(flags)),
    { ultraCompact }
  );
}
