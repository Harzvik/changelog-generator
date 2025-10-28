#!/usr/bin/env node
/**
 * Copy public/icons/favicon.ico (or fallback to app.ico) to public/favicon.ico
 * Used by prepack so tools that expect a top-level favicon find it.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function main() {
  const root = process.cwd();
  const iconsDir = path.join(root, 'public', 'icons');
  const dest = path.join(root, 'public', 'favicon.ico');

  const candidates = [
    path.join(iconsDir, 'favicon.ico'),
    path.join(iconsDir, 'app.ico'),
  ];

  for (const src of candidates) {
    try {
      await fs.access(src);
      await fs.copyFile(src, dest);
      console.log(`Copied ${src} -> ${dest}`);
      return;
    } catch (e) {
      // try next candidate
    }
  }

  console.warn('No favicon.ico or app.ico found in public/icons; nothing copied.');
}

main().catch((err) => {
  console.error('Failed to copy favicon:', err);
  process.exit(1);
});
