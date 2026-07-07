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
  template: `
    <div class="command-bar">
      <label class="visually-hidden" for="command-input">Search images</label>
      <input
        id="command-input"
        class="command-input"
        type="text"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="command-suggestions"
        [attr.aria-expanded]="showSuggestions()"
        [attr.aria-activedescendant]="activeId()"
        placeholder="Search the operations index…"
        [formControl]="control"
        (input)="onInput()"
        (focus)="dismissed.set(false)"
        (blur)="close()"
        (keydown.escape)="close()"
        (keydown.arrowDown)="move(1, $event)"
        (keydown.arrowUp)="move(-1, $event)"
        (keydown.enter)="onEnter($event)"
      />
      <span class="dot" [class.active]="loading()" aria-hidden="true"></span>
      @if (showSuggestions()) {
        <ul
          id="command-suggestions"
          class="suggestions"
          role="listbox"
          aria-label="Query suggestions"
        >
          @for (s of suggestions(); track s; let i = $index) {
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- ARIA combobox pattern: options are deliberately non-focusable; keyboard (Arrow/Enter) is handled on the input via aria-activedescendant, click is the mouse affordance only. -->
            <li
              [id]="'suggestion-' + i"
              class="chip"
              role="option"
              [class.active]="i === activeIndex()"
              [attr.aria-selected]="i === activeIndex()"
              (mousedown)="$event.preventDefault()"
              (click)="pick(s)"
            >
              {{ s }}
            </li>
          }
        </ul>
      }
    </div>
  `,
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
