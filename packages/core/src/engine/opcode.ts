type OpcodeMode = 'Q' | 'V' | 'C';

type OpcodeData = {
  stance?: string;
  tag?: string;
  action?: string;
  goal?: string;
  cstr?: string;
  proto?: string;
  niches?: string[];
  entities?: string[];
  attrs?: string[];
  payload?: string;
};

/** FNV-1a–style digest (8 hex) for ISA line integrity; same algorithm as append step. */
export function isaCrc(baseWithoutCrc: string): string {
  let hash = 2166136261;
  for (let i = 0; i < baseWithoutCrc.length; i++) {
    hash ^= baseWithoutCrc.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase();
  return hex.padStart(8, '0').slice(-8);
}

/** Flags só por forma (código, lista, densidade), sem léxico de domínio. */
export function computeFlags(originalText: string): string[] {
  const flags: string[] = [];
  const codeLike =
    /```/.test(originalText) ||
    /[;{}]{3,}/.test(originalText) ||
    /(?:[\s)\]\},;:]|\breturn)\s*=>/.test(originalText);
  if (codeLike) {
    flags.push('NE');
  }

  if (/^\s*[-*•]\s/m.test(originalText) || /^\s*\d+\.\s/m.test(originalText)) {
    flags.push('BL');
  }

  const origWords = originalText.split(/\s+/).length;
  if (origWords < 15 && flags.length === 0) {
    flags.push('DT');
  }

  return flags;
}

export function buildOpcode(mode: OpcodeMode, data: OpcodeData, flags: string[]): string {
  const EMPTY = '_';

  const stance = data.stance ? data.stance.replace(/[\[\]]/g, '') : '';
  const tag = data.tag ? data.tag.replace(/[\[\]]/g, '') : '';
  const action = data.action ? data.action.replace(/^!/, '') : '';
  const goal = data.goal && data.goal !== EMPTY ? data.goal : EMPTY;
  const cstr = data.cstr && data.cstr !== EMPTY ? data.cstr : EMPTY;
  const proto = data.proto && data.proto !== EMPTY ? data.proto : EMPTY;

  const niches = data.niches && data.niches.length
    ? data.niches.map(n => n.replace(/^#/, '')).filter(Boolean).join(',')
    : '';
  const entities = data.entities && data.entities.length
    ? data.entities.map(e => e.replace(/^@/, '')).filter(Boolean).join(',')
    : '';
  const attrs = data.attrs && data.attrs.length
    ? data.attrs
      .map(a => a.replace(/^\?/, ''))
      .map(a => a.replace(/^(\d+)[a-z]+$/i, '$1'))
      .filter(Boolean)
      .join(',')
    : '';

  const payload = data.payload ? data.payload.replace(/\s+/g, ' ').trim() : '';

  const flagsOut = flags.length ? flags.join(',') : '';

  const ordered = [
    `M=${mode}`,
    'IO=A2H',
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
    `F=${flagsOut || EMPTY}`,
  ];

  return ordered.join(' ');
}
