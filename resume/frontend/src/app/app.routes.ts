import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'analyze', pathMatch: 'full' },
  {
    path: 'analyze',
    loadComponent: () =>
      import('./features/analyze/analyze.page').then((m) => m.AnalyzePage),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'history/:id',
    loadComponent: () =>
      import('./features/history/history-detail.page').then((m) => m.HistoryDetailPage),
  },
  {
    path: 'compare/:ids',
    loadComponent: () =>
      import('./features/compare/compare.page').then((m) => m.ComparePage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  { path: '**', redirectTo: 'analyze' },
];
