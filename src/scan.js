import fs from 'fs/promises';
import path from 'path';

async function walk(dir) {
  const res = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      res.push(...(await walk(full)));
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.jar')) {
      res.push({ path: full, basename: e.name });
    }
  }
  return res;
}

/**
 * Scan a directory recursively for .jar files using Node fs.
 * @param {string} dir
 * @returns {Promise<Array<{ path: string, basename: string }>>}
 */
export async function scanJarDir(dir) {
  const abs = path.resolve(dir);
  try {
    return await walk(abs);
  } catch (err) {
    return [];
  }
}
