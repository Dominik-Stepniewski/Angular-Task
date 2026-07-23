import { Asset } from '../interfaces/asset.model';
import { searchTokens, AssetDoc } from '../../search-tokens';
import { AssetProps } from '../interfaces/asset.props';
import { OpenverseImage } from '../interfaces/openverse-image';

export class AssetEntity implements Asset {
  id!: string;
  title!: string;
  url!: string;
  thumbnail!: string;
  source!: string;
  license!: string;
  tags!: string[];
  width?: number;
  height?: number;
  ingestedAt!: string;

  get hasDimensions(): boolean {
    return this.width !== undefined && this.height !== undefined;
  }

  get aspectRatio(): number | undefined {
    return this.hasDimensions && this.height ? this.width! / this.height : undefined;
  }

  buildSearchTokens(): string[] {
    return searchTokens(this);
  }

  toDocument(): AssetDoc {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      thumbnail: this.thumbnail,
      source: this.source,
      license: this.license,
      tags: this.tags,
      ...(this.width !== undefined && { width: this.width }),
      ...(this.height !== undefined && { height: this.height }),
      ingestedAt: this.ingestedAt,
      searchTokens: this.buildSearchTokens(),
    };
  }

  static create(props: AssetProps): AssetEntity {
    const entity = new AssetEntity();
    entity.id = props.id;
    entity.title = props.title;
    entity.url = props.url;
    entity.thumbnail = props.thumbnail ?? props.url;
    entity.source = props.source ?? 'unknown';
    entity.license = props.license ?? 'unknown';
    entity.tags = [...new Set(props.tags ?? [])];
    entity.width = props.width;
    entity.height = props.height;
    entity.ingestedAt = props.ingestedAt ?? new Date().toISOString();
    return entity;
  }

  static fromOpenverse(img: OpenverseImage): AssetEntity {
    return AssetEntity.create({
      id: img.id,
      title: img.title ?? '(untitled)',
      url: img.url,
      thumbnail: img.thumbnail,
      source: img.source,
      license: img.license,
      tags: (img.tags ?? []).map((t) => t.name).filter(Boolean),
      width: img.width,
      height: img.height,
    });
  }

  static fromDocument(doc: Asset): AssetEntity {
    const entity = new AssetEntity();
    Object.assign(entity, doc);
    return entity;
  }
}
