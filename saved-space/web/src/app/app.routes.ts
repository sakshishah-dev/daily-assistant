import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', canActivate: [loginGuard], loadComponent: () => import('./pages/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/folders').then((m) => m.Folders) },
      { path: 'folders/:id', loadComponent: () => import('./pages/folder').then((m) => m.FolderPage) },
      { path: 'items/new', loadComponent: () => import('./pages/item-new').then((m) => m.ItemNew) },
      { path: 'items/:id', loadComponent: () => import('./pages/item-detail').then((m) => m.ItemDetail) },
      { path: 'today', loadComponent: () => import('./pages/today').then((m) => m.Today) },
      { path: 'search', loadComponent: () => import('./pages/search').then((m) => m.Search) },
      { path: 'more', loadComponent: () => import('./pages/more').then((m) => m.More) },
    ],
  },
  { path: '**', redirectTo: '' },
];
