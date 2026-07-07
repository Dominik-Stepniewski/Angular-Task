export const TILE_MIN_PX = 180;
export const TILE_GAP_PX = 12;
export const TILE_RATIO = 3 / 4;
export const DEFAULT_WIDTH = 960;

export function computeColumns(width: number, min = TILE_MIN_PX, gap = TILE_GAP_PX): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.floor((width + gap) / (min + gap)));
}

export function chunkRows<T>(items: readonly T[], cols: number): T[][] {
  const k = Math.max(1, Math.floor(cols));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += k) rows.push(items.slice(i, i + k));
  return rows;
}

export function rowHeight(
  width: number,
  cols: number,
  gap = TILE_GAP_PX,
  ratio = TILE_RATIO,
): number {
  const w = width > 0 ? width : DEFAULT_WIDTH;
  const k = Math.max(1, Math.floor(cols));
  const tileW = (w - (k - 1) * gap) / k;
  return Math.round(tileW * ratio + gap);
}
