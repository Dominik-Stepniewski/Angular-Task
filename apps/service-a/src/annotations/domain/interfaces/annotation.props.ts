export interface AnnotationProps {
  id: string;
  assetId: string;
  groupId?: string;
  label: string;
  points: [number, number][];
  rotationRad: number;
  createdAt?: string;
}
