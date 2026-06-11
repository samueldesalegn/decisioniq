import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload/upload').then((m) => m.Upload),
    canActivate: [authGuard],
  },
  {
    path: 'analyses',
    loadComponent: () => import('./pages/analyses/analyses').then((m) => m.Analyses),
    canActivate: [authGuard],
  },
  {
    path: 'analysis/:id',
    loadComponent: () =>
      import('./pages/analysis-detail/analysis-detail').then((m) => m.AnalysisDetail),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
