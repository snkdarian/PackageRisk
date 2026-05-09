import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { DependencyScanItem } from '../../core/models';
import { ScanService } from '../../core/scan.service';
import { HealthScoreComponent } from '../../shared/health-score.component';
import { RiskBadgeComponent } from '../../shared/risk-badge.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-report-page',
  imports: [DatePipe, BaseChartDirective, MatButtonModule, MatCardModule, MatExpansionModule, MatIconModule, MatTableModule, HealthScoreComponent, RiskBadgeComponent, StatCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (report()) {
      <section class="page-head page-hero row">
        <div>
          <span class="section-kicker">{{ i18n.t('report.kicker') }}</span>
          <h1>{{ i18n.t('report.title') }}</h1>
          <p>{{ report()!.project.name }} - {{ report()!.scan.createdAt | date:'medium' }}</p>
        </div>
        <button mat-flat-button class="primary-action compact"><mat-icon>download</mat-icon>{{ i18n.t('report.export') }}</button>
      </section>
      <section class="report-summary">
        <mat-card class="health-panel">
          <div class="card-head"><h2>{{ i18n.t('report.overallHealth') }}</h2><span [class]="'metric-badge health ' + healthTone(report()!.scan.healthScore)">{{ label() }}</span></div>
          <app-health-score [score]="report()!.scan.healthScore" [size]="118" />
          <p>{{ i18n.t('report.healthText') }}</p>
        </mat-card>
        <app-stat-card [label]="i18n.t('report.totalDependencies')" [value]="report()!.scan.totalDependencies + report()!.scan.totalDevDependencies" icon="inventory_2" tone="blue" />
        <app-stat-card [label]="i18n.t('report.outdated')" [value]="report()!.scan.outdatedCount" icon="update" tone="amber" />
        <app-stat-card [label]="i18n.t('report.vulnerable')" [value]="report()!.scan.vulnerableCount" icon="gpp_bad" tone="red" />
        <app-stat-card [label]="i18n.t('report.deprecated')" [value]="report()!.scan.deprecatedCount" icon="warning" tone="amber" />
      </section>
      <section class="dashboard-grid">
        <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.riskDistribution') }}</h2><span>{{ i18n.t('report.severity') }}</span></div><canvas baseChart [data]="riskData()" [options]="doughnutOptions" type="doughnut"></canvas></mat-card>
        <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.updateTypes') }}</h2><span>{{ i18n.t('report.impact') }}</span></div><canvas baseChart [data]="updateData()" [options]="barOptions" type="bar"></canvas></mat-card>
        <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('report.dependencyTypes') }}</h2><span>{{ i18n.t('report.scope') }}</span></div><canvas baseChart [data]="dependencyTypeData()" [options]="barOptions" type="bar"></canvas></mat-card>
      </section>
      <mat-card class="table-card">
        <div class="card-head"><h2>{{ i18n.t('table.dependencies') }}</h2><span>{{ report()!.items.length }} {{ i18n.t('report.packages') }}</span></div>
        <mat-accordion>
          @for (item of report()!.items; track item.id) {
            <mat-expansion-panel [class]="'risk-panel ' + item.riskLevel">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ item.packageName }} <small>{{ item.currentVersion }} -> {{ item.latestVersion }}</small></mat-panel-title>
                <mat-panel-description><app-risk-badge [level]="item.riskLevel" /></mat-panel-description>
              </mat-expansion-panel-header>
              <div class="expanded-grid">
                <div><h3>{{ i18n.t('report.whyRisk') }}</h3><p>{{ localizedRiskReason(item) }}</p><p>{{ localizedExplanation(item) }}</p><p class="prediction-line">{{ prediction(item) }}</p></div>
                <div><h3>{{ i18n.t('report.recommendedCommand') }}</h3><code>{{ item.updateCommand }}</code><button mat-button (click)="copy(item.updateCommand)">{{ i18n.t('common.copy') }}</button><h3>{{ i18n.t('report.remediationPlan') }}</h3>@for (step of remediationSteps(item); track step) { <p class="tip-line">{{ step }}</p> }</div>
                <div><h3>{{ i18n.t('report.updateImpact') }}</h3>
                  <div class="version-strip">
                    <span><small>{{ i18n.t('report.current') }}</small><strong>{{ item.currentVersion }}</strong></span>
                    <mat-icon>arrow_forward</mat-icon>
                    <span><small>{{ i18n.t('report.latest') }}</small><strong>{{ item.latestVersion }}</strong></span>
                  </div>
                  <p [class]="'impact-note ' + severityClass(item.riskLevel)">{{ updateImpact(item) }}</p>
                  @for (change of majorChanges(item); track change) { <p class="tip-line">{{ change }}</p> }
                  @if (item.releaseInsights) {
                    <div class="release-insights">
                      <div class="release-head">
                        <strong>{{ i18n.t('report.releaseInsights') }}</strong>
                        <span class="pill muted">{{ i18n.t('release.source.' + item.releaseInsights.source) }} - {{ i18n.t('release.confidence.' + item.releaseInsights.confidence) }}</span>
                      </div>
                      <p>{{ item.releaseInsights.summary }}</p>
                      @for (note of releaseNotes(item); track note) { <p class="tip-line">{{ note }}</p> }
                      @if (item.releaseInsights.url) { <a class="external-action" [href]="item.releaseInsights.url" target="_blank" rel="noreferrer"><mat-icon>open_in_new</mat-icon>{{ i18n.t('report.openReleaseNotes') }}</a> }
                    </div>
                  }
                </div>
                <div><h3>{{ i18n.t('report.signalsTips') }}</h3>
                  <p>{{ i18n.t('report.latest') }}: <strong>{{ item.latestVersion }}</strong></p>
                  @if (item.lastPublishedAt) { <p>{{ i18n.t('report.lastPublish') }}: {{ item.lastPublishedAt | date:'mediumDate' }}</p> }
                  @for (tip of tips(item); track tip) { <p class="tip-line">{{ tip }}</p> }
                  <div class="external-actions">
                    <a class="external-action" [href]="item.npmUrl" target="_blank" rel="noreferrer"><mat-icon>open_in_new</mat-icon>{{ i18n.t('report.openNpm') }}</a>
                    @if (item.repositoryUrl) { <a class="external-action" [href]="item.repositoryUrl" target="_blank" rel="noreferrer"><mat-icon>code</mat-icon>{{ i18n.t('report.repository') }}</a> }
                  </div>
                </div>
                <div><h3>{{ i18n.t('report.vulnerabilities') }}</h3>
                  <div class="vulnerability-list">
                    @for (vuln of item.vulnerabilities; track vuln.id) {
                      <article [class]="'vulnerability-card ' + severityClass(vuln.severity)">
                        <div><strong>{{ vuln.id }}</strong><span class="pill danger">{{ localizedSeverity(vuln.severity) }}</span></div>
                        <p>{{ vuln.summary }}</p>
                      </article>
                    } @empty {
                      <p>{{ i18n.t('report.noKnownVulnerabilities') }}</p>
                    }
                  </div>
                </div>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      </mat-card>
    }
  `,
})
export class ReportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly scans = inject(ScanService);
  readonly i18n = inject(I18nService);
  private readonly id = signal(this.route.snapshot.paramMap.get('scanId') ?? '');
  readonly report = computed(() => this.scans.getReport(this.id()));
  readonly chartText = '#9cadc8';
  readonly gridColor = 'rgba(148, 163, 184, .16)';
  readonly label = computed(() => {
    const score = this.report()?.scan.healthScore ?? 0;
    return score >= 90 ? this.i18n.t('health.excellent') : score >= 75 ? this.i18n.t('health.good') : score >= 50 ? this.i18n.t('health.needsAttention') : score >= 25 ? this.i18n.t('health.risky') : this.i18n.t('risk.critical');
  });
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
  riskData(): ChartConfiguration<'doughnut'>['data'] {
    const scan = this.report()!.scan;
    return { labels: [this.i18n.t('risk.low'), this.i18n.t('risk.medium'), this.i18n.t('risk.high'), this.i18n.t('risk.critical')], datasets: [{ data: [scan.lowRiskCount, scan.mediumRiskCount, scan.highRiskCount, scan.criticalRiskCount], backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'], borderWidth: 0 }] };
  }
  updateData(): ChartConfiguration<'bar'>['data'] {
    const items = this.report()!.items;
    return { labels: [this.i18n.t('update.patch'), this.i18n.t('update.minor'), this.i18n.t('update.major')], datasets: [{ data: ['patch', 'minor', 'major'].map((type) => items.filter((item) => item.updateType === type).length), backgroundColor: ['#2dd4bf', '#62a7ff', '#f97316'], borderRadius: 10, maxBarThickness: 44 }] };
  }
  dependencyTypeData(): ChartConfiguration<'bar'>['data'] {
    const scan = this.report()!.scan;
    return { labels: [this.i18n.t('report.production'), this.i18n.t('report.development')], datasets: [{ data: [scan.totalDependencies, scan.totalDevDependencies], backgroundColor: ['#62a7ff', '#2dd4bf'], borderRadius: 10, maxBarThickness: 44 }] };
  }
  tips(item: DependencyScanItem) {
    const tips = [];
    if (item.isVulnerable) tips.push(this.i18n.t('tip.vulnerable'));
    if (item.updateType === 'major') tips.push(this.i18n.t('tip.major'));
    if (item.updateType === 'minor') tips.push(this.i18n.t('tip.minor'));
    if (item.updateType === 'patch') tips.push(this.i18n.t('tip.patch'));
    if (item.isDeprecated) tips.push(this.i18n.t('tip.deprecated'));
    if (item.isPossiblyAbandoned) tips.push(this.i18n.t('tip.abandoned'));
    return tips.length ? tips : [this.i18n.t('tip.monitor')];
  }
  prediction(item: DependencyScanItem) {
    if (item.riskLevel === 'critical') return `${this.i18n.t('report.prediction')}: ${this.i18n.t('prediction.critical')}`;
    if (item.riskLevel === 'high') return `${this.i18n.t('report.prediction')}: ${this.i18n.t('prediction.high')}`;
    if (item.riskLevel === 'medium') return `${this.i18n.t('report.prediction')}: ${this.i18n.t('prediction.medium')}`;
    if (item.riskLevel === 'low') return `${this.i18n.t('report.prediction')}: ${this.i18n.t('prediction.low')}`;
    return `${this.i18n.t('report.prediction')}: ${this.i18n.t('prediction.none')}`;
  }
  localizedSeverity(severity: string) {
    return this.i18n.t(`risk.${String(severity ?? 'low').toLowerCase()}`);
  }
  severityClass(severity: string) {
    const level = String(severity ?? 'low').toLowerCase();
    return level === 'critical' || level === 'high' ? 'severe' : level === 'medium' ? 'moderate' : 'soft';
  }
  localizedRiskReason(item: DependencyScanItem) {
    if (item.isVulnerable) return this.i18n.t('reason.vulnerable');
    if (item.isDeprecated) return this.i18n.t('reason.deprecated');
    if (item.updateType === 'major') return this.i18n.t('reason.major');
    if (item.isPossiblyAbandoned) return this.i18n.t('reason.abandoned');
    if (item.isOutdated) return this.i18n.t('reason.outdated');
    return this.i18n.t('reason.none');
  }
  localizedExplanation(item: DependencyScanItem) {
    const dependencyKey = item.dependencyType === 'dependency' ? 'explanation.runtime' : 'explanation.dev';
    const base = this.i18n.t(dependencyKey);
    if (item.isVulnerable) return `${base} ${this.i18n.t('explanation.vulnerable')}`;
    if (item.isDeprecated) return `${base} ${this.i18n.t('explanation.deprecated')}`;
    if (item.updateType === 'major') return `${base} ${this.i18n.t('explanation.major')}`;
    if (item.isPossiblyAbandoned) return `${base} ${this.i18n.t('explanation.abandoned')}`;
    if (item.isOutdated) return `${base} ${this.i18n.t('explanation.outdated')}`;
    return `${base} ${this.i18n.t('explanation.none')}`;
  }
  remediationSteps(item: DependencyScanItem) {
    const steps = [];
    if (item.isVulnerable || item.riskLevel === 'critical' || item.riskLevel === 'high') {
      steps.push(this.i18n.t('remediation.branch'));
      steps.push(this.i18n.t('remediation.update'));
      steps.push(this.i18n.t(item.dependencyType === 'dependency' ? 'remediation.runtimeTests' : 'remediation.devTests'));
      steps.push(this.i18n.t('remediation.rescan'));
      return steps;
    }
    if (item.updateType === 'major') {
      steps.push(this.i18n.t('remediation.readChangelog'));
      steps.push(this.i18n.t('remediation.migration'));
      steps.push(this.i18n.t('remediation.smoke'));
      return steps;
    }
    if (item.isDeprecated || item.isPossiblyAbandoned) {
      steps.push(this.i18n.t('remediation.findReplacement'));
      steps.push(this.i18n.t('remediation.compareAlternatives'));
      steps.push(this.i18n.t('remediation.planMigration'));
      return steps;
    }
    steps.push(this.i18n.t('remediation.batch'));
    steps.push(this.i18n.t('remediation.ci'));
    return steps;
  }
  updateImpact(item: DependencyScanItem) {
    if (item.updateType === 'major') return this.i18n.t('impact.major');
    if (item.updateType === 'minor') return this.i18n.t('impact.minor');
    if (item.updateType === 'patch') return this.i18n.t('impact.patch');
    return this.i18n.t('impact.none');
  }
  majorChanges(item: DependencyScanItem) {
    const changes = [
      `${this.i18n.t('impact.versionJump')}: ${item.currentVersion} -> ${item.latestVersion}.`,
    ];
    if (item.isVulnerable) changes.push(this.i18n.t('impact.securityFixes'));
    if (item.updateType === 'major') {
      changes.push(this.i18n.t('impact.breakingApi'));
      changes.push(item.dependencyType === 'dependency' ? this.i18n.t('impact.runtimeSurface') : this.i18n.t('impact.devSurface'));
    }
    if (item.updateType === 'minor') changes.push(this.i18n.t('impact.behaviorChanges'));
    if (item.updateType === 'patch') changes.push(this.i18n.t('impact.patchNotes'));
    if (item.isDeprecated) changes.push(this.i18n.t('impact.deprecatedPath'));
    if (item.repositoryUrl) changes.push(this.i18n.t('impact.checkRepository'));
    return changes;
  }
  releaseNotes(item: DependencyScanItem) {
    const insights = item.releaseInsights;
    if (!insights) return [];
    return [
      ...insights.breakingChanges.map((note) => `${this.i18n.t('release.breaking')}: ${note}`),
      ...insights.migrationNotes.map((note) => `${this.i18n.t('release.migration')}: ${note}`),
      ...insights.securityNotes.map((note) => `${this.i18n.t('release.security')}: ${note}`),
    ].slice(0, 8);
  }
  healthTone(score: number) { return score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad'; }
  copy(command: string) { navigator.clipboard?.writeText(command); }
}
