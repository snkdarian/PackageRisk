import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero"><span class="section-kicker">{{ i18n.t('profile.kicker') }}</span><h1>{{ i18n.t('profile.title') }}</h1><p>{{ i18n.t('profile.subtitle') }}</p></section>
    <mat-card class="settings-card">
      <form [formGroup]="form">
        <div class="card-head"><h2>{{ i18n.t('profile.notifications') }}</h2><span>{{ i18n.t('profile.notificationsHint') }}</span></div>
        <mat-slide-toggle formControlName="emailEnabled">{{ i18n.t('profile.emailReport') }}</mat-slide-toggle>
        <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.emailAddress') }}</mat-label><input matInput formControlName="emailAddress" /></mat-form-field>
        <mat-slide-toggle formControlName="discordEnabled">{{ i18n.t('profile.discordWebhook') }}</mat-slide-toggle>
        <mat-form-field appearance="outline"><mat-label>{{ i18n.t('profile.discordWebhookUrl') }}</mat-label><input matInput formControlName="discordWebhookUrl" /></mat-form-field>
        <mat-slide-toggle formControlName="slackEnabled">{{ i18n.t('profile.slackWebhook') }}</mat-slide-toggle>
        <mat-form-field appearance="outline"><mat-label>{{ i18n.t('profile.slackWebhookUrl') }}</mat-label><input matInput formControlName="slackWebhookUrl" /></mat-form-field>
        <button mat-flat-button class="primary-action" type="button"><mat-icon>save</mat-icon>{{ i18n.t('profile.save') }}</button>
      </form>
    </mat-card>
  `,
})
export class SettingsPage {
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(I18nService);
  readonly form = this.fb.nonNullable.group({
    emailEnabled: [true],
    emailAddress: ['security@example.com'],
    discordEnabled: [false],
    discordWebhookUrl: [''],
    slackEnabled: [false],
    slackWebhookUrl: [''],
  });
}
