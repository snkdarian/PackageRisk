import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PackageManager, Project } from '../../core/models';
import { I18nService } from '../../core/i18n.service';

export interface ProjectEditorResult {
  name: string;
  description: string;
  packageManager: PackageManager;
  scheduleType: Project['scheduleType'];
}

@Component({
  selector: 'app-project-editor-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'project-editor-dialog' },
  template: `
    <div class="dialog-shell">
      <header class="dialog-title">
        <div>
          <span class="section-kicker">{{ data.project ? i18n.t('projects.editProject') : i18n.t('projects.createProject') }}</span>
          <h2>{{ data.project ? i18n.t('projects.editProject') : i18n.t('projects.createProject') }}</h2>
        </div>
        <button mat-icon-button mat-dialog-close [attr.aria-label]="i18n.t('common.close')"><mat-icon>close</mat-icon></button>
      </header>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>{{ i18n.t('field.name') }}</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ i18n.t('field.description') }}</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
        <div class="dialog-grid">
          <mat-form-field appearance="outline">
            <mat-label>{{ i18n.t('field.packageManager') }}</mat-label>
            <mat-select formControlName="packageManager">
              <mat-option value="npm">npm</mat-option>
              <mat-option value="yarn">yarn</mat-option>
              <mat-option value="pnpm">pnpm</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ i18n.t('table.schedule') }}</mat-label>
            <mat-select formControlName="scheduleType">
              <mat-option value="manual">{{ i18n.t('schedule.manual') }}</mat-option>
              <mat-option value="weekly">{{ i18n.t('schedule.weekly') }}</mat-option>
              <mat-option value="monthly">{{ i18n.t('schedule.monthly') }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
      <footer class="dialog-actions">
        <button mat-button mat-dialog-close>{{ i18n.t('common.close') }}</button>
        <button mat-flat-button class="primary-action compact" [disabled]="form.invalid" (click)="save()"><mat-icon>save</mat-icon>{{ i18n.t('profile.save') }}</button>
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; width: min(620px, calc(100vw - 32px)); max-width: 100%; }
    .dialog-shell { display: grid; gap: 20px; padding: 24px; overflow: hidden; }
    .dialog-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .dialog-title h2 { margin: 0; font-size: 1.35rem; }
    .dialog-form { display: grid; gap: 18px; width: 100%; min-width: 0; overflow: hidden; padding-top: 2px; }
    .dialog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 640px) {
      .dialog-shell { max-height: calc(100vh - 32px); overflow: auto; padding: 18px; }
      .dialog-grid { grid-template-columns: 1fr; }
      .dialog-actions { flex-direction: column-reverse; align-items: stretch; }
    }
  `,
})
export class ProjectEditorDialogComponent {
  readonly data = inject<{ project?: Project }>(MAT_DIALOG_DATA);
  readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ProjectEditorDialogComponent, ProjectEditorResult>);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.project?.name ?? '', Validators.required],
    description: [this.data.project?.description ?? ''],
    packageManager: [this.data.project?.packageManager ?? 'npm' as PackageManager],
    scheduleType: [this.data.project?.scheduleType ?? 'manual' as Project['scheduleType']],
  });

  save() {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue());
  }
}
