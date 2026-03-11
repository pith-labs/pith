import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../store-assets');
mkdirSync(outDir, { recursive: true });

// ── 1. Screenshot 1280x800 (popup centered on dark bg) ──────────────────────
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 500, height: 600 });

// Serve the dist folder to avoid file:// CSS issues
const { createServer } = await import('http');
const { readFileSync: rf, existsSync } = await import('fs');
const { extname } = await import('path');
const distDir = join(__dirname, '../dist');
const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain' };
const server = createServer((req, res) => {
  let p = join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(p)] || 'text/plain' });
  res.end(rf(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

await page.goto(`http://127.0.0.1:${port}/`);
await new Promise(r => setTimeout(r, 1200));
server.close();

const popupBuffer = await page.screenshot({ type: 'png' });
await browser.close();

// Composite popup centered on 1280x800 dark bg
const bg = await sharp({
  create: { width: 1280, height: 800, channels: 3, background: { r: 15, g: 23, b: 42 } }
}).png().toBuffer();

const popupResized = await sharp(popupBuffer).resize(500, null).toBuffer();
const popupMeta = await sharp(popupResized).metadata();

await sharp(bg)
  .composite([{
    input: popupResized,
    left: Math.floor((1280 - popupMeta.width) / 2),
    top: Math.floor((800 - popupMeta.height) / 2),
  }])
  .jpeg({ quality: 95 })
  .toFile(join(outDir, 'screenshot-1280x800.jpg'));

console.log('screenshot-1280x800.jpg ✓');

// ── 2. Small promo tile 440x280 ───────────────────────────────────────────────
const smallPromoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">
  <rect width="440" height="280" fill="#0f172a"/>
  <rect width="440" height="280" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="30%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Icon -->
  <rect x="30" y="28" width="44" height="44" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
  <path d="M41 50 L53 38" stroke="#10b981" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M41 50 L53 62" stroke="#10b981" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M57 38 L70 50 L57 62" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="74" y="44" width="6" height="12" rx="1" fill="#10b981"/>
  <!-- Title -->
  <text x="86" y="56" font-family="monospace" font-size="22" font-weight="bold" fill="#f1f5f9" letter-spacing="3">PITH</text>
  <!-- Tagline -->
  <text x="30" y="115" font-family="sans-serif" font-size="18" font-weight="600" fill="#f1f5f9">Invisible AI Prompt Compressor</text>
  <text x="30" y="143" font-family="sans-serif" font-size="13" fill="#94a3b8">Remove noise. Save tokens. Get better answers.</text>
  <!-- Stats bar -->
  <rect x="30" y="175" width="380" height="1" fill="#1e293b"/>
  <text x="30" y="210" font-family="monospace" font-size="12" fill="#10b981">-40% tokens</text>
  <text x="170" y="210" font-family="monospace" font-size="12" fill="#10b981">Auto-compress</text>
  <text x="310" y="210" font-family="monospace" font-size="12" fill="#10b981">Works on 8 AIs</text>
  <!-- Bottom tag -->
  <text x="30" y="260" font-family="monospace" font-size="10" fill="#475569">Free · Open Source · No data collection</text>
</svg>`;

await sharp(Buffer.from(smallPromoSvg))
  .jpeg({ quality: 95 })
  .toFile(join(outDir, 'promo-440x280.jpg'));

console.log('promo-440x280.jpg ✓');

// ── 3. Marquee promo tile 1400x560 ───────────────────────────────────────────
const marqueeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560">
  <rect width="1400" height="560" fill="#0f172a"/>
  <defs>
    <radialGradient id="gm" cx="25%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gm2" cx="80%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1400" height="560" fill="url(#gm)"/>
  <rect width="1400" height="560" fill="url(#gm2)"/>

  <!-- Left: branding -->
  <rect x="80" y="160" width="64" height="64" rx="14" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
  <path d="M95 192 L115 172" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M95 192 L115 212" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M119 172 L143 192 L119 212" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="147" y="183" width="8" height="18" rx="2" fill="#10b981"/>

  <text x="80" y="290" font-family="monospace" font-size="56" font-weight="bold" fill="#f1f5f9" letter-spacing="8">PITH</text>
  <text x="80" y="340" font-family="sans-serif" font-size="20" fill="#94a3b8">Invisible AI Prompt Compressor</text>

  <!-- Divider -->
  <rect x="80" y="375" width="520" height="1" fill="#1e293b"/>

  <!-- Features -->
  <text x="80" y="415" font-family="monospace" font-size="15" fill="#10b981">▸  Remove noise before sending to AI</text>
  <text x="80" y="445" font-family="monospace" font-size="15" fill="#10b981">▸  Auto-compress on ChatGPT, Claude, Gemini &amp; more</text>
  <text x="80" y="475" font-family="monospace" font-size="15" fill="#10b981">▸  Save tokens. Get sharper, faster answers.</text>

  <!-- Right: before/after mockup -->
  <rect x="760" y="100" width="560" height="360" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Header bar -->
  <rect x="760" y="100" width="560" height="48" rx="16" fill="#0f172a"/>
  <rect x="760" y="132" width="560" height="16" fill="#0f172a"/>
  <circle cx="792" cy="124" r="6" fill="#ef4444" opacity="0.6"/>
  <circle cx="812" cy="124" r="6" fill="#f59e0b" opacity="0.6"/>
  <circle cx="832" cy="124" r="6" fill="#10b981" opacity="0.6"/>
  <text x="900" y="129" font-family="monospace" font-size="11" fill="#475569" text-anchor="middle">PITH v3</text>

  <!-- Input label -->
  <text x="784" y="177" font-family="sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">O que você quer perguntar?</text>
  <rect x="784" y="184" width="512" height="80" rx="8" fill="#1e293b"/>
  <text x="796" y="205" font-family="monospace" font-size="10" fill="#64748b">Olá, tudo bem? Queria pedir sua ajuda —</text>
  <text x="796" y="220" font-family="monospace" font-size="10" fill="#64748b">você consegue me explicar como implementar</text>
  <text x="796" y="235" font-family="monospace" font-size="10" fill="#64748b">autenticação JWT? Seria muito importante!</text>
  <text x="796" y="255" font-family="monospace" font-size="10" fill="#334155">─────────────────────────────────────────</text>

  <!-- Output label -->
  <text x="784" y="292" font-family="sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">PITH <tspan fill="#10b981" font-size="10">⚡ Destilando...</tspan></text>
  <text x="1230" y="292" font-family="monospace" font-size="10" fill="#f43f5e" text-anchor="end">-38% Ruído</text>
  <rect x="784" y="299" width="512" height="60" rx="8" fill="#020617" stroke="#064e3b" stroke-width="1"/>
  <text x="796" y="318" font-family="monospace" font-size="11" fill="#10b981">!explain ?jwt @auth</text>
  <text x="796" y="335" font-family="monospace" font-size="11" fill="#10b981">!implement :project</text>

  <!-- Copy button -->
  <rect x="784" y="378" width="512" height="62" rx="8" fill="#10b981"/>
  <text x="1040" y="415" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">Copiar e Salvar</text>
</svg>`;

await sharp(Buffer.from(marqueeSvg))
  .jpeg({ quality: 95 })
  .toFile(join(outDir, 'promo-1400x560.jpg'));

console.log('promo-1400x560.jpg ✓');
console.log('\nAssets saved to packages/chrome-extension/store-assets/');
