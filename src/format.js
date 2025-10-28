export function toMarkdown(diff) {
  const lines = [];
  lines.push('# Mod changes');

  lines.push('\n## Added');
  if (diff.added.length === 0) {
    lines.push('- None');
  } else {
    for (const a of diff.added) {
      const ver = a.to ? ` ${a.to}` : '';
      const file = a.new?.filename ? ` (${a.new.filename})` : '';
      lines.push(`- ${a.key}${ver}${file}`);
    }
  }

  lines.push('\n## Updated');
  if (diff.updated.length === 0) {
    lines.push('- None');
  } else {
    for (const u of diff.updated) {
      const from = u.from ?? 'unknown';
      const to = u.to ?? 'unknown';
      lines.push(`- ${u.key}: ${from} -> ${to}`);
    }
  }

  lines.push('\n## Removed');
  if (diff.removed.length === 0) {
    lines.push('- None');
  } else {
    for (const r of diff.removed) {
      const ver = r.from ? ` ${r.from}` : '';
      const file = r.old?.filename ? ` (${r.old.filename})` : '';
      lines.push(`- ${r.key}${ver}${file}`);
    }
  }

  return lines.join('\n');
}

export function toText(diff) {
  const lines = [];
  lines.push('=== Added ===');
  if (diff.added.length === 0) {
    lines.push('- None');
  } else {
    for (const a of diff.added) {
      // Prefer formatted key-version if available, otherwise fallback to original filename
      const ver = (a.new && a.new.version) || a.to || null;
      const fname = ver ? `${a.key}-${ver}.jar` : (a.new?.filename ?? a.filename ?? a.key);
      lines.push(`- ${fname}`);
    }
  }

  lines.push('');
  lines.push('=== Removed ===');
  if (diff.removed.length === 0) {
    lines.push('- None');
  } else {
    for (const r of diff.removed) {
      const ver = (r.old && r.old.version) || r.from || null;
      const fname = ver ? `${r.key}-${ver}.jar` : (r.old?.filename ?? r.filename ?? r.key);
      lines.push(`- ${fname}`);
    }
  }

  lines.push('');
  lines.push('=== Updated ===');
  if (diff.updated.length === 0) {
    lines.push('- None');
  } else {
    for (const u of diff.updated) {
      const from = u.from ?? 'unknown';
      const to = u.to ?? 'unknown';
      lines.push(`- ${u.key}: ${from} → ${to}`);
    }
  }

  return lines.join('\n');
}
