import { Point } from '../../canvas/polygon.util';

export interface Polygon {
  id: string;
  resultKey: string;
  groupId: string;
  label: string;
  points: Point[];
  rotationRad: number;
}
