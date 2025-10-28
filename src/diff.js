import { compareVersions, pickLatestPerKey } from './parse.js';

export function diffEntries(oldEntries, newEntries) {
  // Ensure keys are normalized consistently before building maps
  const normalizeEntries = (entries) => entries.map((e) => ({ ...e, key: (e.key || '').toString().toLowerCase().replace(/[-_.+]+$/g, '') }));
  const oldMap = pickLatestPerKey(normalizeEntries(oldEntries));
  const newMap = pickLatestPerKey(normalizeEntries(newEntries));

  /** @type {{added: any[], removed: any[], updated: any[]}} */
  const result = { added: [], removed: [], updated: [] };

  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);
  for (const key of keys) {
    const o = oldMap.get(key);
    const n = newMap.get(key);
    if (o && !n) {
      result.removed.push({ key, from: o.version ?? null, to: null, old: o, new: null });
    } else if (!o && n) {
      result.added.push({ key, from: null, to: n.version ?? null, old: null, new: n });
    } else if (o && n) {
      // Only consider an entry "updated" when the parsed versions differ.
      // If versions are equal (including both null), treat as unchanged even if filenames differ.
      const cmp = compareVersions(o.version, n.version);
      if (cmp !== 0) {
        result.updated.push({ key, from: o.version ?? null, to: n.version ?? null, old: o, new: n });
      }
    }
  }

  // Sort for stable output
  const byKey = (a, b) => a.key.localeCompare(b.key);
  result.added.sort(byKey);
  result.removed.sort(byKey);
  result.updated.sort(byKey);

  return result;
}
