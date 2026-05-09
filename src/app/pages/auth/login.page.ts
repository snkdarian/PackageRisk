import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page">
      <mat-card class="auth-card">
        <a class="auth-brand" routerLink="/"><span class="shield"><mat-icon>shield</mat-icon></span><strong>{{ i18n.t('app.name') }}</strong></a>
        <div class="auth-heading">
          <span class="eyebrow"><mat-icon>lock</mat-icon>{{ i18n.t('auth.secureWorkspace') }}</span>
          <h1>{{ i18n.t('auth.login') }}</h1>
          <p>{{ i18n.t('auth.loginSubtitle') }}</p>
        </div>
        @if (info()) { <p class="form-success">{{ info() }}</p> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.email') }}</mat-label><input matInput formControlName="email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.password') }}</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || loading()">{{ loading() ? i18n.t('auth.signingIn') : i18n.t('auth.login') }}</button>
        </form>
        <p class="auth-switch">{{ i18n.t('auth.noAccount') }} <a routerLink="/register">{{ i18n.t('auth.createAccount') }}</a></p>
      </mat-card>
    </section>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly info = signal(this.route.snapshot.queryParamMap.has('registered') ? this.i18n.t('auth.accountCreatedLogin') : '');
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  async submit() {
    this.loading.set(true);
    this.error.set('');
    const redirectTo = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    try { await this.auth.login(this.form.value.email!, this.form.value.password!, redirectTo); } catch (error: any) { this.error.set(error.message ?? this.i18n.t('auth.loginFailed')); }
    this.loading.set(false);
  }
}
