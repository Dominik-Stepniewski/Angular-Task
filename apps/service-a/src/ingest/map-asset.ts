import { Asset } from '@lumana/contracts';

export interface OpenverseImage {
  id: string;
  title?: string;
  url: string;
  thumbnail: string;
  source: string;
  license: string;
  license_version?: string;
  width?: number;
  height?: number;
  tags?: { name: string }[];
}

export function mapAsset(img: OpenverseImage): Asset {
  const tags = [...new Set((img.tags ?? []).map((t) => t.name).filter(Boolean))];
  return {
    id: img.id,
    title: img.title ?? '(untitled)',
    url: img.url,
    thumbnail: img.thumbnail,
    source: img.source,
    license: img.license,
    tags,
    width: img.width,
    height: img.height,
    ingestedAt: new Date().toISOString(),
  };
}
