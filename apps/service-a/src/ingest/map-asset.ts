import { AssetEntity } from '../assets/domain/entities/asset.entity';
import { OpenverseImage } from '../assets/domain/interfaces/openverse-image';

export type { OpenverseImage };

export function mapAsset(img: OpenverseImage): AssetEntity {
  return AssetEntity.fromOpenverse(img);
}
