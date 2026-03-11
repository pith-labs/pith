import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/icons/icon.svg'));
const outDir = join(__dirname, '../public/icons');

for (const size of [16, 48, 128]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon${size}.png`));
  console.log(`icon${size}.png ✓`);
}
