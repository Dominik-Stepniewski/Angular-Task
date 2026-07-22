import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs';
import { SearchActions } from '../../store/search/search.actions';
import { selectLoading, selectSuggestions } from '../../store/search/search.selectors';

const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-command-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './command-bar.component.html',
  styleUrl: './command-bar.component.scss',
})
export class CommandBarComponent {
  private readonly store = inject(Store);

  readonly control = new FormControl<string>('', { nonNullable: true });
  readonly loading = this.store.selectSignal(selectLoading);

  readonly dismissed = signal(false);

  readonly activeIndex = signal(-1);

  readonly suggestions = toSignal(
    this.control.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      switchMap((v) => this.store.select(selectSuggestions(v ?? ''))),
    ),
    { initialValue: [] as string[] },
  );

  readonly showSuggestions = computed(() => this.suggestions().length > 0 && !this.dismissed());

  readonly activeId = computed(() => {
    const i = this.activeIndex();
    return this.showSuggestions() && i >= 0 && i < this.suggestions().length
      ? `suggestion-${i}`
      : null;
  });

  constructor() {
    this.control.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_MS),
        map((v) => (v ?? '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.store.dispatch(SearchActions.search({ q, page: 1 })));
  }

  onInput(): void {
    this.dismissed.set(false);
    this.activeIndex.set(-1);
  }

  move(delta: number, ev: Event): void {
    if (!this.showSuggestions()) return;
    ev.preventDefault();
    const n = this.suggestions().length;
    const cur = this.activeIndex();
    const next = cur < 0 ? (delta > 0 ? 0 : n - 1) : (cur + delta + n) % n;
    this.activeIndex.set(next);
  }

  onEnter(ev: Event): void {
    const i = this.activeIndex();
    if (this.showSuggestions() && i >= 0 && i < this.suggestions().length) {
      ev.preventDefault();
      this.pick(this.suggestions()[i]);
    }
  }

  close(): void {
    this.dismissed.set(true);
    this.activeIndex.set(-1);
  }

  pick(suggestion: string): void {
    this.control.setValue(suggestion);
    this.close();
  }
}
