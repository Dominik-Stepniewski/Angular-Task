import { IPaginationRequest } from '../pagination';

export interface IAssetResponse {
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

export interface ISearchAssetsRequest extends IPaginationRequest {
  q?: string;
}

export interface IUploadFailure {
  index: number;
  reason: string;
}

export interface IUploadResultResponse {
  inserted: number;
  failedCount: number;
  failed: IUploadFailure[];
}
