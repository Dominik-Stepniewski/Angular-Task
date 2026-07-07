import { parseCorsOrigin } from './cors';

describe('parseCorsOrigin', () => {
  it('returns true (any origin) when unset', () => {
    expect(parseCorsOrigin(undefined)).toBe(true);
  });

  it('returns true for empty / whitespace-only', () => {
    expect(parseCorsOrigin('')).toBe(true);
    expect(parseCorsOrigin('   ')).toBe(true);
  });

  it('returns true for the wildcard', () => {
    expect(parseCorsOrigin('*')).toBe(true);
    expect(parseCorsOrigin(' * ')).toBe(true);
  });

  it('returns true when a wildcard appears anywhere in a list', () => {
    expect(parseCorsOrigin('https://a.com,*')).toBe(true);
  });

  it('parses a single origin', () => {
    expect(parseCorsOrigin('https://app.example.com')).toEqual([
      'https://app.example.com',
    ]);
  });

  it('trims whitespace around comma-separated origins', () => {
    expect(parseCorsOrigin('https://a.com, https://b.com ,https://c.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('drops blank entries and falls back to true when all blank', () => {
    expect(parseCorsOrigin('https://a.com,,')).toEqual(['https://a.com']);
    expect(parseCorsOrigin(', ,')).toBe(true);
  });
});
