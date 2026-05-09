import { DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project } from '../../core/models';
import { ProjectService } from '../../core/project.service';
import { ScanService } from '../../core/scan.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { I18nService } from '../../core/i18n.service';
import { ProjectEditorDialogComponent, ProjectEditorResult } from './project-editor-dialog.component';

@Component({
  selector: 'app-projects-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero row">
      <div>
        <span class="section-kicker">{{ i18n.t('projects.kicker') }}</span>
        <h1>{{ i18n.t('nav.projects') }}</h1>
        <p>{{ i18n.t('projects.subtitle') }}</p>
      </div>
      <button mat-flat-button class="primary-action compact" (click)="openCreate()"><mat-icon>add</mat-icon>{{ i18n.t('projects.newProject') }}</button>
    </section>
    <section class="project-toolbar">
      <div>
        <h2>{{ i18n.t('projects.allProjects') }}</h2>
        <p>{{ projects.projects().length }} {{ i18n.t('common.total') }}</p>
      </div>
      <span class="pill muted">{{ i18n.t('projects.freeAnalysis') }}</span>
    </section>
    <section class="project-list">
      @for (project of projects.projects(); track project.id) {
        <article [class]="'project-card ' + healthTone(project.lastHealthScore || 0)">
          <div class="project-main">
            <span class="project-dot"></span>
            <div>
              <div class="project-title-row">
                <h2>{{ project.name }}</h2>
                <span class="pill">{{ project.packageManager }}</span>
              </div>
              <p>{{ project.description || i18n.t('projects.noDescription') }}</p>
              <div class="project-meta">
                <span><mat-icon>schedule</mat-icon>{{ scheduleLabel(project.scheduleType) }}</span>
                @if (project.lastScanAt) { <span><mat-icon>radar</mat-icon>{{ i18n.t('projects.lastScan') }} {{ project.lastScanAt | date:'mediumDate' }}</span> }
              </div>
            </div>
          </div>
          <div class="project-health">
            <span [class]="'health-chip ' + healthTone(project.lastHealthScore || 0)">
              <strong>{{ project.lastHealthScore || 0 }}</strong>
              <small>{{ healthLabel(project.lastHealthScore || 0) }}</small>
            </span>
            <div class="health-bar"><span [class]="healthTone(project.lastHealthScore || 0)" [style.width.%]="project.lastHealthScore || 0"></span></div>
          </div>
          <div class="project-actions">
            <a mat-flat-button class="mini-action scan-action" routerLink="/scan/new"><mat-icon>radar</mat-icon>{{ i18n.t('common.scan') }}</a>
            @if (latestScanId(project.id)) { <a mat-flat-button class="mini-action" [routerLink]="['/reports', latestScanId(project.id)]"><mat-icon>article</mat-icon>{{ i18n.t('projects.latestReport') }}</a> }
            <button mat-icon-button class="icon-action" [matTooltip]="i18n.t('projects.editProject')" [attr.aria-label]="i18n.t('projects.editProject')" (click)="openEdit(project)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button class="danger-action subtle" [matTooltip]="i18n.t('projects.deleteProject')" [attr.aria-label]="i18n.t('projects.deleteProject')" (click)="confirmDelete(project.id)"><mat-icon>delete</mat-icon></button>
          </div>
        </article>
      } @empty {
        <mat-card class="empty-state"><h2>{{ i18n.t('projects.emptyTitle') }}</h2><p>{{ i18n.t('projects.emptyText') }}</p><button mat-flat-button class="primary-action" (click)="openCreate()"><mat-icon>add</mat-icon>{{ i18n.t('projects.newProject') }}</button></mat-card>
      }
    </section>
  `,
})
export class ProjectsPage {
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  readonly i18n = inject(I18nService);
  constructor(readonly projects: ProjectService, private readonly scans: ScanService) {}
  latestScanId(projectId: string) {
    return this.scans.latestScanForProject(projectId)?.id ?? null;
  }
  openCreate() {
    this.openEditor();
  }
  openEdit(project: Project) {
    this.openEditor(project);
  }
  confirmDelete(id: string) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: this.i18n.t('projects.deleteProject'), message: this.i18n.t('projects.deleteConfirm') },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.projects.deleteProject(id);
    });
  }
  healthTone(score: number) { return score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad'; }
  healthLabel(score: number) {
    return score >= 75 ? this.i18n.t('health.good') : score >= 50 ? this.i18n.t('health.needsAttention') : this.i18n.t('health.risky');
  }
  scheduleLabel(schedule: Project['scheduleType']) {
    return this.i18n.t(`schedule.${schedule}`);
  }
  private openEditor(project?: Project) {
    const ref = this.dialog.open(ProjectEditorDialogComponent, { data: { project } });
    ref.afterClosed().subscribe((result?: ProjectEditorResult) => {
      if (!result) return;
      void this.saveProject(result, project);
    });
  }
  private async saveProject(result: ProjectEditorResult, project?: Project) {
    try {
      if (project) {
        await this.projects.updateProject(project.id, result);
        this.snack.open(this.i18n.t('projects.updated'), this.i18n.t('common.close'), { duration: 2200 });
      } else {
        await this.projects.createProject(result);
        this.snack.open(this.i18n.t('projects.created'), this.i18n.t('common.close'), { duration: 2200 });
      }
    } catch (error: any) {
      this.snack.open(error.message ?? this.i18n.t('projects.saveFailed'), this.i18n.t('common.close'), { duration: 3600 });
    }
  }
}
