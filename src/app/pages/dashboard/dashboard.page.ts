import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { MatCardModule } from '@angular/material/card';
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
  imports: [BaseChartDirective, MatCardModule, MatTableModule, StatCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-head page-hero">
      <div>
        <span class="section-kicker">{{ i18n.t('dashboard.kicker') }}</span>
        <h1>{{ i18n.t('nav.dashboard') }}</h1>
        <p>{{ i18n.t('dashboard.subtitle') }}</p>
      </div>
    </section>
    <section class="stats-grid">
      <app-stat-card [label]="i18n.t('dashboard.totalProjects')" [value]="dashboard.stats().totalProjects" icon="folder" [trend]="projectTrend()" tone="blue" />
      <app-stat-card [label]="i18n.t('dashboard.totalScans')" [value]="dashboard.stats().totalScans" icon="radar" [trend]="scanTrend()" tone="teal" />
      <mat-card [class]="'stat-card score-card ' + healthTone(dashboard.stats().averageHealthScore)">
        <div class="score-copy"><p>{{ i18n.t('dashboard.avgHealth') }}</p><strong>{{ dashboard.stats().averageHealthScore }}</strong><small>{{ healthLabel(dashboard.stats().averageHealthScore) }}</small></div>
        <div class="mini-meter"><span [class]="healthTone(dashboard.stats().averageHealthScore)" [style.width.%]="dashboard.stats().averageHealthScore"></span></div>
      </mat-card>
      <app-stat-card [label]="i18n.t('dashboard.criticalRisks')" [value]="dashboard.stats().criticalRisks" icon="gpp_bad" [trend]="riskTrend('critical')" tone="red" />
      <app-stat-card [label]="i18n.t('dashboard.highRisks')" [value]="dashboard.stats().highRisks" icon="warning" [trend]="riskTrend('high')" tone="amber" />
      <app-stat-card [label]="i18n.t('dashboard.packagesMonitored')" [value]="dashboard.stats().packagesMonitored" icon="inventory_2" [trend]="packageTrend()" tone="violet" />
    </section>
    <section class="dashboard-grid">
      <mat-card class="chart-card wide"><div class="card-head"><h2>{{ i18n.t('dashboard.healthTrend') }}</h2><span>{{ i18n.t('dashboard.last5Scans') }}</span></div><canvas baseChart [data]="lineData()" [options]="lineOptions" type="line"></canvas></mat-card>
      <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.riskDistribution') }}</h2><span>{{ i18n.t('dashboard.bySeverity') }}</span></div><canvas baseChart [data]="riskData()" [options]="doughnutOptions" type="doughnut"></canvas></mat-card>
      <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.updateTypes') }}</h2><span>{{ i18n.t('dashboard.upgradeImpact') }}</span></div><canvas baseChart [data]="barData()" [options]="barOptions" type="bar"></canvas></mat-card>
    </section>
    <mat-card class="table-card">
      <h2>{{ i18n.t('dashboard.recentScans') }}</h2>
      <table mat-table [dataSource]="scans.recentScans()">
        <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.project') }}</th><td mat-cell *matCellDef="let scan">{{ projectName(scan.projectId) }}</td></ng-container>
        <ng-container matColumnDef="score"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.health') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge health ' + healthTone(scan.healthScore)">{{ scan.healthScore }}</span></td></ng-container>
        <ng-container matColumnDef="critical"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('risk.critical') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge risk critical ' + countTone(scan.criticalRiskCount, 'critical')">{{ scan.criticalRiskCount }}</span></td></ng-container>
        <ng-container matColumnDef="high"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('risk.high') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'metric-badge risk high ' + countTone(scan.highRiskCount, 'high')">{{ scan.highRiskCount }}</span></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>{{ i18n.t('table.status') }}</th><td mat-cell *matCellDef="let scan"><span [class]="'status-badge ' + statusClass(scan.status)">{{ statusLabel(scan.status) }}</span></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </mat-card>
  `,
})
export class DashboardPage {
  readonly i18n = inject(I18nService);
  readonly columns = ['project', 'score', 'critical', 'high', 'status'];
  readonly chartText = '#9cadc8';
  readonly gridColor = 'rgba(148, 163, 184, .16)';
  lineData(): ChartConfiguration<'line'>['data'] {
    const points = [...this.scans.scans()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-5);
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
    const items = this.scans.items();
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
  constructor(readonly dashboard: DashboardService, readonly scans: ScanService, private readonly projects: ProjectService) {}
  riskData(): ChartConfiguration<'doughnut'>['data'] {
    const points = this.dashboard.riskDistribution();
    return { labels: points.map((p) => this.i18n.t(`risk.${p.label.toLowerCase()}`)), datasets: [{ data: points.map((p) => p.value), backgroundColor: points.map((p) => p.color ?? '#64748b') }] };
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
    const current = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).length;
    const previous = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).length;
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.scansUnit'));
  }
  riskTrend(kind: 'critical' | 'high') {
    const now = Date.now();
    const read = (scan: DependencyScan) => kind === 'critical' ? scan.criticalRiskCount : scan.highRiskCount;
    const current = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).reduce((sum, scan) => sum + read(scan), 0);
    const previous = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).reduce((sum, scan) => sum + read(scan), 0);
    return this.deltaText(current - previous, this.i18n.t('dashboard.trend.risksUnit'), true);
  }
  packageTrend() {
    const now = Date.now();
    const count = (scan: DependencyScan) => scan.totalDependencies + scan.totalDevDependencies;
    const current = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 7, 0)).reduce((sum, scan) => sum + count(scan), 0);
    const previous = this.scans.scans().filter((scan) => this.inWindow(scan.createdAt, now, 14, 7)).reduce((sum, scan) => sum + count(scan), 0);
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
  private deltaText(delta: number, unit: string, lowerIsBetter = false) {
    if (delta === 0) return `${this.i18n.t('dashboard.trend.noChange')} ${this.i18n.t('dashboard.trend.period')}`;
    const direction = delta > 0 ? `+${delta}` : String(delta);
    const verdict = lowerIsBetter ? (delta > 0 ? this.i18n.t('dashboard.trend.worse') : this.i18n.t('dashboard.trend.better')) : this.i18n.t('dashboard.trend.changed');
    return `${direction} ${unit} ${this.i18n.t('dashboard.trend.period')} - ${verdict}`;
  }
  private locale() { return this.i18n.language() === 'ro' ? 'ro-RO' : 'en-US'; }
}
