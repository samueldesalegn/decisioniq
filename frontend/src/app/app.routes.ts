import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload/upload').then((m) => m.Upload),
  },
  {
    path: 'analyses',
    loadComponent: () => import('./pages/analyses/analyses').then((m) => m.Analyses),
  },
  {
    path: 'analysis/:id',
    loadComponent: () =>
      import('./pages/analysis-detail/analysis-detail').then((m) => m.AnalysisDetail),
  },
];
