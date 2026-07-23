import { Asset } from './domain/interfaces/asset.model';

export type AssetDoc = Asset & { searchTokens: string[] };

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

export function searchTokens(asset: Asset): string[] {
  const words = [asset.title, ...asset.tags]
    .join(' ')
    .toLowerCase()
    .split(WORD_SPLIT)
    .filter((w) => w.length > 0);
  return [...new Set(words)];
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function trailingToken(q: string): string {
  const words = q
    .toLowerCase()
    .split(WORD_SPLIT)
    .filter((w) => w.length > 0);
  return words.length > 0 ? words[words.length - 1] : '';
}
