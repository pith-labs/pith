const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export type DevOutputOptions = {
  maxTotalLines?: number;
  headLines?: number;
  tailLines?: number;
  maxLineLength?: number;
  testAware?: boolean;
};

const DEFAULTS: Required<DevOutputOptions> = {
  maxTotalLines: 4000,
  headLines: 400,
  tailLines: 400,
  maxLineLength: 480,
  testAware: true,
};

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function clampLine(line: string, maxLen: number): string {
  if (line.length <= maxLen) return line;
  const keep = maxLen - 20;
  return `${line.slice(0, keep)} … [+${line.length - keep} chars]`;
}

function collapseDuplicateRuns(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const out: string[] = [];
  let prev = lines[0];
  let count = 1;
  for (let i = 1; i <= lines.length; i++) {
    const cur = lines[i];
    if (cur === prev && i < lines.length) {
      count++;
      continue;
    }
    out.push(count > 1 ? `${prev} (×${count})` : prev);
    if (i < lines.length) {
      prev = cur!;
      count = 1;
    }
  }
  return out;
}

function looksLikeTestOutput(text: string): boolean {
  const head = text.slice(0, 12000);
  return (
    /running\s+\d+\s+tests?\b/i.test(head) ||
    /\btest\s+result:\s/i.test(head) ||
    /^\s*FAIL\s+/m.test(head) ||
    /\bfailures?:\s*$/m.test(head) ||
    /\b\d+\s+passed\b.*\b\d+\s+failed\b/i.test(head) ||
    (/^\s*●\s/m.test(head) && /\btests?\b/i.test(head)) ||
    (/test\s+.*\s+\.\.\.\s+(ok|FAILED)\b/i.test(head) && /\b\d+\s*;\s*\d+\s+failed/i.test(head))
  );
}

function shrinkTestLines(lines: string[]): string[] {
  const n = lines.length;
  const important = (i: number) => {
    const line = lines[i];
    return (
      /FAIL|failed|error\[E|ERROR|Error:|AssertionError|panicked at|test\s+result|failures?:|^\s*●\s|^\s*✕\s|expected|Received|Diff|assert_eq!|panic|thread\s+'/i.test(
        line
      ) ||
      /^\s+at\s/.test(line) ||
      /^running\s+\d+/i.test(line) ||
      /^\s*#\d+\s+/.test(line) ||
      /-->\s/.test(line)
    );
  };
  const kept = new Set<number>();
  const head = Math.min(24, n);
  const tail = Math.min(20, n);
  for (let i = 0; i < head; i++) kept.add(i);
  for (let i = n - tail; i < n; i++) if (i >= 0) kept.add(i);
  for (let i = 0; i < n; i++) if (important(i)) kept.add(i);
  const sorted = [...kept].sort((a, b) => a - b);
  let out = sorted.map((i) => lines[i]);
  const max = 450;
  if (out.length > max) {
    const drop = out.length - max + 1;
    out = [...out.slice(0, max - 1), `... [+${drop} linhas omitidas]`];
  }
  return out;
}

function truncateMiddle(lines: string[], head: number, tail: number): string[] {
  if (lines.length <= head + tail + 8) return lines;
  const omitted = lines.length - head - tail;
  return [...lines.slice(0, head), `… [${omitted} linhas omitidas] …`, ...lines.slice(-tail)];
}

export function devOutputPipeline(text: string, options: DevOutputOptions = {}): { output: string; noiseRemoved: number } {
  const o = { ...DEFAULTS, ...options };
  const raw = text.length;
  let s = stripAnsi(text);
  if (!s.trim()) return { output: '', noiseRemoved: 0 };
  let lines = s.split('\n');
  if (o.testAware && looksLikeTestOutput(s)) {
    lines = shrinkTestLines(lines);
  }
  lines = lines.map((l) => clampLine(l, o.maxLineLength));
  lines = collapseDuplicateRuns(lines);
  if (lines.length > o.maxTotalLines) {
    lines = truncateMiddle(lines, o.headLines, o.tailLines);
  }
  const out = lines.join('\n').trimEnd();
  const noiseRemoved = raw > 0 ? Math.max(0, Math.floor(((raw - out.length) / raw) * 100)) : 0;
  return { output: out, noiseRemoved };
}
