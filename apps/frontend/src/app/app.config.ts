import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { baseUrlInterceptor } from './api/base-url.interceptor';
import { routes } from './app.routes';
import * as searchEffects from './store/search/search.effects';
import { hydratePolygons$, saveShapes$ } from './store/polygons/polygon.effects';
import { searchFeature } from './store/search/search.reducer';
import { polygonFeature } from './store/polygons/polygon.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([baseUrlInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideStore(),
    provideState(searchFeature),
    provideState(polygonFeature),
    provideEffects(searchEffects, { saveShapes$, hydratePolygons$ }),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
