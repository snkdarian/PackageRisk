import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPage) },
  { path: 'login', loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage) },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'projects', loadComponent: () => import('./pages/projects/projects.page').then((m) => m.ProjectsPage) },
      { path: 'scan/new', loadComponent: () => import('./pages/new-scan/new-scan.page').then((m) => m.NewScanPage) },
      { path: 'scans/history', loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage) },
      { path: 'reports/:scanId', loadComponent: () => import('./pages/report/report.page').then((m) => m.ReportPage) },
      { path: 'reports/compare/:previousScanId/:currentScanId', loadComponent: () => import('./pages/compare/compare.page').then((m) => m.ComparePage) },
      { path: 'settings', redirectTo: 'profile' },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
