import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type AppTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<AppTheme>((localStorage.getItem('package-risk-theme') as AppTheme | null) ?? 'dark');
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.apply(this.theme());
  }

  toggle() {
    const next = this.isDark() ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem('package-risk-theme', next);
    this.apply(next);
  }

  private apply(theme: AppTheme) {
    this.document.body.classList.toggle('light-theme', theme === 'light');
    this.document.body.classList.toggle('dark-theme', theme === 'dark');
  }
}
