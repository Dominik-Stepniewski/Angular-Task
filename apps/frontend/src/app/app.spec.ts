import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { App } from './app';
import { routes } from './app.routes';
import { initialPolygonState } from './store/polygons/polygon.reducer';
import { initialSearchState } from './store/search/search.reducer';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideMockStore({
          initialState: { search: initialSearchState, polygons: initialPolygonState },
        }),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('renders the primary nav with Workbench + Ops links and a router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.topnav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Workbench', 'Ops']);
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });
});
