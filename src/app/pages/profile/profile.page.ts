import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth.service';
import { AppLanguage, I18nService } from '../../core/i18n.service';
import { NotificationSettingsService } from '../../core/notification-settings.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero row">
      <div>
        <span class="section-kicker">{{ i18n.t('profile.kicker') }}</span>
        <h1>{{ i18n.t('profile.title') }}</h1>
        <p>{{ i18n.t('profile.subtitle') }}</p>
      </div>
      <div class="profile-hero-card">
        <span class="avatar large">{{ initials() }}</span>
        <div><strong>{{ auth.user()?.email || i18n.t('profile.user') }}</strong><small>{{ i18n.languageLabel() }}</small></div>
      </div>
    </section>

    <section class="profile-grid">
      <mat-card class="settings-card">
        <form [formGroup]="profileForm">
          <div class="card-head"><h2>{{ i18n.t('profile.language') }}</h2><span>{{ i18n.t('profile.translationReady') }}</span></div>
          <mat-form-field appearance="outline">
            <mat-label>{{ i18n.t('profile.language') }}</mat-label>
            <mat-select formControlName="language" (selectionChange)="i18n.setLanguage($event.value)">
              <mat-option value="en">English</mat-option>
              <mat-option value="ro">Romana</mat-option>
            </mat-select>
          </mat-form-field>
        </form>
      </mat-card>

      <mat-card class="settings-card">
        <form [formGroup]="notificationForm">
          <div class="card-head"><h2>{{ i18n.t('profile.notifications') }}</h2><span>{{ i18n.t('profile.notificationsHint') }}</span></div>
          <mat-slide-toggle formControlName="emailEnabled">{{ i18n.t('profile.emailReport') }}</mat-slide-toggle>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.emailAddress') }}</mat-label><input matInput formControlName="emailAddress" /></mat-form-field>
          <mat-slide-toggle formControlName="discordEnabled">{{ i18n.t('profile.discordWebhook') }}</mat-slide-toggle>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('profile.discordWebhookUrl') }}</mat-label><input matInput formControlName="discordWebhookUrl" /></mat-form-field>
          <mat-slide-toggle formControlName="slackEnabled">{{ i18n.t('profile.slackWebhook') }}</mat-slide-toggle>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('profile.slackWebhookUrl') }}</mat-label><input matInput formControlName="slackWebhookUrl" /></mat-form-field>
          <button mat-flat-button class="primary-action" type="button" [disabled]="notifications.saving()" (click)="saveNotifications()"><mat-icon>save</mat-icon>{{ notifications.saving() ? i18n.t('profile.saving') : i18n.t('profile.save') }}</button>
        </form>
      </mat-card>
    </section>
  `,
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly notifications = inject(NotificationSettingsService);
  readonly profileForm = this.fb.nonNullable.group({ language: [this.i18n.language() as AppLanguage] });
  readonly notificationForm = this.fb.nonNullable.group({
    emailEnabled: [false],
    emailAddress: [this.auth.user()?.email ?? ''],
    discordEnabled: [false],
    discordWebhookUrl: [''],
    slackEnabled: [false],
    slackWebhookUrl: [''],
  });

  async ngOnInit() {
    try {
      const settings = await this.notifications.load();
      this.notificationForm.patchValue({
        emailEnabled: settings.emailEnabled,
        emailAddress: settings.emailAddress || this.auth.user()?.email || '',
        discordEnabled: settings.discordEnabled,
        discordWebhookUrl: settings.discordWebhookUrl || '',
        slackEnabled: settings.slackEnabled,
        slackWebhookUrl: settings.slackWebhookUrl || '',
      });
    } catch (error: any) {
      this.snack.open(error.message ?? this.i18n.t('profile.loadFailed'), this.i18n.t('common.close'), { duration: 3200 });
    }
  }

  async saveNotifications() {
    try {
      await this.notifications.save(this.notificationForm.getRawValue());
      this.snack.open(this.i18n.t('profile.saved'), this.i18n.t('common.close'), { duration: 2400 });
    } catch (error: any) {
      this.snack.open(error.message ?? this.i18n.t('profile.saveFailed'), this.i18n.t('common.close'), { duration: 3600 });
    }
  }

  initials() {
    const email = this.auth.user()?.email ?? 'DR';
    return email.slice(0, 2).toUpperCase();
  }
}
