import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ScanService } from '../../core/scan.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-compare-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (comparison()) {
      <section class="page-head page-hero row">
        <div>
          <span class="section-kicker">{{ i18n.t('compare.kicker') }}</span>
          <h1>{{ i18n.t('compare.title') }}</h1>
          <p>{{ comparison()!.previousScan.createdAt | date:'medium' }} -> {{ comparison()!.currentScan.createdAt | date:'medium' }}</p>
        </div>
        <a mat-flat-button class="primary-action compact" [routerLink]="['/reports', comparison()!.currentScan.id]"><mat-icon>article</mat-icon>{{ i18n.t('history.report') }}</a>
      </section>
      <section class="stats-grid">
        <mat-card class="stat-card"><p>{{ i18n.t('compare.previousHealth') }}</p><strong>{{ comparison()!.previousScan.healthScore }}</strong><small>{{ i18n.t('compare.beforeScan') }}</small></mat-card>
        <mat-card [class]="'stat-card ' + deltaTone()"><p>{{ i18n.t('compare.currentHealth') }}</p><strong>{{ comparison()!.currentScan.healthScore }}</strong><small>{{ signed(comparison()!.healthDelta) }} {{ i18n.t('compare.points') }}</small></mat-card>
        <mat-card class="stat-card good"><p>{{ i18n.t('compare.fixedRisks') }}</p><strong>{{ comparison()!.fixedRisks.length }}</strong><small>{{ i18n.t('compare.resolved') }}</small></mat-card>
        <mat-card class="stat-card red"><p>{{ i18n.t('compare.newRisks') }}</p><strong>{{ comparison()!.newRisks.length }}</strong><small>{{ i18n.t('compare.requireReview') }}</small></mat-card>
      </section>
      <section class="dashboard-grid compare-grid">
        <mat-card class="chart-card">
          <div class="card-head"><h2>{{ i18n.t('compare.packageChanges') }}</h2><span>{{ i18n.t('compare.realScans') }}</span></div>
          <div class="compare-list">
            <p><span class="metric-badge health good">{{ comparison()!.upgradedPackages.length }}</span>{{ i18n.t('compare.upgraded') }}</p>
            <p><span class="metric-badge health bad">{{ comparison()!.downgradedPackages.length }}</span>{{ i18n.t('compare.downgraded') }}</p>
            <p><span class="metric-badge risk critical bad">{{ comparison()!.newVulnerabilities.length }}</span>{{ i18n.t('compare.newVulnerabilities') }}</p>
            <p><span class="metric-badge risk clear">{{ comparison()!.resolvedVulnerabilities.length }}</span>{{ i18n.t('compare.resolvedVulnerabilities') }}</p>
          </div>
        </mat-card>
        <mat-card class="chart-card">
          <div class="card-head"><h2>{{ i18n.t('compare.newRisks') }}</h2><span>{{ comparison()!.newRisks.length }}</span></div>
          <div class="compare-list">
            @for (item of comparison()!.newRisks; track item.id) { <p><strong>{{ item.packageName }}</strong><span class="pill danger">{{ i18n.t('risk.' + item.riskLevel) }}</span></p> } @empty { <p>{{ i18n.t('compare.none') }}</p> }
          </div>
        </mat-card>
        <mat-card class="chart-card">
          <div class="card-head"><h2>{{ i18n.t('compare.fixedRisks') }}</h2><span>{{ comparison()!.fixedRisks.length }}</span></div>
          <div class="compare-list">
            @for (item of comparison()!.fixedRisks; track item.id) { <p><strong>{{ item.packageName }}</strong><span class="pill">{{ i18n.t('risk.' + item.riskLevel) }}</span></p> } @empty { <p>{{ i18n.t('compare.none') }}</p> }
          </div>
        </mat-card>
      </section>
    } @else {
      <mat-card class="empty-state"><h1>{{ i18n.t('compare.notFound') }}</h1><p>{{ i18n.t('compare.notFoundText') }}</p><a mat-flat-button class="primary-action" routerLink="/scans/history">{{ i18n.t('nav.history') }}</a></mat-card>
    }
  `,
})
export class ComparePage {
  private readonly route = inject(ActivatedRoute);
  private readonly scans = inject(ScanService);
  readonly i18n = inject(I18nService);
  readonly comparison = computed(() => this.scans.compareScans(
    this.route.snapshot.paramMap.get('previousScanId') ?? '',
    this.route.snapshot.paramMap.get('currentScanId') ?? '',
  ));
  deltaTone() { return (this.comparison()?.healthDelta ?? 0) >= 0 ? 'good' : 'bad'; }
  signed(value: number) { return value > 0 ? `+${value}` : String(value); }
}
