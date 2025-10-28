// Minimal, dependency-free parser for mod filenames.
// Goals: extract a stable key (mod id) and the mod version while ignoring MC/loader markers.

const LOADER_TAGS = ['fabric', 'forge', 'neoforge', 'quilt', 'fabric-api'];

function normalizeKey(s) {
  return s
    .replace(/\.jar$/i, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

// Version pattern: numeric parts with optional immediate alphanumeric suffix (no dashes),
// e.g. '1.2.3', '1.2.11a', '1.21.x', '1.0.0beta'
const VERSION_RE = /v?(\d+(?:\.\d+){0,4}(?:[A-Za-z0-9_.]*)?)/i;

function findVersionCandidates(str) {
  const re = new RegExp(VERSION_RE.source, 'gi');
  const matches = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    // ignore matches embedded inside alphanumeric words unless they are loader-suffixed
    const start = m.index;
    const end = m.index + m[0].length;
    const before = start > 0 ? str[start - 1] : null;
    const after = end < str.length ? str[end] : null;
    // If char before is alnum, it's embedded in a word (e.g., appliedenergistics2) -> skip
    if (before && /[A-Za-z0-9]/.test(before)) {
      continue;
    }
    // If char after is letter/digit, allow only when it begins with a known loader tag (e.g., '1.1.0neoforge')
    if (after && /[A-Za-z]/.test(after)) {
      // check if the substring starting at end begins with a loader tag
      const tail = str.slice(end).toLowerCase();
      const hasLoader = LOADER_TAGS.some((lt) => tail.startsWith(lt));
      if (!hasLoader) continue;
    }
    matches.push({ ver: m[1], idx: m.index, endIdx: end });
  }
  return matches;
}

function isMCToken(token) {
  const t = token.toLowerCase();
  if (t === 'mc' || t === 'minecraft') return true;
  if (/^mc\d+/i.test(t)) return true;
  return false;
}

function isLoaderToken(token) {
  return LOADER_TAGS.includes(token.toLowerCase());
}

export function extractVersionAndKey(filename) {
  const base = filename.replace(/\.jar$/i, '');
  const candidates = findVersionCandidates(base);

  // If nothing found, fallback: whole name as key
  if (candidates.length === 0) {
    return { key: normalizeKey(base), version: null, base };
  }

  // Prefer a candidate before a '+' if present (mod+mc pattern)
  const plus = base.indexOf('+');
  let chosen = null;
  if (plus !== -1) {
    // pick last candidate before plus
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].idx < plus) {
        chosen = candidates[i];
        break;
      }
    }
  }
  // Find loader and mc token positions (if present)
  const loaderRegex = new RegExp('(?:' + LOADER_TAGS.join('|') + ')', 'i');
  const loaderMatch = base.match(loaderRegex);
  const loaderIdx = loaderMatch ? loaderMatch.index : -1;
  const mcMatch = base.match(/(?:^|[-_.+])(mc\d+(?:\.\d+)*|mc|minecraft)/i);
  const mcIdx = mcMatch ? mcMatch.index : -1;

  // If there's an mc token like '-mc1.20.4' prefer the candidate before the mc token
  if (!chosen) {
    if (mcIdx !== -1) {
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (candidates[i].idx < mcIdx) {
          chosen = candidates[i];
          break;
        }
      }
    }
  }

  // Helper: detect if a candidate is likely a Minecraft version (e.g., 1.20.4)
  function isLikelyMCVersion(ver) {
    if (!ver) return false;
    const m = ver.match(/^(?:v)?(\d+)(?:\.(\d+))?/);
    if (!m) return false;
    const major = Number(m[1]);
    const minor = Number(m[2] || 0);
    // Common MC versions start with 1.12 - 1.99 or 1.20.x, etc.
    if (major === 1 && minor >= 12) return true;
    // Some MC-like tokens use 1.7, 1.8... we'll treat 1.x with x>=12 as MC; others we'll not assume
    return false;
  }

  // Helper: candidate is part of loader suffix without separator e.g. '1.1.0neoforge'
  function candidateHasLoaderSuffix(candidate) {
    if (loaderIdx === -1) return false;
    return candidate.endIdx <= loaderIdx || base.slice(candidate.endIdx, candidate.endIdx + 15).toLowerCase().startsWith(base.slice(loaderIdx, loaderIdx + 15).toLowerCase());
  }

  // Prefer the left-most candidate that is not a loader-suffixed token and not likely an MC version.
  if (!chosen) {
    // Prefer non-MC candidates. Among them pick the one with the most numeric segments
    // (e.g., 2.4.0 > 1.21) and tie-break by leftmost occurrence.
    const nonMC = candidates.filter((c) => !isLikelyMCVersion(c.ver));
    if (nonMC.length > 0) {
      nonMC.sort((a, b) => {
        const aSegments = (a.ver || '').split('.').length;
        const bSegments = (b.ver || '').split('.').length;
        if (aSegments !== bSegments) return bSegments - aSegments; // more segments first
        return a.idx - b.idx; // leftmost tie-breaker
      });
      chosen = nonMC[0];
    }
  }

  // Fallback: choose the last candidate
  if (!chosen) chosen = candidates[candidates.length - 1];

  const version = chosen.ver;
  // If token immediately after chosen version is a known qualifier (e.g. '-beta'), include it
  const afterStr = base.slice(chosen.endIdx);
  if (afterStr) {
    const mqual = afterStr.match(/^[\-_.+]?([A-Za-z]+(?:\-?\d*)?)/);
    if (mqual) {
      const q = mqual[1];
      const QUALIFIERS = ['alpha', 'beta', 'rc', 'pre', 'snapshot', 'dev', 'build'];
      if (QUALIFIERS.includes(q.toLowerCase())) {
        var adjustedVersion = (typeof adjustedVersion !== 'undefined' ? adjustedVersion : version) + '-' + q;
      }
    }
  }
  const prefix = base.slice(0, chosen.idx);
  // If the chosen candidate is likely an MC version and it's the only candidate,
  // treat it as not the mod version (e.g., filenames like 'mod-1.21.1.jar').
  if (isLikelyMCVersion(version) && candidates.length === 1) {
    // no mod-version found — strip the MC token from the end and use prefix as key
    const prefixOnly = base.slice(0, chosen.idx).replace(/[-_.+]+$/g, '');
    const key = normalizeKey(prefixOnly || base);
    return { key, version: null, base };
  }
  // If the token immediately before the chosen version is a qualifier (alpha/beta/rc),
  // incorporate it into the version (e.g. clientsort-beta-14 -> version 'beta-14').
  const QUALIFIERS = ['alpha', 'beta', 'rc', 'pre', 'snapshot', 'dev', 'build'];
  const beforeStr = base.slice(0, chosen.idx);
  // Find the last token before the version candidate
  const beforeParts = beforeStr.split(/[-_.+]+/).filter(Boolean);
  const tokenBefore = beforeParts.length ? beforeParts[beforeParts.length - 1] : null;
  if (tokenBefore && QUALIFIERS.includes(tokenBefore.toLowerCase())) {
    const combined = tokenBefore + '-' + version;
    const newPrefix = beforeParts.slice(0, -1).join('-');
    var adjustedVersion = combined;
    var adjustedPrefix = newPrefix;
  }
  // tokenize prefix and filter noise tokens
  const effectivePrefix = typeof adjustedPrefix !== 'undefined' ? adjustedPrefix : prefix;
  const tokens = effectivePrefix.split(/[-_.+]+/).filter(Boolean);
  // Normalize tokens: handle duplicated prefixes like 'mcw-mcwpaths' -> ['mcw','paths']
  if (tokens.length >= 2) {
    const t0 = tokens[0].toLowerCase();
    const t1 = tokens[1];
    if (t1.toLowerCase().startsWith(t0) && t1.length > t0.length) {
      // split t1 into prefix + remainder
      const remainder = t1.slice(t0.length);
      // Replace tokens[1] with remainder, drop tokens[0] if it duplicates
      tokens[1] = remainder;
      // keep tokens[0] (the shared prefix) so we end up with ['mcw','paths'] from ['mcw','mcwpaths']
    }
  }
  const filtered = [];
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    // If token looks like a version token (e.g., 1.21.x or 1.2.3) skip it from key
  if (new RegExp('^' + VERSION_RE.source + '$', 'i').test(t)) continue;
  if (/^\d+(?:\.\d+)*x?$/i.test(t)) continue; // e.g. '1.21.x'
  if (t.toLowerCase() === 'x') continue; // skip standalone x version placeholders
    // If token contains a numeric prefix followed by letters (e.g. '1.1.0neoforge'),
    // split and prefer the non-numeric suffix for token; if suffix is a loader tag, drop it.
    const mNumSuffix = t.match(/^(\d+(?:\.\d+)*)([a-z].*)$/i);
    if (mNumSuffix) {
      const suffix = mNumSuffix[2];
      if (suffix) {
        // if suffix contains a known loader tag, skip this token entirely
        const low = suffix.toLowerCase();
        if (LOADER_TAGS.some((lt) => low.includes(lt))) continue;
        t = suffix;
      }
    }
    if (isMCToken(t)) continue;
    // numeric tokens are likely mc or noise
    if (/^\d+$/.test(t)) continue;
    // loader tokens: if first token and looks like 'fabric-api' we keep; else drop
    if (isLoaderToken(t) && i !== 0) continue;
    filtered.push(t);
  }
  const keyRaw = filtered.join('-') || base.replace(new RegExp((adjustedVersion || version) + '$'), '');
  const key = normalizeKey(keyRaw || base);
  return { key, version: adjustedVersion || version, base };
}

