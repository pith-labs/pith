#!/usr/bin/env node
// Patches dist/manifest.json for Firefox MV3 compatibility after crxjs build.
// crxjs strips background.scripts and browser_specific_settings — this restores them.

import { readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distManifest = resolve(root, 'dist/manifest.json');
const localesSrc = resolve(root, '_locales');
const localesDest = resolve(root, 'dist/_locales');

if (existsSync(localesSrc)) {
  cpSync(localesSrc, localesDest, { recursive: true });
  console.log('✓ _locales copied to dist');
}

const manifest = JSON.parse(readFileSync(distManifest, 'utf8'));

// Chrome MV3 does not allow background.scripts (MV2 only)
if (manifest.background?.scripts) delete manifest.background.scripts;

// Ensure browser_specific_settings is present and correct
manifest.browser_specific_settings = {
  gecko: {
    id: 'pith@pith.app',
    strict_min_version: '112.0',
    data_collection_permissions: {
      required: ['none'],
      optional: [],
    },
  },
};

writeFileSync(distManifest, JSON.stringify(manifest, null, 2));
console.log('✓ Firefox manifest patch applied');
