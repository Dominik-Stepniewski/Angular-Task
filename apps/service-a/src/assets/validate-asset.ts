import { Asset } from '@lumana/contracts';

export type ValidateResult =
  | { ok: true; asset: Asset }
  | { ok: false; reason: string };

export function validateAsset(row: unknown): ValidateResult {
  if (!row || typeof row !== 'object') return { ok: false, reason: 'NOT_OBJECT' };
  const o = row as Record<string, unknown>;

  if (typeof o['id'] !== 'string' || o['id'].length === 0) {
    return { ok: false, reason: 'MISSING_ID' };
  }
  if (typeof o['title'] !== 'string' || o['title'].length === 0) {
    return { ok: false, reason: 'MISSING_TITLE' };
  }
  if (typeof o['url'] !== 'string' || o['url'].length === 0) {
    return { ok: false, reason: 'MISSING_URL' };
  }

  const asset: Asset = {
    id: o['id'],
    title: o['title'],
    url: o['url'],
    thumbnail: typeof o['thumbnail'] === 'string' ? o['thumbnail'] : o['url'],
    source: typeof o['source'] === 'string' ? o['source'] : 'unknown',
    license: typeof o['license'] === 'string' ? o['license'] : 'unknown',
    tags: Array.isArray(o['tags'])
      ? o['tags'].filter((t): t is string => typeof t === 'string')
      : [],
    width: typeof o['width'] === 'number' ? o['width'] : undefined,
    height: typeof o['height'] === 'number' ? o['height'] : undefined,
    ingestedAt: typeof o['ingestedAt'] === 'string' ? o['ingestedAt'] : new Date().toISOString(),
  };
  return { ok: true, asset };
}
