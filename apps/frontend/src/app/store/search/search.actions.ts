import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Asset, Paginated } from '../../api/models';

export const SearchActions = createActionGroup({
  source: 'Search',
  events: {
    Search: props<{ q: string; page: number }>(),
    'Search Success': props<{ q: string; page: number; result: Paginated<Asset> }>(),
    'Search Failure': props<{ error: string }>(),
    'Load Next Batch': emptyProps(),
    'Save Query': props<{ query: string; resultCount: number }>(),
    'Open Asset': props<{ asset: Asset }>(),
  },
});
