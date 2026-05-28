import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PithEngine } from '@pith/core';

const engine = new PithEngine();

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.obsidian',
  '.trash',
  'target',
]);

function help(): void {
  console.log(`pith — Pith CLI (Zero-G)

  pith brain <pasta> [-o ficheiro] [--max-file-bytes N] [--ext .md,.txt]
      Lê notas (estilo Obsidian: .md, .mdc, .txt), aplica compressão por ficheiro,
      gera um único Markdown com secções por caminho. Saída predefinida: ./pith-brain.md

  pith prompt | opt [texto]   (ou stdin)
      Otimiza texto de prompt (motor principal).

  pith dev | shrink [texto]   (ou stdin)
      Compacta saída de terminal (logs, testes).

  pith run | exec <cmd...>
      Executa comando e envia stdout+stderr compactados para stdout.

  pith --version
      Mostra versão do CLI.
`);
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function stripYamlFrontmatter(s: string): string {
  if (!s.startsWith('---\n')) return s;
  const end = s.indexOf('\n---\n', 4);
  if (end === -1) return s;
  return s.slice(end + 5);
}

async function* walkMarkdownFiles(
  root: string,
  exts: Set<string>
): AsyncGenerator<string> {
  const { readdir } = await import('node:fs/promises');
  async function* inner(dir: string): AsyncGenerator<string> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(e.name)) continue;
        if (e.name.startsWith('.')) continue;
        yield* inner(p);
      } else {
        const ext = e.name.includes('.') ? '.' + e.name.split('.').pop()!.toLowerCase() : '';
        if (exts.has(ext)) yield p;
      }
    }
  }
  yield* inner(root);
}

async function readFileHead(path: string, maxBytes: number): Promise<string> {
  const st = await stat(path);
  if (st.size <= maxBytes) return readFile(path, 'utf8');
  const chunks: string[] = [];
  let read = 0;
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  try {
    for await (const chunk of stream) {
      const s = chunk as string;
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
  return chunks.join('');
}

type BrainOpts = {
  root: string;
  outPath: string;
  maxFileBytes: number;
  exts: string[];
};

function parseBrainArgs(argv: string[]): BrainOpts {
  const rest: string[] = [];
  let outPath = join(process.cwd(), 'pith-brain.md');
  let maxFileBytes = 384 * 1024;
  let exts = ['.md', '.mdc', '.txt'];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      help();
      process.exit(0);
    }
    if (a === '-o' || a === '--out') {
      outPath = resolve(process.cwd(), argv[++i] ?? '');
      continue;
    }
    if (a === '--max-file-bytes') {
      maxFileBytes = parseInt(argv[++i] ?? '', 10);
      if (!Number.isFinite(maxFileBytes) || maxFileBytes < 1024) {
        console.error('pith brain: --max-file-bytes inválido');
        process.exit(1);
      }
      continue;
    }
    if (a === '--ext' || a === '--extensions') {
      const raw = argv[++i] ?? '';
      exts = raw.split(',').map((x) => {
        const t = x.trim().toLowerCase();
        return t.startsWith('.') ? t : `.${t}`;
      });
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`pith brain: opção desconhecida: ${a}`);
      process.exit(1);
    }
    rest.push(a);
  }
  const rootArg = rest[0] ?? '.';
  const root = resolve(process.cwd(), rootArg);
  return { root, outPath, maxFileBytes, exts };
}

async function cmdBrain(argv: string[]): Promise<void> {
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
    console.error('pith brain: o caminho tem de ser uma pasta');
    process.exit(1);
  }

  const paths: string[] = [];
  for await (const p of walkMarkdownFiles(root, extSet)) paths.push(p);
  paths.sort((a, b) => a.localeCompare(b));

  if (paths.length === 0) {
    console.error('pith brain: nenhum ficheiro encontrado (extensões: ' + exts.join(', ') + ')');
    process.exit(1);
  }

  const header = [
    '# Pith brain',
    '',
    `- **origem:** \`${root}\``,
    `- **ficheiros:** ${paths.length}`,
    `- **gerado:** ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ].join('\n');

  const sections: string[] = [header];

  for (const abs of paths) {
    const rel = relative(root, abs) || basename(abs);
    let raw = await readFileHead(abs, maxFileBytes);
    raw = stripYamlFrontmatter(raw).trim();
    if (!raw) continue;

    const truncated = (await stat(abs)).size > maxFileBytes;
    const { output } = engine.optimize(raw, { ultraCompact: true, mode: 'compress' });
    if (output.includes('No meaningful data')) continue;

    sections.push(`## ${rel.replace(/\\/g, '/')}`);
    if (truncated) sections.push('_(truncado ao limite de bytes)_\n');
    sections.push('');
    sections.push(output);
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  const body = sections.join('\n').trimEnd() + '\n';

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, body, 'utf8');
  console.error(`pith brain: escrito ${outPath} (${paths.length} ficheiros lidos)`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === '--version' || cmd === '-v') {
    try {
      const here = dirname(fileURLToPath(import.meta.url));
      const pkg = JSON.parse(await readFile(join(here, '..', 'package.json'), 'utf8')) as { version?: string };
      console.log(pkg.version ?? 'dev');
    } catch {
      console.log('dev');
    }
    return;
  }

  if (!cmd || cmd === '-h' || cmd === '--help') {
    help();
    if (!cmd) process.exit(1);
    return;
  }

  if (cmd === 'brain') {
    await cmdBrain(argv.slice(1));
    return;
  }

  if (cmd === 'dev' || cmd === 'shrink') {
    const argText = argv.slice(1).join(' ').trim();
    const text = argText || await readStdin();
    if (!text.trim()) {
      console.error('pith dev: espera texto por argumento ou stdin (ex: npm test 2>&1 | pith dev)');
      process.exit(1);
    }
    const r = engine.optimizeDevOutput(text);
    process.stdout.write(r.output.endsWith('\n') ? r.output : `${r.output}\n`);
    return;
  }

  if (cmd === 'prompt' || cmd === 'opt') {
    const argText = argv.slice(1).join(' ').trim();
    const text = argText || await readStdin();
    if (!text.trim()) {
      console.error('pith prompt: espera texto por argumento ou stdin');
      process.exit(1);
    }
    const r = engine.optimize(text);
    process.stdout.write(`${r.output}\n`);
    return;
  }

  if (cmd === 'run' || cmd === 'exec') {
    const rest = argv.slice(1);
    if (rest.length === 0) {
      console.error('pith run: falta comando');
      process.exit(1);
    }
    const subprocess = spawn(rest[0], rest.slice(1), { stdio: ['inherit', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    subprocess.stdout?.on('data', (d: Buffer) => {
      out += d.toString();
    });
    subprocess.stderr?.on('data', (d: Buffer) => {
      err += d.toString();
    });
    const code = await new Promise<number>((res) => {
      subprocess.on('close', (c) => {
        res(c ?? 0);
      });
    });
    const combined = err ? `${out}${out && !out.endsWith('\n') ? '\n' : ''}${err}` : out;
    const r = engine.optimizeDevOutput(combined);
    process.stdout.write(`${r.output}\n`);
    process.exit(code);
  }

  help();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
