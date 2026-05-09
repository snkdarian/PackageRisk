import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ProjectService } from '../../core/project.service';
import { ScanService } from '../../core/scan.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { HealthScoreComponent } from '../../shared/health-score.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-projects-page',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTableModule, HealthScoreComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero row">
      <div>
        <span class="section-kicker">{{ i18n.t('projects.kicker') }}</span>
        <h1>{{ i18n.t('nav.projects') }}</h1>
        <p>{{ i18n.t('projects.subtitle') }}</p>
      </div>
      <button mat-flat-button class="primary-action compact" (click)="showCreate.set(!showCreate())"><mat-icon>{{ showCreate() ? 'close' : 'add' }}</mat-icon>{{ showCreate() ? i18n.t('common.close') : i18n.t('projects.newProject') }}</button>
    </section>
    @if (showCreate()) {
      <mat-card class="form-card">
        <div class="card-head"><h2>{{ i18n.t('projects.createProject') }}</h2><span>{{ i18n.t('projects.createHint') }}</span></div>
        <form [formGroup]="form" (ngSubmit)="create()">
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.name') }}</mat-label><input matInput formControlName="name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.description') }}</mat-label><input matInput formControlName="description" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('field.packageManager') }}</mat-label><mat-select formControlName="packageManager"><mat-option value="npm">npm</mat-option><mat-option value="yarn">yarn</mat-option><mat-option value="pnpm">pnpm</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('table.schedule') }}</mat-label><mat-select formControlName="scheduleType"><mat-option value="manual">{{ i18n.t('schedule.manual') }}</mat-option><mat-option value="weekly">{{ i18n.t('schedule.weekly') }}</mat-option><mat-option value="monthly">{{ i18n.t('schedule.monthly') }}</mat-option></mat-select></mat-form-field>
          <button mat-flat-button class="primary-action" [disabled]="form.invalid"><mat-icon>check</mat-icon>{{ i18n.t('projects.createProject') }}</button>
        </form>
      </mat-card>
    }
    <mat-card class="table-card">
      <div class="card-head"><h2>{{ i18n.t('projects.allProjects') }}</h2><span>{{ projects.projects().length }} {{ i18n.t('common.total') }}</span></div>
      <table mat-table [dataSource]="projects.projects()">
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.project') }}</th><td mat-cell *matCellDef="let project"><div class="project-name"><span class="project-dot"></span><div><strong>{{ project.name }}</strong><small>{{ project.description || i18n.t('projects.noDescription') }}</small></div></div></td></ng-container>
        <ng-container matColumnDef="manager"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.manager') }}</th><td mat-cell *matCellDef="let project"><span class="pill">{{ project.packageManager }}</span></td></ng-container>
        <ng-container matColumnDef="score"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.health') }}</th><td mat-cell *matCellDef="let project"><div class="health-cell"><app-health-score [score]="project.lastHealthScore || 0" [size]="56" /><strong>{{ project.lastHealthScore || 0 }}</strong></div></td></ng-container>
        <ng-container matColumnDef="schedule"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.schedule') }}</th><td mat-cell *matCellDef="let project"><mat-form-field class="table-select" appearance="outline"><mat-select [value]="project.scheduleType" (selectionChange)="projects.updateProjectSchedule(project.id, $event.value)"><mat-option value="manual">{{ i18n.t('schedule.manual') }}</mat-option><mat-option value="weekly">{{ i18n.t('schedule.weekly') }}</mat-option><mat-option value="monthly">{{ i18n.t('schedule.monthly') }}</mat-option></mat-select></mat-form-field></td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.actions') }}</th><td mat-cell *matCellDef="let project"><div class="table-actions"><a mat-flat-button class="mini-action" routerLink="/scan/new"><mat-icon>radar</mat-icon>{{ i18n.t('common.scan') }}</a>@if (latestScanId(project.id)) { <a mat-flat-button class="mini-action" [routerLink]="['/reports', latestScanId(project.id)]"><mat-icon>article</mat-icon>{{ i18n.t('projects.latestReport') }}</a> }<button mat-icon-button class="danger-action" [attr.aria-label]="i18n.t('projects.deleteProject')" (click)="confirmDelete(project.id)"><mat-icon>delete</mat-icon></button></div></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </mat-card>
  `,
})
export class ProjectsPage {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  readonly i18n = inject(I18nService);
  readonly columns = ['name', 'manager', 'score', 'schedule', 'actions'];
  readonly showCreate = signal(false);
  readonly form = this.fb.nonNullable.group({ name: ['', Validators.required], description: [''], packageManager: ['npm' as const], scheduleType: ['weekly' as const] });
  constructor(readonly projects: ProjectService, private readonly scans: ScanService) {}
  async create() {
    await this.projects.createProject(this.form.getRawValue());
    this.form.reset({ name: '', description: '', packageManager: 'npm', scheduleType: 'weekly' });
    this.showCreate.set(false);
  }
  latestScanId(projectId: string) {
    return this.scans.latestScanForProject(projectId)?.id ?? null;
  }
  confirmDelete(id: string) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: this.i18n.t('projects.deleteProject'), message: this.i18n.t('projects.deleteConfirm') },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.projects.deleteProject(id);
    });
  }
}
