import { PolygonActions } from './polygon.actions';

describe('PolygonActions.saveShapes', () => {
  it('defines saveShapes with assetId + polygons', () => {
    const a = PolygonActions.saveShapes({ assetId: 'ov-1', polygons: [] });
    expect(a.type).toContain('Save Shapes');
    expect(a.assetId).toBe('ov-1');
  });

  it('defines saveShapesSuccess carrying the persisted polygons', () => {
    const a = PolygonActions.saveShapesSuccess({ resultKey: 'ov-1', polygons: [] });
    expect(a.type).toContain('Save Shapes Success');
    expect(a.resultKey).toBe('ov-1');
  });
});
