import { chunkRows, computeColumns, rowHeight, TILE_GAP_PX, TILE_MIN_PX } from './gallery.util';

describe('gallery.util', () => {
  describe('computeColumns', () => {
    it('fits as many min-width tiles + gaps as the width allows', () => {
      expect(computeColumns(960)).toBe(5);
      expect(computeColumns(400)).toBe(2);
      expect(computeColumns(180)).toBe(1);
    });
    it('never returns less than 1, even at zero/negative width', () => {
      expect(computeColumns(0)).toBe(1);
      expect(computeColumns(-50)).toBe(1);
    });
  });

  describe('chunkRows', () => {
    it('splits a flat list into rows of `cols`, last row short', () => {
      expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
    it('treats cols < 1 as 1', () => {
      expect(chunkRows([1, 2], 0)).toEqual([[1], [2]]);
    });
    it('returns [] for an empty list', () => {
      expect(chunkRows([], 3)).toEqual([]);
    });
  });

  describe('rowHeight', () => {
    it('is tile height (4:3) + gap, from the real column width', () => {
      expect(rowHeight(960, 5)).toBe(149);
    });
    it('stays positive at degenerate width', () => {
      expect(rowHeight(0, 1)).toBeGreaterThan(0);
    });
  });

  it('exposes the tile constants', () => {
    expect(TILE_MIN_PX).toBe(180);
    expect(TILE_GAP_PX).toBe(12);
  });
});
