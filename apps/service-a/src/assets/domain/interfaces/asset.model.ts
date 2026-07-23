export interface Asset {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: string;
  license: string;
  tags: string[];
  width?: number;
  height?: number;
  ingestedAt: string;
}
