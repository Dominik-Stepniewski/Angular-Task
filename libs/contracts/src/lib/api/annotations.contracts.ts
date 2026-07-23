
export const ANNOTATION_VALIDATION = {
  MIN_POLYGON_VERTICES: 3,
} as const;

export interface IAnnotationResponse {
  id: string;
  assetId: string;
  groupId?: string;
  label: string;
  points: [number, number][];
  rotationRad: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAnnotationItemRequest {
  id: string;
  groupId?: string;
  label: string;
  points: [number, number][];
  rotationRad: number;
}

export interface IUpsertAnnotationRequest extends IAnnotationItemRequest {
  assetId: string;
  createdAt?: string;
}

export interface IReplaceAnnotationsRequest {
  annotations: IAnnotationItemRequest[];
}

export interface IReplaceAnnotationsResponse {
  assetId: string;
  annotations: IAnnotationResponse[];
}
