import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="landing-nav">
      <a class="brand" routerLink="/"><span class="shield"><mat-icon>shield</mat-icon></span><strong>{{ i18n.t('app.name') }}</strong></a>
      <nav>
        <a class="nav-pill features" href="#features"><mat-icon>auto_awesome</mat-icon>{{ i18n.t('landing.features') }}</a>
        <a mat-flat-button class="nav-cta" routerLink="/login"><mat-icon>login</mat-icon>{{ i18n.t('auth.login') }}</a>
      </nav>
    </header>
    <main class="landing">
      <section class="hero">
        <div>
          <span class="eyebrow"><mat-icon>security</mat-icon> {{ i18n.t('landing.eyebrow') }}</span>
          <h1>{{ i18n.t('landing.titlePrefix') }} <span>{{ i18n.t('landing.titleHighlight') }}</span> {{ i18n.t('landing.titleSuffix') }}</h1>
          <p>{{ i18n.t('landing.subtitle') }}</p>
          <div class="actions">
            <a mat-flat-button routerLink="/login"><mat-icon>login</mat-icon>{{ i18n.t('landing.loginCta') }}</a>
          </div>
          <p class="login-hint"><mat-icon>lock</mat-icon>{{ i18n.t('landing.loginHint') }}</p>
        </div>
        <div class="hero-preview">
          <div class="preview-top"><strong>{{ i18n.t('nav.dashboard') }}</strong><span>{{ i18n.t('landing.previewRange') }}</span></div>
          <div class="preview-grid">
            <div><small>{{ i18n.t('dashboard.totalProjects') }}</small><strong>28</strong></div>
            <div><small>{{ i18n.t('dashboard.totalScans') }}</small><strong>156</strong></div>
            <div><small>{{ i18n.t('dashboard.healthScore') }}</small><strong>72</strong></div>
          </div>
          <div class="chart-line"></div>
          <div class="risk-row"><span>Lodash</span><b class="critical">{{ i18n.t('risk.critical') }}</b></div>
          <div class="risk-row"><span>Axios</span><b class="high">{{ i18n.t('risk.high') }}</b></div>
          <div class="risk-row"><span>Express</span><b class="medium">{{ i18n.t('risk.medium') }}</b></div>
        </div>
      </section>
      <section id="features" class="feature-grid">
        @for (feature of features; track feature.titleKey) {
          <article>
            <mat-icon>{{ feature.icon }}</mat-icon>
            <h3>{{ i18n.t(feature.titleKey) }}</h3>
            <p>{{ i18n.t(feature.textKey) }}</p>
          </article>
        }
      </section>
      <section class="metrics"><strong>2.6M+</strong><span>{{ i18n.t('landing.packagesAnalyzed') }}</span><strong>185K+</strong><span>{{ i18n.t('landing.scansRun') }}</span><strong>12K+</strong><span>{{ i18n.t('landing.projectsSecured') }}</span></section>
    </main>
  `,
})
export class LandingPage {
  readonly i18n = inject(I18nService);
  readonly features = [
    { icon: 'update', titleKey: 'landing.feature.outdated.title', textKey: 'landing.feature.outdated.text' },
    { icon: 'gpp_bad', titleKey: 'landing.feature.vulnerability.title', textKey: 'landing.feature.vulnerability.text' },
    { icon: 'trending_up', titleKey: 'landing.feature.scoring.title', textKey: 'landing.feature.scoring.text' },
    { icon: 'psychology', titleKey: 'landing.feature.explanations.title', textKey: 'landing.feature.explanations.text' },
    { icon: 'event', titleKey: 'landing.feature.scheduled.title', textKey: 'landing.feature.scheduled.text' },
    { icon: 'groups', titleKey: 'landing.feature.reports.title', textKey: 'landing.feature.reports.text' },
  ];
}
