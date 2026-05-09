import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ChartConfiguration } from 'chart.js';
import { DashboardService } from '../../core/dashboard.service';
import { DependencyScan, ScanStatus } from '../../core/models';
import { ProjectService } from '../../core/project.service';
import { ScanService } from '../../core/scan.service';
import { StatCardComponent } from '../../shared/stat-card.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, BaseChartDirective, MatButtonModule, MatCardModule, MatIconModule, MatSelectModule, MatTableModule, StatCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero">
      <div>
        <span class="section-kicker">{{ i18n.t('dashboard.kicker') }}</span>
        <h1>{{ i18n.t('nav.dashboard') }}</h1>
        <p>{{ i18n.t('dashboard.subtitle') }}</p>
      </div>
    </section>
    <section class="dashboard-filters">
      <mat-form-field appearance="outline">
        <mat-label>{{ i18n.t('table.project') }}</mat-label>
        <mat-select [value]="projectFilter()" (selectionChange)="projectFilter.set($event.value)">
          <mat-option value="all">{{ i18n.t('dashboard.allProjects') }}</mat-option>
          @for (project of projects.projects(); track project.id) { <mat-option [value]="project.id">{{ project.name }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <div class="segmented-control" [attr.aria-label]="i18n.t('dashboard.dateRange')">
        <button type="button" [class.active]="rangeFilter() === '7d'" (click)="rangeFilter.set('7d')">{{ i18n.t('dashboard.range.7d') }}</button>
        <button type="button" [class.active]="rangeFilter() === '30d'" (click)="rangeFilter.set('30d')">{{ i18n.t('dashboard.range.30d') }}</button>
        <button type="button" [class.active]="rangeFilter() === 'all'" (click)="rangeFilter.set('all')">{{ i18n.t('dashboard.range.all') }}</button>
      </div>
    </section>
    @if (!filteredScans().length) {
      <mat-card class="empty-state dashboard-empty">
        <mat-icon>radar</mat-icon>
        <h2>{{ i18n.t('dashboard.emptyTitle') }}</h2>
        <p>{{ i18n.t('dashboard.emptyText') }}</p>
        <a mat-flat-button class="primary-action" routerLink="/scan/new"><mat-icon>play_arrow</mat-icon>{{ i18n.t('common.scan') }}</a>
      </mat-card>
    } @else {
    <section class="stats-grid">
      <app-stat-card [label]="i18n.t('dashboard.totalProjects')" [value]="filteredProjectCount()" icon="folder" [trend]="projectTrend()" tone="blue" />
      <app-stat-card [label]="i18n.t('dashboard.totalScans')" [value]="filteredStats().totalScans" icon="radar" [trend]="scanTrend()" tone="teal" />
      <mat-card [class]="'stat-card score-card ' + healthTone(filteredStats().averageHealthScore)">
        <div class="score-copy"><p>{{ i18n.t('dashboard.avgHealth') }}</p><strong>{{ filteredStats().averageHealthScore }}</strong><small>{{ healthLabel(filteredStats().averageHealthScore) }}</small></div>
        <div class="mini-meter"><span [class]="healthTone(filteredStats().averageHealthScore)" [style.width.%]="filteredStats().averageHealthScore"></span></div>
      </mat-card>
      <app-stat-card [label]="i18n.t('dashboard.criticalRisks')" [value]="filteredStats().criticalRisks" icon="gpp_bad" [trend]="riskTrend('critical')" tone="red" />
      <app-stat-card [label]="i18n.t('dashboard.highRisks')" [value]="filteredStats().highRisks" icon="warning" [trend]="riskTrend('high')" tone="amber" />
      <app-stat-card [label]="i18n.t('dashboard.packagesMonitored')" [value]="filteredStats().packagesMonitored" icon="inventory_2" [trend]="packageTrend()" tone="violet" />
    </section>
    <section class="dashboard-grid">
      <mat-card class="chart-card wide"><div class="card-head"><h2>{{ i18n.t('dashboard.healthTrend') }}</h2><span>{{ i18n.t('dashboard.last5Scans') }}</span></div><canvas baseChart [data]="lineData()" [options]="lineOptions" type="line"></canvas></mat-card>
      <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.riskDistribution') }}</h2><span>{{ i18n.t('dashboard.bySeverity') }}</span></div><canvas baseChart [data]="riskData()" [options]="doughnutOptions" type="doughnut"></canvas></mat-card>
      <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.updateTypes') }}</h2><span>{{ i18n.t('dashboard.upgradeImpact') }}</span></div><canvas baseChart [data]="barData()" [options]="barOptions" type="bar"></canvas></mat-card>
    </section>
    <mat-card class="table-card risky-card">
      <div class="card-head"><h2>{{ i18n.t('dashboard.topRiskyPackages') }}</h2><span>{{ topRiskyPackages().length }} {{ i18n.t('common.total') }}</span></div>
      <div class="risky-list">
        @for (item of topRiskyPackages(); track item.id) {
          <article>
            <div><strong>{{ item.packageName }}</strong><small>{{ projectName(item.projectId) }} - {{ item.currentVersion }} -> {{ item.latestVersion }}</small></div>
            <span [class]="'metric-badge risk ' + item.riskLevel + ' ' + countTone(item.riskScore, item.riskLevel === 'critical' ? 'critical' : 'high')">{{ i18n.t('risk.' + item.riskLevel) }}</span>
          </article>
        } @empty {
          <p>{{ i18n.t('dashboard.noRiskyPackages') }}</p>
        }
      </div>
    </mat-card>
    <mat-card class="table-card">
      <h2>{{ i18n.t('dashboard.recentScans') }}</h2>
      <table mat-table [dataSource]="recentFilteredScans()">
        <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.project') }}</th><td mat-cell *matCellDef="let scan">{{ projectName(scan.projectId) }}</td></ng-container>
        <ng-container matColumnDef="score"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.health') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge health ' + healthTone(scan.healthScore)">{{ scan.healthScore }}</span></td></ng-container>
        <ng-container matColumnDef="critical"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('risk.critical') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge risk critical ' + countTone(scan.criticalRiskCount, 'critical')">{{ scan.criticalRiskCount }}</span></td></ng-container>
        <ng-container matColumnDef="high"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('risk.high') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge risk high ' + countTone(scan.highRiskCount, 'high')">{{ scan.highRiskCount }}</span></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.status') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'status-badge ' + statusClass(scan.status)">{{ statusLabel(scan.status) }}</span></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </mat-card>
    }
  `,
})
export class DashboardPage {
  readonly i18n = inject(I18nService);
  readonly projectFilter = signal('all');
  readonly rangeFilter = signal<'7d' | '30d' | 'all'>('30d');
  readonly columns = ['project', 'score', 'critical', 'high', 'status'];
  readonly chartText = '#9cadc8';
  readonly gridColor = 'rgba(148, 163, 184, .16)';
  readonly filteredScans = computed(() => this.scans.scans()
    .filter((scan) => this.projectFilter() === 'all' || scan.projectId === this.projectFilter())
    .filter((scan) => this.rangeFilter() === 'all' || this.isWithinDays(scan.createdAt, this.rangeFilter() === '7d' ? 7 : 30))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly recentFilteredScans = computed(() => this.filteredScans().slice(0, 8));
  readonly filteredItems = computed(() => {
    const scanIds = new Set(this.filteredScans().map((scan) => scan.id));
    return this.scans.items().filter((item) => scanIds.has(item.scanId));
  });
  readonly filteredStats = computed(() => {
    const scans = this.filteredScans();
    const totalScore = scans.reduce((sum, scan) => sum + scan.healthScore, 0);
    return {
      totalScans: scans.length,
      averageHealthScore: scans.length ? Math.round(totalScore / scans.length) : 0,
      criticalRisks: scans.reduce((sum, scan) => sum + scan.criticalRiskCount, 0),
      highRisks: scans.reduce((sum, scan) => sum + scan.highRiskCount, 0),
      packagesMonitored: scans.reduce((sum, scan) => sum + scan.totalDependencies + scan.totalDevDependencies, 0),
    };
  });
  readonly filteredProjectCount = computed(() => this.projectFilter() === 'all' ? new Set(this.filteredScans().map((scan) => scan.projectId)).size : 1);
  readonly topRiskyPackages = computed(() => this.filteredItems()
    .filter((item) => item.riskLevel === 'critical' || item.riskLevel === 'high' || item.isVulnerable)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6));

  lineData(): ChartConfiguration<'line'>['data'] {
    const points = [...this.filteredScans()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-5);
    return {
      labels: points.map((scan) => new Intl.DateTimeFormat(this.locale(), { month: 'short', day: 'numeric' }).format(new Date(scan.createdAt))),
      datasets: [{ data: points.map((scan) => scan.healthScore), borderColor: '#62a7ff', backgroundColor: 'rgba(98,167,255,.18)', pointBackgroundColor: '#2dd4bf', pointBorderColor: '#08111f', pointRadius: 4, fill: true, tension: .42 }],
    };
  }
  readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: this.chartText } },
      y: { min: 0, max: 100, grid: { color: this.gridColor }, ticks: { color: this.chartText } },
    },
  };
  barData(): ChartConfiguration<'bar'>['data'] {
    const items = this.filteredItems();
    return { labels: [this.i18n.t('update.patch'), this.i18n.t('update.minor'), this.i18n.t('update.major')], datasets: [{ data: ['patch', 'minor', 'major'].map((type) => items.filter((item) => item.updateType === type).length), backgroundColor: ['#2dd4bf', '#62a7ff', '#f97316'], borderRadius: 10, maxBarThickness: 44 }] };
  }
  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: this.chartText } },
      y: { grid: { color: this.gridColor }, ticks: { color: this.chartText } },
    },
  };
  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { position: 'bottom', labels: { color: this.chartText, usePointStyle: true, boxWidth: 8 } } },
  };
  constructor(readonly dashboard: DashboardService, readonly scans: ScanService, readonly projects: ProjectService) {}
  riskData(): ChartConfiguration<'doughnut'>['data'] {
    const scans = this.filteredScans();
    const points = [
      { label: 'low', value: scans.reduce((sum, scan) => sum + scan.lowRiskCount, 0), color: '#22c55e' },
      { label: 'medium', value: scans.reduce((sum, scan) => sum + scan.mediumRiskCount, 0), color: '#f59e0b' },
      { label: 'high', value: scans.reduce((sum, scan) => sum + scan.highRiskCount, 0), color: '#f97316' },
      { label: 'critical', value: scans.reduce((sum, scan) => sum + scan.criticalRiskCount, 0), color: '#ef4444' },
    ];
    return { labels: points.map((p) => this.i18n.t(`risk.${p.label}`)), datasets: [{ data: points.map((p) => p.value), backgroundColor: points.map((p) => p.color) }] };
  }
  projectName(id: string) { return this.projects.getProjectById(id)?.name ?? id; }
  projectTrend() {
    const now = Date.now();
    const current = this.projects.projects().filter((project) => this.inWindow(project.createdAt, now, 7, 0)).length;
    const previous = this.projects.projects().filter((project) => this.inWindow(project.createdAt, now, 14, 7)).length;
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.projectsUnit'));
  }
  scanTrend() {
    const now = Date.now();
    const current = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).length;
    const previous = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).length;
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.scansUnit'));
  }
  riskTrend(kind: 'critical' | 'high') {
    const now = Date.now();
    const read = (scan: DependencyScan) => kind === 'critical' ? scan.criticalRiskCount : scan.highRiskCount;
    const current = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).reduce((sum, scan) => sum + read(scan), 0);
    const previous = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).reduce((sum, scan) => sum + read(scan), 0);
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.risksUnit'), true);
  }
  packageTrend() {
    const now = Date.now();
    const count = (scan: DependencyScan) => scan.totalDependencies + scan.totalDevDependencies;
    const current = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).reduce((sum, scan) => sum + count(scan), 0);
    const previous = this.filterByProject(this.scans.scans()).filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).reduce((sum, scan) => sum + count(scan), 0);
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.packagesUnit'));
  }
  healthTone(score: number) { return score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad'; }
  healthLabel(score: number) {
    return score >= 75 ? this.i18n.t('health.good') : score >= 50 ? this.i18n.t('health.needsAttention') : this.i18n.t('health.risky');
  }
  countTone(value: number, kind: 'high' | 'critical') {
    if (!value) return 'clear';
    return kind === 'critical' ? 'bad' : 'warn';
  }
  statusClass(status: ScanStatus) { return status; }
  statusLabel(status: ScanStatus) { return this.i18n.t(`status.${status}`); }
  private inWindow(date: string, now: number, olderThanDays: number, newerThanDays: number) {
    const time = new Date(date).getTime();
    const day = 1000 * 60 * 60 * 24;
    return time >= now - olderThanDays * day && time < now - newerThanDays * day;
  }
  private isWithinDays(date: string, days: number) {
    return new Date(date).getTime() >= Date.now() - days * 1000 * 60 * 60 * 24;
  }
  private filterByProject(scans: DependencyScan[]) {
    return scans.filter((scan) => this.projectFilter() === 'all' || scan.projectId === this.projectFilter());
  }
  private deltaText(delta: number, unit: string, lowerIsBetter = false) {
    if (delta === 0) return `${this.i18n.t('dashboard.trend.noChange')} ${this.i18n.t('dashboard.trend.period')}`;
    const direction = delta > 0 ? `+${delta}` : String(delta);
    const verdict = lowerIsBetter ? (delta > 0 ? this.i18n.t('dashboard.trend.worse') : this.i18n.t('dashboard.trend.better')) : this.i18n.t('dashboard.trend.changed');
    return `${direction} ${unit} ${this.i18n.t('dashboard.trend.period')} - ${verdict}`;
  }
  private locale() { return this.i18n.language() === 'ro' ? 'ro-RO' : 'en-US'; }
}
