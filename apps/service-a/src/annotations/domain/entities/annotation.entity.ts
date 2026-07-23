import { Annotation } from '../interfaces/annotation.model';
import { AnnotationProps } from '../interfaces/annotation.props';
import { InvalidAnnotationError } from '../errors/invalid-annotation.error';

export class AnnotationEntity implements Annotation {
  id!: string;
  assetId!: string;
  groupId?: string;
  label!: string;
  points!: [number, number][];
  rotationRad!: number;
  createdAt!: string;
  updatedAt!: string;

  get isGrouped(): boolean {
    return this.groupId !== undefined;
  }

  get vertexCount(): number {
    return this.points.length;
  }

  rename(label: string): void {
    AnnotationEntity.assertLabel(label);
    this.label = label;
    this.touch();
  }

  reshape(points: [number, number][], rotationRad: number): void {
    AnnotationEntity.assertPolygon(points);
    AnnotationEntity.assertRotation(rotationRad);
    this.points = points;
    this.rotationRad = rotationRad;
    this.touch();
  }

  touch(): void {
    this.updatedAt = new Date().toISOString();
  }

  toDocument(): Annotation {
    return {
      id: this.id,
      assetId: this.assetId,
      ...(this.groupId !== undefined && { groupId: this.groupId }),
      label: this.label,
      points: this.points,
      rotationRad: this.rotationRad,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static create(props: AnnotationProps): AnnotationEntity {
    AnnotationEntity.assertLabel(props.label);
    AnnotationEntity.assertPolygon(props.points);
    AnnotationEntity.assertRotation(props.rotationRad);

    const now = new Date().toISOString();
    const entity = new AnnotationEntity();
    entity.id = props.id;
    entity.assetId = props.assetId;
    entity.groupId = props.groupId;
    entity.label = props.label;
    entity.points = props.points;
    entity.rotationRad = props.rotationRad;
    entity.createdAt = props.createdAt ?? now;
    entity.updatedAt = now;
    return entity;
  }

  static fromDocument(doc: Annotation): AnnotationEntity {
    const entity = new AnnotationEntity();
    Object.assign(entity, doc);
    return entity;
  }

  private static assertLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new InvalidAnnotationError('label must not be empty');
    }
  }

  private static assertPolygon(points: [number, number][]): void {
    if (!Array.isArray(points) || points.length < 3) {
      throw new InvalidAnnotationError('polygon requires at least 3 vertices');
    }
    for (const [x, y] of points) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new InvalidAnnotationError('polygon vertices must be finite numbers');
      }
    }
  }

  private static assertRotation(rotationRad: number): void {
    if (!Number.isFinite(rotationRad)) {
      throw new InvalidAnnotationError('rotationRad must be a finite number');
    }
  }
}
