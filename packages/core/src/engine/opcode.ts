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

export type OpcodeRenderOptions = {
  ultraCompact?: boolean;
};

export type DecodedCompactOpcode = {
  full: string;
  isValidCrc: boolean;
};

function normalizeMachineToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

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

function compactValue(value: string, key: string): string {
  if (value === '_') return value;
  if (key !== 'A') return value;
  return value
    .split(',')
    .map(part => (/^\d+$/.test(part) ? `~${Number(part).toString(36)}` : part))
    .join(',');
}

function expandValue(value: string, key: string): string {
  if (value === '_') return value;
  if (key !== 'A') return value;
  return value
    .split(',')
    .map(part => (/^~[0-9a-z]+$/i.test(part) ? String(parseInt(part.slice(1), 36)) : part))
    .join(',');
}

function compactOpcode(baseWithCrc: string): string {
  const keyMap: Record<string, string> = {
    M: 'm',
    IO: 'i',
    TAG: 't',
    S: 's',
    ACT: 'a',
    GOAL: 'g',
    CSTR: 'c',
    PROTO: 'r',
    N: 'n',
    E: 'e',
    A: 'x',
    P: 'p',
    F: 'f',
    CRC: 'k',
  };
  return baseWithCrc
    .split(' ')
    .map(part => {
      const idx = part.indexOf('=');
      if (idx <= 0) return part;
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1);
      const outKey = keyMap[key] ?? key.toLowerCase();
      return `${outKey}:${compactValue(value, key)}`;
    })
    .join('|');
}

export function decodeCompactOpcode(compact: string): DecodedCompactOpcode {
  const reverseKeyMap: Record<string, string> = {
    m: 'M',
    i: 'IO',
    t: 'TAG',
    s: 'S',
    a: 'ACT',
    g: 'GOAL',
    c: 'CSTR',
    r: 'PROTO',
    n: 'N',
    e: 'E',
    x: 'A',
    p: 'P',
    f: 'F',
    k: 'CRC',
  };
  const orderedKeys = ['M', 'IO', 'TAG', 'S', 'ACT', 'GOAL', 'CSTR', 'PROTO', 'N', 'E', 'A', 'P', 'F', 'CRC'];
  const values = new Map<string, string>();

  for (const part of compact.split('|')) {
    const idx = part.indexOf(':');
    if (idx <= 0) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    const key = reverseKeyMap[k];
    if (!key) continue;
    values.set(key, expandValue(v, key));
  }

  const out: string[] = [];
  for (const key of orderedKeys) {
    const val = values.get(key) ?? '_';
    if (key === 'CRC') out.push(`CRC=${val}`);
    else out.push(`${key}=${val}`);
  }
  const full = out.join(' ');
  const crcMatch = full.match(/\sCRC=([A-F0-9]{8})$/);
  const base = full.replace(/\sCRC=[A-F0-9]{8}$/, '');
  const expected = crcMatch ? crcMatch[1] : '';
  const isValidCrc = expected ? isaCrc(base) === expected : false;

  return { full, isValidCrc };
}

export function buildOpcode(mode: OpcodeMode, data: OpcodeData, flags: string[], options: OpcodeRenderOptions = {}): string {
  const EMPTY = '_';

  const stance = data.stance ? data.stance.replace(/[\[\]]/g, '').replace(/[^~?]/g, '') : '';
  const tag = data.tag ? normalizeMachineToken(data.tag.replace(/[\[\]]/g, '')) : '';
  const action = data.action ? normalizeMachineToken(data.action.replace(/^!/, '')) : '';
  const goal = data.goal && data.goal !== EMPTY ? data.goal : EMPTY;
  const cstr = data.cstr && data.cstr !== EMPTY ? data.cstr : EMPTY;
  const proto = data.proto && data.proto !== EMPTY ? data.proto : EMPTY;

  const niches = data.niches && data.niches.length
    ? data.niches
      .map(n => normalizeMachineToken(n.replace(/^#/, '')))
      .filter(Boolean)
      .join(',')
    : '';
  const entities = data.entities && data.entities.length
    ? data.entities
      .map(e => normalizeMachineToken(e.replace(/^@/, '')))
      .filter(Boolean)
      .join(',')
    : '';
  const attrs = data.attrs && data.attrs.length
    ? data.attrs
      .map(a => normalizeMachineToken(a.replace(/^\?/, '')))
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

  const base = ordered.join(' ');
  const crc = isaCrc(base);
  const full = `${base} CRC=${crc}`;
  if (!options.ultraCompact) return full;
  return compactOpcode(full);
}
