import { describe, it, expect } from 'vitest';
import { extractVersionAndKey, coerceVersion } from '../src/parse.js';

describe('parse.extractVersionAndKey', () => {
  it('parses sodium with +mc suffix', () => {
    const { key, version } = extractVersionAndKey('sodium-0.5.3+mc1.21.1.jar');
    expect(key).toBe('sodium');
    expect(version).toBe('0.5.3');
  });

  it('parses lithium with -mc token', () => {
    const { key, version } = extractVersionAndKey('lithium-0.12.0-mc1.20.4.jar');
    expect(key).toBe('lithium');
    expect(version).toBe('0.12.0');
  });

  it('parses fabric-api with +1.21.1', () => {
    const { key, version } = extractVersionAndKey('fabric-api-0.102.0+1.21.1.jar');
    expect(key).toBe('fabric-api');
    expect(version).toBe('0.102.0');
  });

  it('parses accessories with neoforge token and beta', () => {
    const { key, version } = extractVersionAndKey('accessories-neoforge-1.1.0-beta.jar');
    expect(key).toBe('accessories');
    expect(version).toBe('1.1.0-beta');
  });

  it('coerces versions to semver-compatible', () => {
    expect(coerceVersion('0.5.3')).toBe('0.5.3');
    expect(coerceVersion('1.1.0-beta')).toBe('1.1.0-beta');
  });
});
