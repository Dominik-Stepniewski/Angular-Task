import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SearchActions } from '../../store/search/search.actions';
import { initialSearchState, queryAdapter } from '../../store/search/search.reducer';
import { initialPolygonState } from '../../store/polygons/polygon.reducer';
import { CommandBarComponent } from './command-bar.component';

describe('CommandBarComponent', () => {
  let store: MockStore;
  let dispatch: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [CommandBarComponent],
      providers: [
        provideMockStore({
          initialState: { search: initialSearchState, polygons: initialPolygonState },
        }),
      ],
    });
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  });

  afterEach(() => jest.useRealTimers());

  const make = () => TestBed.createComponent(CommandBarComponent).componentInstance;

  it('dispatches a debounced page-1 search when the user types', () => {
    const cmp = make();
    cmp.control.setValue('dune');
    jest.advanceTimersByTime(300);
    expect(dispatch).toHaveBeenCalledWith(SearchActions.search({ q: 'dune', page: 1 }));
  });

  it('dispatches a browse-all (empty q) for empty / whitespace input', () => {
    const cmp = make();
    cmp.control.setValue('   ');
    jest.advanceTimersByTime(300);
    expect(dispatch).toHaveBeenCalledWith(SearchActions.search({ q: '', page: 1 }));
  });

  it('picking a suggestion sets the input (which drives a new search)', () => {
    const cmp = make();
    cmp.pick('foundation');
    expect(cmp.control.value).toBe('foundation');
    jest.advanceTimersByTime(300);
    expect(dispatch).toHaveBeenCalledWith(SearchActions.search({ q: 'foundation', page: 1 }));
  });

  it('keyboard: ArrowDown highlights an option and Enter picks it', () => {
    const query = {
      id: 'foundation',
      query: 'foundation',
      timestamp: 1,
      resultCount: 5,
      tokens: ['foundation'],
    };
    store.setState({
      search: { ...initialSearchState, queries: queryAdapter.setAll([query], initialSearchState.queries) },
      polygons: initialPolygonState,
    });

    const cmp = make();
    cmp.control.setValue('found');
    jest.advanceTimersByTime(150);
    expect(cmp.suggestions()).toEqual(['foundation']);

    const ev = { preventDefault: jest.fn() } as unknown as Event;
    cmp.move(1, ev);
    expect(cmp.activeIndex()).toBe(0);
    expect(cmp.activeId()).toBe('suggestion-0');

    cmp.onEnter(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(cmp.control.value).toBe('foundation');
    expect(cmp.activeIndex()).toBe(-1);
  });

  it('close() clears the highlight so a refocus reopens clean', () => {
    const cmp = make();
    cmp.activeIndex.set(2);
    cmp.close();
    expect(cmp.activeIndex()).toBe(-1);
    expect(cmp.activeId()).toBeNull();
  });

  it('Enter is a no-op when the highlight is out of range', () => {
    const cmp = make();
    cmp.activeIndex.set(5);
    const ev = { preventDefault: jest.fn() } as unknown as Event;
    cmp.onEnter(ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(cmp.control.value).toBe('');
  });
});
