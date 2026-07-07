import { mapAsset, OpenverseImage } from './map-asset';

describe('mapAsset', () => {
  it('maps an Openverse image → Asset, flattening + de-duping tags', () => {
    const raw = {
      id: 'ov-1',
      title: 'Cat Fish',
      url: 'http://x/full.jpg',
      thumbnail: 'http://x/thumb/',
      source: 'flickr',
      license: 'by',
      width: 800,
      height: 600,
      tags: [{ name: 'cat' }, { name: 'cat' }, { name: 'glass' }],
    } as OpenverseImage;

    const a = mapAsset(raw);

    expect(a.id).toBe('ov-1');
    expect(a.url).toBe('http://x/full.jpg');
    expect(a.tags).toEqual(['cat', 'glass']);
    expect(a.license).toBe('by');
    expect(a.width).toBe(800);
    expect(typeof a.ingestedAt).toBe('string');
  });

  it('defaults a missing title and tolerates absent tags', () => {
    const a = mapAsset({
      id: 'ov-2',
      url: 'u',
      thumbnail: 't',
      source: 's',
      license: 'cc0',
    } as OpenverseImage);
    expect(a.title).toBe('(untitled)');
    expect(a.tags).toEqual([]);
  });
});
