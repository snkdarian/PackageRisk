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
  template: `
    <h2 mat-dialog-title>{{ data.project ? i18n.t('projects.editProject') : i18n.t('projects.createProject') }}</h2>
    <mat-dialog-content class="project-dialog-content">
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ i18n.t('common.close') }}</button>
      <button mat-flat-button class="primary-action compact" [disabled]="form.invalid" (click)="save()"><mat-icon>save</mat-icon>{{ i18n.t('profile.save') }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; overflow: hidden; }
    .project-dialog-content { overflow: visible; max-height: none; }
    .dialog-form { display: grid; gap: 12px; width: min(560px, 78vw); padding-top: 6px; overflow: visible; }
    .dialog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 640px) { .dialog-form { width: 100%; } .dialog-grid { grid-template-columns: 1fr; } }
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
