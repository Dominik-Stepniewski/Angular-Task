import { Asset } from '@lumana/contracts';

/**
 * Persistence shape: `Asset` plus the derived prefix-search field. `searchTokens`
 * is a storage concern and is never returned over the API, so it stays out of the
 * shared `Asset` contract.
 */
export type AssetDoc = Asset & { searchTokens: string[] };

/** Split on any non-alphanumeric run so "sunset-beach_02" -> sunset, beach, 02. */
const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

/**
 * Lowercased unique words from title + tags. Backs the `{ searchTokens: 1 }`
 * multikey index, which an anchored `/^q/` regex can IXSCAN — that is what makes
 * the `$or` with `$text` legal (Mongo requires every `$or` clause to be indexed).
 */
export function searchTokens(asset: Asset): string[] {
  const words = [asset.title, ...asset.tags]
    .join(' ')
    .toLowerCase()
    .split(WORD_SPLIT)
    .filter((w) => w.length > 0);
  return [...new Set(words)];
}

/** Escape regex metacharacters so user input cannot alter the pattern. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Trailing token of a query — the one the user is still typing, so it is the one
 * matched by prefix. Returns '' when the query has no word characters.
 */
export function trailingToken(q: string): string {
  const words = q
    .toLowerCase()
    .split(WORD_SPLIT)
    .filter((w) => w.length > 0);
  return words.length > 0 ? words[words.length - 1] : '';
}
