import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page">
      <mat-card class="auth-card">
        <a class="auth-brand" routerLink="/"><span class="shield"><mat-icon>shield</mat-icon></span><strong>{{ i18n.t('app.name') }}</strong></a>
        <div class="auth-heading">
          <span class="eyebrow"><mat-icon>person_add</mat-icon>{{ i18n.t('auth.newWorkspace') }}</span>
          <h1>{{ i18n.t('auth.createAccount') }}</h1>
          <p>{{ i18n.t('auth.registerSubtitle') }}</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.email') }}</mat-label><input matInput formControlName="email" autocomplete="email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.password') }}</mat-label><input matInput type="password" formControlName="password" autocomplete="new-password" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.confirmPassword') }}</mat-label><input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" /></mat-form-field>
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          @if (success()) { <p class="form-success">{{ success() }}</p> }
          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || loading()">{{ loading() ? i18n.t('auth.creating') : i18n.t('auth.createAccount') }}</button>
        </form>
        <p class="auth-switch">{{ i18n.t('auth.haveAccount') }} <a routerLink="/login">{{ i18n.t('auth.login') }}</a></p>
      </mat-card>
    </section>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  async submit() {
    this.error.set('');
    this.success.set('');
    const { email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    this.loading.set(true);
    try {
      const result = await this.auth.register(email, password);
      if (result.requiresEmailConfirmation) {
        this.success.set(this.i18n.t('auth.accountCreatedConfirm'));
      }
    } catch (error: any) {
      this.error.set(error.message ?? this.i18n.t('auth.registrationFailed'));
    }
    this.loading.set(false);
  }
}
