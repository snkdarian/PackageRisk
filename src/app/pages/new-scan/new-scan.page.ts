import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '../../core/project.service';
import { ScanService } from '../../core/scan.service';
import { I18nService } from '../../core/i18n.service';

const SAMPLE = `{
  "name": "checkout-service",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^0.21.1",
    "lodash": "^4.17.15",
    "express": "^4.17.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.2.0"
  }
}`;

@Component({
  selector: 'app-new-scan-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero row"><div><span class="section-kicker">{{ i18n.t('nav.newScan') }}</span><h1>{{ i18n.t('scan.title') }}</h1><p>{{ i18n.t('scan.subtitle') }}</p></div></section>
    <section class="scan-layout">
      <mat-card class="scan-input">
        <form [formGroup]="form" (ngSubmit)="run()">
          <div class="form-grid">
            <mat-form-field appearance="outline"><mat-label>{{ i18n.t('table.project') }}</mat-label><mat-select formControlName="projectId">@for (project of projects.projects(); track project.id) { <mat-option [value]="project.id">{{ project.name }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.packageManager') }}</mat-label><mat-select formControlName="packageManager"><mat-option value="npm">npm</mat-option><mat-option value="yarn">yarn</mat-option><mat-option value="pnpm">pnpm</mat-option></mat-select></mat-form-field>
          </div>
          <div class="editor-head">
            <strong>{{ i18n.t('scan.pastePackage') }}</strong>
            <div class="editor-actions">
              <label class="upload-action">
                <mat-icon>upload_file</mat-icon>
                {{ i18n.t('scan.uploadPackage') }}
                <input type="file" accept=".json,application/json" (change)="uploadPackage($event)" />
              </label>
              <button mat-button type="button" (click)="loadSample()">{{ i18n.t('scan.useSample') }}</button>
            </div>
          </div>
          <mat-form-field appearance="outline" class="json-field"><mat-label>package.json</mat-label><textarea matInput rows="13" formControlName="packageJson"></textarea></mat-form-field>
          <div class="scan-preview">
            <span [class]="'status-badge ' + (packageStatus().valid ? 'completed' : 'failed')">{{ packageStatus().valid ? i18n.t('scan.validJson') : i18n.t('scan.invalidPackage') }}</span>
            <span class="metric-badge health good">{{ dependencyStats().dependencies }} {{ i18n.t('scan.prodDependencies') }}</span>
            <span class="metric-badge health warn">{{ dependencyStats().devDependencies }} {{ i18n.t('scan.devDependencies') }}</span>
            <span class="metric-badge health good">{{ dependencyStats().total }} {{ i18n.t('scan.dependenciesDetected') }}</span>
          </div>
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          @if (!projects.projects().length) { <p class="form-error">{{ i18n.t('scan.createProjectFirst') }}</p> }
          <div class="scan-submit">
            <button mat-flat-button type="submit" class="primary-action" [disabled]="loading() || form.invalid || !projects.projects().length || !packageStatus().valid"><mat-icon>play_arrow</mat-icon>{{ loading() ? i18n.t('scan.analyzing') : retryReady() ? i18n.t('scan.retry') : i18n.t('scan.analyze') }}</button>
            @if (loading()) { <mat-spinner diameter="32" /> }
          </div>
        </form>
      </mat-card>
      <aside>
        <mat-card><h2>{{ i18n.t('scan.checklist') }}</h2><ol><li>{{ i18n.t('scan.step.project') }}</li><li>{{ i18n.t('scan.step.package') }}</li><li>{{ i18n.t('scan.step.lock') }}</li><li>{{ i18n.t('scan.step.review') }}</li></ol></mat-card>
        <mat-card><h2>{{ i18n.t('scan.supportedChecks') }}</h2><p>{{ i18n.t('scan.supportedChecksText') }}</p></mat-card>
      </aside>
    </section>
  `,
})
export class NewScanPage {
  private readonly fb = inject(FormBuilder);
  readonly projects = inject(ProjectService);
  private readonly scans = inject(ScanService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  readonly i18n = inject(I18nService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly retryReady = signal(false);
  readonly form = this.fb.nonNullable.group({
    projectId: ['', Validators.required],
    packageManager: ['npm'],
    packageJson: [SAMPLE, Validators.required],
  });
  readonly packageStatus = computed(() => {
    try {
      JSON.parse(this.form.controls.packageJson.value);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  });
  readonly dependencyStats = computed(() => {
    try {
      const parsed = JSON.parse(this.form.controls.packageJson.value);
      const dependencies = Object.keys(parsed.dependencies ?? {}).length;
      const devDependencies = Object.keys(parsed.devDependencies ?? {}).length;
      return { dependencies, devDependencies, total: dependencies + devDependencies };
    } catch {
      return { dependencies: 0, devDependencies: 0, total: 0 };
    }
  });

  loadSample() {
    this.error.set('');
    this.retryReady.set(false);
    this.form.controls.packageJson.setValue(SAMPLE);
  }

  async uploadPackage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.form.controls.packageJson.setValue(await file.text());
      this.error.set('');
      this.retryReady.set(false);
    } catch {
      this.error.set(this.i18n.t('scan.fileReadFailed'));
    } finally {
      input.value = '';
    }
  }

  constructor() {
    effect(() => {
      const firstProject = this.projects.projects()[0];
      if (firstProject && !this.form.controls.projectId.value) {
        this.form.controls.projectId.setValue(firstProject.id);
      }
    });
  }

  async run() {
    this.error.set('');
    this.retryReady.set(false);
    let parsed: any;
    try {
      parsed = JSON.parse(this.form.controls.packageJson.value);
      if (!Object.keys(parsed.dependencies ?? {}).length && !Object.keys(parsed.devDependencies ?? {}).length) throw new Error(this.i18n.t('scan.noDependencies'));
    } catch (error: any) {
      this.error.set(error.message ?? this.i18n.t('scan.invalidPackage'));
      return;
    }
    this.loading.set(true);
    try {
      const scanId = await this.scans.runScan(this.form.controls.projectId.value, parsed);
      this.snack.open(this.i18n.t('scan.completed'), this.i18n.t('common.close'), { duration: 2400 });
      await this.router.navigate(['/reports', scanId]);
    } catch (error: any) {
      const message = error.message?.includes('Failed to send a request')
        ? this.i18n.t('scan.edgeUnreachable')
        : error.message ?? this.i18n.t('scan.failed');
      this.error.set(message);
      this.retryReady.set(true);
      this.snack.open(message, this.i18n.t('common.close'), { duration: 5200 });
    }
    this.loading.set(false);
  }
}
