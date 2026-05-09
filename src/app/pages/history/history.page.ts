import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ScanService } from '../../core/scan.service';
import { ProjectService } from '../../core/project.service';
import { I18nService } from '../../core/i18n.service';
import { ScanStatus } from '../../core/models';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatSelectModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero row"><div><span class="section-kicker">{{ i18n.t('history.kicker') }}</span><h1>{{ i18n.t('nav.history') }}</h1><p>{{ i18n.t('history.subtitle') }}</p></div><a mat-flat-button class="primary-action compact" routerLink="/scan/new"><mat-icon>radar</mat-icon>{{ i18n.t('history.runScan') }}</a></section>
    <section class="dashboard-filters history-filters">
      <mat-form-field appearance="outline">
        <mat-label>{{ i18n.t('table.project') }}</mat-label>
        <mat-select [value]="projectFilter()" (selectionChange)="projectFilter.set($event.value)">
          <mat-option value="all">{{ i18n.t('dashboard.allProjects') }}</mat-option>
          @for (project of projects.projects(); track project.id) { <mat-option [value]="project.id">{{ project.name }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>{{ i18n.t('table.status') }}</mat-label>
        <mat-select [value]="statusFilter()" (selectionChange)="statusFilter.set($event.value)">
          <mat-option value="all">{{ i18n.t('history.allStatuses') }}</mat-option>
          <mat-option value="completed">{{ i18n.t('status.completed') }}</mat-option>
          <mat-option value="running">{{ i18n.t('status.running') }}</mat-option>
          <mat-option value="pending">{{ i18n.t('status.pending') }}</mat-option>
          <mat-option value="failed">{{ i18n.t('status.failed') }}</mat-option>
        </mat-select>
      </mat-form-field>
      <div class="segmented-control" [attr.aria-label]="i18n.t('dashboard.dateRange')">
        <button type="button" [class.active]="rangeFilter() === '7d'" (click)="rangeFilter.set('7d')">{{ i18n.t('dashboard.range.7d') }}</button>
        <button type="button" [class.active]="rangeFilter() === '30d'" (click)="rangeFilter.set('30d')">{{ i18n.t('dashboard.range.30d') }}</button>
        <button type="button" [class.active]="rangeFilter() === 'all'" (click)="rangeFilter.set('all')">{{ i18n.t('dashboard.range.all') }}</button>
      </div>
    </section>
    <mat-card class="table-card">
      <div class="card-head"><h2>{{ i18n.t('history.recentScans') }}</h2><span>{{ filteredScans().length }} {{ i18n.t('history.records') }}</span></div>
      @if (filteredScans().length) {
      <table mat-table [dataSource]="filteredScans()">
        <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.date') }}</th><td mat-cell *matCellDef="let scan">{{ scan.createdAt | date:'medium' }}</td></ng-container>
        <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.project') }}</th><td mat-cell *matCellDef="let scan">{{ projectName(scan.projectId) }}</td></ng-container>
        <ng-container matColumnDef="score"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.health') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge health ' + healthTone(scan.healthScore)">{{ scan.healthScore }}</span></td></ng-container>
        <ng-container matColumnDef="deps"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.dependencies') }}</th><td mat-cell *matCellDef="let scan">{{ scan.totalDependencies + scan.totalDevDependencies }}</td></ng-container>
        <ng-container matColumnDef="risks"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('history.highCritical') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge risk high ' + countTone(scan.highRiskCount, 'high')">{{ scan.highRiskCount }}</span><span [class]="'metric-badge risk critical ' + countTone(scan.criticalRiskCount, 'critical')">{{ scan.criticalRiskCount }}</span></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.status') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'status-badge ' + statusClass(scan.status)">{{ statusLabel(scan.status) }}</span></td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.actions') }}</th><td mat-cell *matCellDef="let scan"><div class="table-actions"><a mat-flat-button class="mini-action" [routerLink]="['/reports', scan.id]"><mat-icon>article</mat-icon>{{ i18n.t('history.report') }}</a>@if (previousScanId(scan)) { <a mat-flat-button class="mini-action" [routerLink]="['/reports/compare', previousScanId(scan), scan.id]"><mat-icon>compare_arrows</mat-icon>{{ i18n.t('history.compare') }}</a> }</div></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      } @else {
        <div class="empty-state inline-empty"><mat-icon>history</mat-icon><h2>{{ i18n.t('history.emptyTitle') }}</h2><p>{{ i18n.t('history.emptyText') }}</p></div>
      }
    </mat-card>
  `,
})
export class HistoryPage {
  readonly i18n = inject(I18nService);
  readonly projectFilter = signal('all');
  readonly statusFilter = signal<'all' | ScanStatus>('all');
  readonly rangeFilter = signal<'7d' | '30d' | 'all'>('30d');
  readonly columns = ['date', 'project', 'score', 'deps', 'risks', 'status', 'actions'];
  readonly filteredScans = computed(() => this.scans.scans()
    .filter((scan) => this.projectFilter() === 'all' || scan.projectId === this.projectFilter())
    .filter((scan) => this.statusFilter() === 'all' || scan.status === this.statusFilter())
    .filter((scan) => this.rangeFilter() === 'all' || this.isWithinDays(scan.createdAt, this.rangeFilter() === '7d' ? 7 : 30))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  constructor(readonly scans: ScanService, readonly projects: ProjectService) {}
  projectName(id: string) { return this.projects.getProjectById(id)?.name ?? id; }
  healthTone(score: number) { return score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad'; }
  countTone(value: number, kind: 'high' | 'critical') {
    if (!value) return 'clear';
    return kind === 'critical' ? 'bad' : 'warn';
  }
  statusClass(status: ScanStatus) { return status; }
  statusLabel(status: ScanStatus) { return this.i18n.t(`status.${status}`); }
  previousScanId(scan: any) { return this.scans.getPreviousScanId(scan); }
  private isWithinDays(date: string, days: number) {
    return new Date(date).getTime() >= Date.now() - days * 1000 * 60 * 60 * 24;
  }
}
