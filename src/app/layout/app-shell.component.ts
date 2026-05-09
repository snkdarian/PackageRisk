import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { ProjectService } from '../core/project.service';
import { ScanService } from '../core/scan.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatSidenavModule, MatToolbarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened class="sidebar">
        <a class="brand" routerLink="/dashboard">
          <span class="shield"><mat-icon>shield</mat-icon></span>
          <strong>{{ i18n.t('app.name') }}</strong>
        </a>
        <nav>
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ i18n.t(item.labelKey) }}</span>
            </a>
          }
        </nav>
        <div class="secure-card">
          <mat-icon>verified_user</mat-icon>
          <strong>{{ i18n.t('shell.staySecure') }}</strong>
          <p>{{ i18n.t('shell.staySecureText') }}</p>
          <button mat-stroked-button>{{ i18n.t('shell.enableAlerts') }}</button>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          <button mat-icon-button class="mobile-menu" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="spacer"></span>
          <button mat-icon-button class="topbar-icon" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
            <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <a class="profile-chip" routerLink="/profile" routerLinkActive="active">
            <span class="avatar">{{ initials() }}</span>
            <span class="profile-copy"><strong>{{ auth.user()?.email || 'Profile' }}</strong><small>{{ i18n.languageLabel() }}</small></span>
          </a>
          <button mat-button class="logout-action" (click)="auth.logout()"><mat-icon>logout</mat-icon>{{ i18n.t('auth.logout') }}</button>
        </mat-toolbar>
        @if (mobileOpen()) {
          <div class="mobile-nav">
            @for (item of nav; track item.path) {
              <a [routerLink]="item.path" (click)="mobileOpen.set(false)">{{ i18n.t(item.labelKey) }}</a>
            }
          </div>
        }
        <main><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class AppShellComponent {
  readonly i18n = inject(I18nService);
  readonly mobileOpen = signal(false);
  readonly nav = [
    { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'dashboard' },
    { labelKey: 'nav.projects', path: '/projects', icon: 'folder' },
    { labelKey: 'nav.newScan', path: '/scan/new', icon: 'add_circle' },
    { labelKey: 'nav.history', path: '/scans/history', icon: 'history' },
  ];

  constructor(
    readonly auth: AuthService,
    readonly theme: ThemeService,
    projects: ProjectService,
    scans: ScanService,
  ) {
    void projects.loadProjects();
    void scans.loadHistory();
  }

  initials() {
    return (this.auth.user()?.email ?? 'DR').slice(0, 2).toUpperCase();
  }
}
