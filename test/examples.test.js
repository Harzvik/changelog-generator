import { describe, it, expect } from 'vitest';
import { extractVersionAndKey, parseEntries } from '../src/parse.js';
import { diffEntries } from '../src/diff.js';

describe('examples from user', () => {
  it('parses almanac variants case-insensitively and picks mod version', () => {
    const a = extractVersionAndKey('Almanac-1.21.1-2-neoforge-1.5.0.jar');
    const b = extractVersionAndKey('almanac-1.21.x-neoforge-1.0.2.jar');
    expect(a.key).toBe('almanac');
    expect(a.version).toBe('1.5.0');
    expect(b.key).toBe('almanac');
    expect(b.version).toBe('1.0.2');
  });

  it('parses clientsort beta -> release and treats qualifier as part of version', () => {
    const a = extractVersionAndKey('clientsort-beta-14.jar');
    const b = extractVersionAndKey('clientsort-2.1.2.jar');
    expect(a.key).toBe('clientsort');
    expect(a.version).toBe('beta-14');
    expect(b.key).toBe('clientsort');
    expect(b.version).toBe('2.1.2');
  });

  it('normalizes mcw-mcwpaths and mcw-paths to the same key', () => {
    const a = extractVersionAndKey('mcw-mcwpaths-1.1.1-mc1.21.1neoforge.jar');
    const b = extractVersionAndKey('mcw-paths-1.1.0neoforge-mc1.21.1.jar');
    expect(a.key).toBe(b.key);
  });

  it('does not treat MC version as mod version for badoptimizations', () => {
    const a = extractVersionAndKey('BadOptimizations-2.3.0-1.21.1.jar');
    const b = extractVersionAndKey('badoptimizations-1.21.1.jar');
    expect(a.key).toBe('badoptimizations');
    expect(a.version).toBe('2.3.0');
    expect(b.key).toBe('badoptimizations');
    // newer filename only contains MC version and should not be used as mod version
    expect(b.version).toBeNull();
  });

  it('diff treats identical-version entries as unchanged even if filenames differ', () => {
    // Two filenames that parse to same key/version but filenames differ
    const oldFiles = [
      { path: 'mods/thing-old.jar', basename: 'examplemod-1.2.3.jar' },
    ];
    const newFiles = [
      { path: 'mods/examplemod.jar', basename: 'examplemod-1.2.3-customname.jar' },
    ];
    const oldParsed = parseEntries(oldFiles);
    const newParsed = parseEntries(newFiles);
    const diff = diffEntries(oldParsed, newParsed);
    expect(diff.added.length).toBe(0);
    expect(diff.removed.length).toBe(0);
    expect(diff.updated.length).toBe(0);
  });
});
