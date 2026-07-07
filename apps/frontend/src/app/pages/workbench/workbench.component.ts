import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CommandBarComponent } from '../../components/command-bar/command-bar.component';
import { ResultFeedComponent } from '../../components/result-feed/result-feed.component';
import { SearchActions } from '../../store/search/search.actions';

@Component({
  selector: 'app-workbench',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommandBarComponent, ResultFeedComponent],
  template: `
    <app-command-bar />
    <app-result-feed />
  `,
  styleUrl: './workbench.component.scss',
})
export class WorkbenchComponent implements OnInit {
  private readonly store = inject(Store);

  ngOnInit(): void {
    this.store.dispatch(SearchActions.search({ q: '', page: 1 }));
  }
}