function splitParts(v) {
  if (!v) return [];
  // Capture numeric prefix and any trailing suffix (including letters, prerelease markers)
  const m = v.match(/^(\d+(?:\.\d+)*)(.*)$/);
  if (!m) return [null, String(v)];
  const nums = m[1].split('.').map((n) => Number(n));
  const rest = m[2] || '';
  return [nums, rest];
}

export function compareVersions(a, b) {
  if (a === b) return 0;
  if (!a) return b ? -1 : 0;
  if (!b) return 1;
  const pa = splitParts(a);
  const pb = splitParts(b);
  const na = pa[0];
  const nb = pb[0];
  // If one side lacks a numeric prefix, treat that side as a prerelease/qualifier and smaller
  if (!na && !nb) return String(a).localeCompare(String(b));
  if (!na) return -1;
  if (!nb) return 1;
  const len = Math.max(na.length, nb.length);
  for (let i = 0; i < len; i++) {
    const xa = na[i] || 0;
    const xb = nb[i] || 0;
    if (xa !== xb) return xa - xb;
  }
  // If numeric parts equal, compare prerelease strings (simpler: lexicographic)
  const ra = pa[1] || '';
  const rb = pb[1] || '';
  if (ra === rb) return 0;
  if (!ra) return 1; // release > prerelease
  if (!rb) return -1;
  // Compare alphanumeric suffixes (e.g., 'a' < 'b')
  return String(ra).localeCompare(String(rb));
}

