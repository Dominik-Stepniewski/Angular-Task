import { Injectable, OnModuleInit } from '@nestjs/common';
import { Annotation } from '@lumana/contracts';
import { AnnotationsRepository } from './annotations.repository';
import { AnnotationItemDto } from './dto/replace-annotations.dto';
import { UpsertAnnotationDto } from './dto/upsert-annotation.dto';

@Injectable()
export class AnnotationsService implements OnModuleInit {
  constructor(private readonly repo: AnnotationsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureIndexes();
  }

  async upsert(dto: UpsertAnnotationDto): Promise<Annotation> {
    const now = new Date().toISOString();
    const annotation: Annotation = {
      id: dto.id,
      assetId: dto.assetId,
      label: dto.label,
      points: dto.points,
      rotationRad: dto.rotationRad,
      createdAt: dto.createdAt ?? now,
      updatedAt: now,
    };
    return this.repo.upsert(annotation);
  }

  async replaceForAsset(
    assetId: string,
    items: AnnotationItemDto[],
  ): Promise<{ assetId: string; annotations: Annotation[] }> {
    const now = new Date().toISOString();
    const annotations: Annotation[] = items.map((i) => ({
      id: i.id,
      assetId,
      groupId: i.groupId,
      label: i.label,
      points: i.points,
      rotationRad: i.rotationRad,
      createdAt: now,
      updatedAt: now,
    }));
    await this.repo.replaceForAsset(assetId, annotations);
    return { assetId, annotations };
  }

  list(assetId: string): Promise<Annotation[]> {
    return this.repo.findByAsset(assetId);
  }
}
