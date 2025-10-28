import { describe, it, expect } from 'vitest';
import { diffEntries } from '../src/diff.js';
import { parseEntries } from '../src/parse.js';

function makeFiles(names) {
  return names.map((n) => ({ path: `./${n}`, basename: n }));
}

describe('diffEntries', () => {
  it('detects added, removed, updated', () => {
    const oldFiles = makeFiles([
      'sodium-0.5.2.jar',
      'lithium-0.11.2.jar',
      'optifine-1.18.2.jar',
      'fabric-api-0.58.0.jar',
    ]);
    const newFiles = makeFiles([
      'sodium-0.5.3+mc1.21.1.jar',
      'lithium-0.11.2.jar',
      'fabric-api-0.59.1.jar',
      'indium-1.12.3.jar',
    ]);

    const oldEntries = parseEntries(oldFiles);
    const newEntries = parseEntries(newFiles);
    const diff = diffEntries(oldEntries, newEntries);

    // added: indium
    expect(diff.added.some((a) => a.key === 'indium')).toBeTruthy();
    // removed: optifine
    expect(diff.removed.some((r) => r.key === 'optifine')).toBeTruthy();
    // updated: sodium and fabric-api
    expect(diff.updated.some((u) => u.key === 'sodium')).toBeTruthy();
    expect(diff.updated.some((u) => u.key === 'fabric-api')).toBeTruthy();
  });
});