// Coerce a version-like string into a semver-compatible representation.
// This is intentionally simple: it strips a leading 'v', ensures at least
// major.minor.patch numeric components, and preserves a prerelease suffix.
export function coerceVersion(v) {
  if (!v) return null;
  let s = String(v).replace(/^v/i, '');
  // split off prerelease suffix starting with '-' (e.g. 1.0.0-beta)
  const m = s.match(/^([^\-+]+)([\-+].*)?$/);
  if (!m) return s;
  let main = m[1];
  const rest = m[2] || '';
  const parts = main.split('.').map((p) => p.replace(/[^0-9]/g, '')).filter(Boolean);
  while (parts.length < 3) parts.push('0');
  return parts.slice(0, 3).join('.') + rest;
}

export function parseEntries(files) {
  return files.map((f) => {
    const p = extractVersionAndKey(f.basename);
    return { ...p, file: f.path, filename: f.basename };
  });
}

export function pickLatestPerKey(entries) {
  const map = new Map();
  for (const e of entries) {
    const k = (e.key || '').toLowerCase();
    const prev = map.get(k);
    if (!prev) {
      map.set(k, e);
      continue;
    }
    const cmp = compareVersions(prev.version, e.version);
    if (cmp < 0) map.set(k, e);
  }
  return map;
}
