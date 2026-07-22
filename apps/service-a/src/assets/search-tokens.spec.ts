import { Asset } from '@lumana/contracts';
import { escapeRegex, searchTokens, trailingToken } from './search-tokens';

const asset = (title: string, tags: string[] = []): Asset => ({
  id: 'ov-1',
  title,
  url: 'u',
  thumbnail: 't',
  source: 's',
  license: 'l',
  tags,
  ingestedAt: '2026-01-01T00:00:00.000Z',
});

describe('searchTokens', () => {
  it('lowercases and splits title + tags into words', () => {
    expect(searchTokens(asset('Golden Sunset Beach', ['Nature', 'sky']))).toEqual([
      'golden',
      'sunset',
      'beach',
      'nature',
      'sky',
    ]);
  });

  it('splits on punctuation and drops empties', () => {
    expect(searchTokens(asset('sunset-beach_02  (v2)'))).toEqual(['sunset', 'beach', '02', 'v2']);
  });

  it('dedupes words repeated across title and tags', () => {
    expect(searchTokens(asset('Sunset', ['sunset', 'SUNSET']))).toEqual(['sunset']);
  });

  it('keeps non-ascii letters intact', () => {
    expect(searchTokens(asset('Zürich Żółw'))).toEqual(['zürich', 'żółw']);
  });

  it('returns an empty list for a title with no word characters', () => {
    expect(searchTokens(asset('!!! ---'))).toEqual([]);
  });
});

describe('trailingToken', () => {
  it('returns the last word — the one still being typed', () => {
    expect(trailingToken('golden sun')).toBe('sun');
  });

  it('lowercases the token', () => {
    expect(trailingToken('Golden SUN')).toBe('sun');
  });

  it('ignores a trailing separator so a just-finished word is still the token', () => {
    expect(trailingToken('golden sunset ')).toBe('sunset');
  });

  it('returns an empty string when there is no word character', () => {
    expect(trailingToken('!!!')).toBe('');
    expect(trailingToken('')).toBe('');
  });
});

describe('escapeRegex', () => {
  it('escapes metacharacters so user input cannot alter the pattern', () => {
    expect(escapeRegex('a.*b')).toBe('a\\.\\*b');
    expect(escapeRegex('^x$')).toBe('\\^x\\$');
  });

  it('leaves plain words untouched', () => {
    expect(escapeRegex('sunset')).toBe('sunset');
  });

  it('produces a pattern that matches the literal text', () => {
    expect(new RegExp(`^${escapeRegex('a.*b')}`).test('a.*bc')).toBe(true);
    expect(new RegExp(`^${escapeRegex('a.*b')}`).test('axxxb')).toBe(false);
  });
});
