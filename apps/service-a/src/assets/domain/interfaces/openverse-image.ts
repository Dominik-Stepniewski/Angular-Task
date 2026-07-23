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
