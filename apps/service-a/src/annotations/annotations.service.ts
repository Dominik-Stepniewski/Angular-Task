import { Injectable, OnModuleInit } from '@nestjs/common';
import { AnnotationsRepository } from './annotations.repository';
import { AnnotationEntity } from './domain/entities/annotation.entity';
import { AnnotationProps } from './domain/interfaces/annotation.props';

@Injectable()
export class AnnotationsService implements OnModuleInit {
  constructor(private readonly repo: AnnotationsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureIndexes();
  }

  async upsert(props: AnnotationProps): Promise<AnnotationEntity> {
    const entity = AnnotationEntity.create(props);
    const saved = await this.repo.upsert(entity.toDocument());
    return AnnotationEntity.fromDocument(saved);
  }

  async replaceForAsset(
    assetId: string,
    items: Omit<AnnotationProps, 'assetId'>[],
  ): Promise<AnnotationEntity[]> {
    const entities = items.map((i) => AnnotationEntity.create({ ...i, assetId }));
    await this.repo.replaceForAsset(
      assetId,
      entities.map((e) => e.toDocument()),
    );
    return entities;
  }

  async list(assetId: string): Promise<AnnotationEntity[]> {
    const docs = await this.repo.findByAsset(assetId);
    return docs.map(AnnotationEntity.fromDocument);
  }
}
