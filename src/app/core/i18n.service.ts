import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

export type AppLanguage = 'en' | 'ro';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  readonly language = signal<AppLanguage>((localStorage.getItem('package-risk-language') as AppLanguage | null) ?? 'en');
  readonly translations = signal<Record<string, string>>({});
  readonly languageLabel = computed(() => this.language() === 'ro' ? 'Romana' : 'English');

  constructor() {
    this.load(this.language());
  }

  setLanguage(language: AppLanguage) {
    this.language.set(language);
    localStorage.setItem('package-risk-language', language);
    this.load(language);
  }

  t(key: string) {
    return this.translations()[key] ?? key;
  }

  private load(language: AppLanguage) {
    this.http.get<Record<string, string>>(`/i18n/${language}.json`).subscribe({
      next: (translations) => this.translations.set(translations),
      error: () => this.translations.set({}),
    });
  }
}
