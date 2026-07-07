import { Routes } from '@angular/router';
import { OpsPanelComponent } from './pages/ops/ops-panel.component';
import { WorkbenchComponent } from './pages/workbench/workbench.component';

export const routes: Routes = [
  { path: '', component: WorkbenchComponent, title: 'Tracer' },
  { path: 'ops', component: OpsPanelComponent, title: 'Ops · Tracer' },
  { path: '**', redirectTo: '' },
];
