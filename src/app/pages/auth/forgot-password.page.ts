import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="auth-page"><mat-card><h1>{{ i18n.t('forgot.title') }}</h1><p>{{ i18n.t('forgot.subtitle') }}</p><a mat-flat-button routerLink="/login">{{ i18n.t('forgot.back') }}</a></mat-card></section>`,
})
export class ForgotPasswordPage {
  readonly i18n = inject(I18nService);
}
