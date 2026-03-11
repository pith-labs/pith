#!/usr/bin/env node
// Patches dist/manifest.json for Firefox MV3 compatibility after crxjs build.
// crxjs strips background.scripts and browser_specific_settings — this restores them.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distManifest = resolve(__dirname, '../dist/manifest.json');

const manifest = JSON.parse(readFileSync(distManifest, 'utf8'));

// Firefox requires background.scripts alongside service_worker
if (manifest.background?.service_worker && !manifest.background.scripts) {
  manifest.background.scripts = [manifest.background.service_worker];
}

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
