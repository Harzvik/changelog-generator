#!/usr/bin/env node
/**
 * Generate PNG, ICO and ICNS icon assets from public/icon.svg
 * - creates PNGs at common sizes in public/icons/png/
 * - creates app.ico and app.icns in public/icons/
 *
 * Attempts to use `sharp` + `icon-gen`. If `icon-gen` isn't available or fails,
 * falls back to creating an ICO with `png-to-ico` and skips ICNS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const root = process.cwd();
  const svgPath = path.join(root, 'public', 'icon.svg');
  if (!(await exists(svgPath))) {
    console.error('public/icon.svg not found');
    process.exit(2);
  }

  // create output dirs
  const outDir = path.join(root, 'public', 'icons');
  const outPngDir = path.join(outDir, 'png');
  await fs.mkdir(outPngDir, { recursive: true });

  console.log('Generating PNG sizes with sharp...');
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.error('sharp not installed. Run `npm install` then retry.');
    process.exit(3);
  }

  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  const svgBuf = await fs.readFile(svgPath);
  for (const sz of sizes) {
    const outFile = path.join(outPngDir, `icon-${sz}.png`);
    await sharp(svgBuf).resize(sz, sz, { fit: 'contain' }).png().toFile(outFile);
    console.log('Wrote', outFile);
  }

  // Try icon-gen to produce .icns and .ico
  try {
    const iconGen = (await import('icon-gen')).default || (await import('icon-gen'));
    console.log('Running icon-gen to produce ICO/ICNS...');
    // use the 1024 PNG as source
    const src = path.join(outPngDir, 'icon-1024.png');
    await iconGen(src, outDir, { report: false, ico: { name: 'app' }, icns: { name: 'app' } });
    console.log('icon-gen completed. ICO and ICNS should be in', outDir);
  } catch (e) {
    console.warn('icon-gen failed or is not available; falling back to png-to-ico for .ico only');
    try {
      const pngToIco = (await import('png-to-ico')).default || (await import('png-to-ico'));
      // Use 16,32,48 sizes for ICO
      const buf16 = await fs.readFile(path.join(outPngDir, 'icon-16.png'));
      const buf32 = await fs.readFile(path.join(outPngDir, 'icon-32.png'));
      const buf48 = await fs.readFile(path.join(outPngDir, 'icon-48.png'));
      const icoBuf = await pngToIco([buf16, buf32, buf48]);
      await fs.writeFile(path.join(outDir, 'app.ico'), icoBuf);
      console.log('Wrote', path.join(outDir, 'app.ico'));
    } catch (err) {
      console.error('png-to-ico fallback failed. Install icon-gen or png-to-ico to generate icons.', err);
    }
  }

  // Create a simple favicon-32x32.png and favicon.ico pointer
  try {
    const src32 = path.join(outPngDir, 'icon-32.png');
    await fs.copyFile(src32, path.join(outDir, 'favicon-32x32.png'));
    console.log('Wrote favicon-32x32.png');
    // create favicon.ico using png-to-ico if available
    try {
      const pngToIco = (await import('png-to-ico')).default || (await import('png-to-ico'));
      const buf16 = await fs.readFile(path.join(outPngDir, 'icon-16.png'));
      const buf32 = await fs.readFile(path.join(outPngDir, 'icon-32.png'));
      const buf48 = await fs.readFile(path.join(outPngDir, 'icon-48.png'));
      const icoBuf = await pngToIco([buf16, buf32, buf48]);
      await fs.writeFile(path.join(outDir, 'favicon.ico'), icoBuf);
      console.log('Wrote favicon.ico');
    } catch (err) {
      console.warn('Could not write favicon.ico (png-to-ico missing). You still have PNG favicons.');
    }
  } catch (e) {
    console.warn('Could not create favicon files:', e);
  }

  console.log('Icon generation complete. Check public/icons for outputs.');
}

main().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
