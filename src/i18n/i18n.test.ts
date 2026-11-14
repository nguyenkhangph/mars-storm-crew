import { describe, expect, it } from 'vitest';
import en from './en.json';
import vi from './vi.json';
import { plain } from './plain';

const keys = (o: unknown, p = ''): string[] =>
  o && typeof o === 'object' && !Array.isArray(o)
    ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}.${k}`))
    : [p];

describe('strings', () => {
  it('English and Vietnamese have the same keys', () => {
    expect(keys(vi).sort()).toEqual(keys(en).sort());
  });
  it('character lines stay short (≤12 words)', () => {
    for (const s of Object.values(en.sols)) for (const l of [s.a.line, s.b.line]) expect(plain(l).split(/\s+/).length).toBeLessThanOrEqual(12);
  });
});
