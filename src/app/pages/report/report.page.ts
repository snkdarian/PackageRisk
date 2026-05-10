import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { DependencyScanItem, RiskLevel, UpdateType } from '../../core/models';
import { ScanService } from '../../core/scan.service';
import { HealthScoreComponent } from '../../shared/health-score.component';
import { RiskBadgeComponent } from '../../shared/risk-badge.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-report-page',
  imports: [DatePipe, RouterLink, BaseChartDirective, MatButtonModule, MatCardModule, MatCheckboxModule, MatExpansionModule, MatIconModule, MatInputModule, MatSelectModule, MatTabsModule, MatTableModule, HealthScoreComponent, RiskBadgeComponent, StatCardComponent],
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
      <mat-tab-group class="report-tabs" animationDuration="160ms">
        <mat-tab [label]="i18n.t('report.tabOverview')">
          <section class="tab-panel">
            <section class="report-action-grid">
              <mat-card [class]="'triage-card ' + triageTone()">
                <span class="section-kicker">{{ i18n.t('report.triage') }}</span>
                <h2>{{ triageTitle() }}</h2>
                <p>{{ triageText() }}</p>
                <div class="triage-pills">
                  <span class="metric-badge risk critical bad">{{ fixNowItems().length }} {{ i18n.t('report.fixNow') }}</span>
                  <span class="metric-badge risk high warn">{{ planItems().length }} {{ i18n.t('report.planThisSprint') }}</span>
                  <span class="metric-badge risk clear">{{ monitorItems().length }} {{ i18n.t('report.monitor') }}</span>
                </div>
              </mat-card>
              @if (previousComparison()) {
                <mat-card class="mini-compare-card">
                  <span class="section-kicker">{{ i18n.t('report.previousScan') }}</span>
                  <h2>{{ signed(previousComparison()!.healthDelta) }} {{ i18n.t('compare.points') }}</h2>
                  <p>{{ previousComparison()!.newRisks.length }} {{ i18n.t('compare.newRisks') }} / {{ previousComparison()!.fixedRisks.length }} {{ i18n.t('compare.fixedRisks') }}</p>
                  <a mat-flat-button class="mini-action" [routerLink]="['/reports/compare', previousComparison()!.previousScan.id, previousComparison()!.currentScan.id]"><mat-icon>compare_arrows</mat-icon>{{ i18n.t('history.compare') }}</a>
                </mat-card>
              }
            </section>
            <section class="report-summary">
              <mat-card class="health-panel">
                <h2>{{ i18n.t('report.overallHealth') }}</h2>
                <app-health-score [score]="report()!.scan.healthScore" [size]="96" />
              </mat-card>
              <app-stat-card [label]="i18n.t('report.totalDependencies')" [value]="report()!.scan.totalDependencies + report()!.scan.totalDevDependencies" icon="inventory_2" [trend]="i18n.t('report.monitored')" tone="blue" />
              <app-stat-card [label]="i18n.t('report.outdated')" [value]="report()!.scan.outdatedCount" icon="update" [trend]="report()!.scan.outdatedCount ? i18n.t('report.needsUpdate') : i18n.t('report.noneFound')" [tone]="report()!.scan.outdatedCount ? 'warn' : 'good'" />
              <app-stat-card [label]="i18n.t('report.vulnerable')" [value]="report()!.scan.vulnerableCount" icon="gpp_bad" [trend]="report()!.scan.vulnerableCount ? i18n.t('report.needsReview') : i18n.t('report.noneFound')" [tone]="report()!.scan.vulnerableCount ? 'bad' : 'good'" />
              <app-stat-card [label]="i18n.t('report.deprecated')" [value]="report()!.scan.deprecatedCount" icon="warning" [trend]="report()!.scan.deprecatedCount ? i18n.t('report.needsReplacement') : i18n.t('report.noneFound')" [tone]="report()!.scan.deprecatedCount ? 'warn' : 'good'" />
            </section>
            <section class="dashboard-grid">
              <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.riskDistribution') }}</h2><span>{{ i18n.t('report.severity') }}</span></div><canvas baseChart [data]="riskData()" [options]="doughnutOptions" type="doughnut"></canvas></mat-card>
              <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('dashboard.updateTypes') }}</h2><span>{{ i18n.t('report.impact') }}</span></div><canvas baseChart [data]="updateData()" [options]="barOptions" type="bar"></canvas></mat-card>
              <mat-card class="chart-card"><div class="card-head"><h2>{{ i18n.t('report.dependencyTypes') }}</h2><span>{{ i18n.t('report.scope') }}</span></div><canvas baseChart [data]="dependencyTypeData()" [options]="barOptions" type="bar"></canvas></mat-card>
            </section>
          </section>
        </mat-tab>
        <mat-tab [label]="i18n.t('report.tabActions')">
          <section class="tab-panel">
            <section class="action-lanes">
              @for (lane of actionLanes(); track lane.key) {
                <mat-card [class]="'action-lane ' + lane.tone">
                  <div>
                    <span class="section-kicker">{{ packageCountLabel(lane.count) }}</span>
                    <h2>{{ lane.title }}</h2>
                    <p>{{ lane.text }}</p>
                  </div>
                  <span class="lane-dot">{{ lane.count }}</span>
                </mat-card>
              }
            </section>
            <mat-card class="table-card">
              <div class="card-head"><h2>{{ i18n.t('report.recommendedActions') }}</h2><span>{{ packageCountLabel(fixNowItems().length + planItems().length + maintenanceItems().length) }}</span></div>
              <div class="action-list">
                @for (item of prioritizedItems(); track item.id) {
                  <article [class]="'action-item ' + actionTone(item)">
                    <div>
                      <strong>{{ item.packageName }}</strong>
                      <p>{{ actionLabel(item) }} - {{ localizedRiskReason(item) }}</p>
                    </div>
                    <span>{{ item.currentVersion }} -> {{ item.latestVersion }}</span>
                  </article>
                } @empty {
                  <div class="empty-state inline-empty"><mat-icon>task_alt</mat-icon><h2>{{ i18n.t('report.noActions') }}</h2><p>{{ i18n.t('report.noActionsText') }}</p></div>
                }
              </div>
            </mat-card>
          </section>
        </mat-tab>
        <mat-tab [label]="i18n.t('report.tabUpdatePlanner')">
          <section class="tab-panel">
            <section class="planner-grid">
              <mat-card class="table-card">
                <div class="card-head">
                  <h2>{{ i18n.t('report.updatePlanner') }}</h2>
                  <span>{{ selectedUpdateItems().length }} / {{ updatableItems().length }} {{ i18n.t('report.selected') }}</span>
                </div>
                <div class="planner-actions">
                  <button mat-stroked-button type="button" (click)="selectRecommendedUpdates()"><mat-icon>playlist_add_check</mat-icon>{{ i18n.t('report.selectRecommended') }}</button>
                  <button mat-stroked-button type="button" (click)="clearUpdateSelection()"><mat-icon>remove_done</mat-icon>{{ i18n.t('report.clearSelection') }}</button>
                  <button mat-stroked-button type="button" (click)="saveUpdatePlan()"><mat-icon>save</mat-icon>{{ i18n.t('report.savePlan') }}</button>
                  @if (hasSavedUpdatePlan()) {
                    <button mat-stroked-button type="button" (click)="restoreUpdatePlan()"><mat-icon>restore</mat-icon>{{ i18n.t('report.restorePlan') }}</button>
                  }
                </div>
                <div [class]="'planner-summary ' + selectedUpdateTone()">
                  <div>
                    <span class="section-kicker">{{ i18n.t('report.selectionSummary') }}</span>
                    <strong>{{ selectedUpdateSummary() }}</strong>
                    <p>{{ selectedUpdateGuidance() }}</p>
                  </div>
                  <div class="planner-summary-metrics">
                    <span><strong>{{ selectedUpdateItems().length }}</strong>{{ i18n.t('report.selected') }}</span>
                    <span><strong>{{ selectedMajorUpdates() }}</strong>{{ i18n.t('update.major') }}</span>
                    <span><strong>{{ selectedRiskyUpdates() }}</strong>{{ i18n.t('report.highRiskShort') }}</span>
                  </div>
                </div>
                <div class="planner-list">
                  @if (updatableItems().length) {
                    <div class="planner-header">
                      <span>{{ i18n.t('table.project') }}</span>
                      <span>{{ i18n.t('impact.versionJump') }}</span>
                      <span>{{ i18n.t('report.packageRisk') }}</span>
                      <span>{{ i18n.t('report.updateType') }}</span>
                      <span>{{ i18n.t('report.impact') }}</span>
                    </div>
                  }
                  @for (item of updatableItems(); track item.id) {
                    <article [class]="'planner-item ' + updateImpactClass(item)">
                      <mat-checkbox [checked]="isUpdateSelected(item.id)" (change)="toggleUpdate(item.id, $event.checked)">
                        <strong>{{ item.packageName }}</strong>
                      </mat-checkbox>
                      <span class="planner-version">{{ item.currentRange }} -> {{ plannedRange(item) }}</span>
                      <app-risk-badge [level]="item.riskLevel" />
                      <span [class]="'metric-badge update ' + item.updateType">{{ i18n.t('update.' + item.updateType) }}</span>
                      <span class="planner-note">{{ item.updateType === 'major' ? i18n.t('report.manualTesting') : actionLabel(item) }}</span>
                    </article>
                  } @empty {
                    <div class="empty-state inline-empty"><mat-icon>task_alt</mat-icon><h2>{{ i18n.t('report.noUpdatablePackages') }}</h2><p>{{ i18n.t('report.noUpdatablePackagesText') }}</p></div>
                  }
                </div>
              </mat-card>
              <mat-card class="table-card planner-preview">
                <div class="card-head">
                  <h2>{{ i18n.t('report.updatedPackageJson') }}</h2>
                  <span>{{ packageJsonStatus() }}</span>
                </div>
                <div class="planner-actions">
                  <button mat-flat-button class="mini-action" type="button" (click)="copyUpdatedPackageJson()"><mat-icon>content_copy</mat-icon>{{ i18n.t('common.copy') }}</button>
                  <button mat-flat-button class="mini-action" type="button" (click)="downloadUpdatedPackageJson()"><mat-icon>download</mat-icon>{{ i18n.t('report.downloadJson') }}</button>
                </div>
                <code>{{ updatedPackageJsonText() }}</code>
              </mat-card>
            </section>
            <section class="planner-grid planner-secondary">
              <mat-card class="table-card">
                <div class="card-head"><h2>{{ i18n.t('report.updateDiff') }}</h2><span>{{ packageCountLabel(selectedUpdateItems().length) }}</span></div>
                <div class="diff-section">
                  <h3>{{ i18n.t('report.production') }}</h3>
                  @for (item of selectedProdUpdates(); track item.id) {
                    <p [class]="'diff-line ' + updateImpactClass(item)"><strong>{{ item.packageName }}</strong><span>{{ item.currentRange }} -> {{ plannedRange(item) }}</span>@if (item.updateType === 'major') { <em>{{ i18n.t('report.manualTesting') }}</em> }</p>
                  } @empty {
                    <p class="muted-line">{{ i18n.t('report.noProductionUpdates') }}</p>
                  }
                </div>
                <div class="diff-section">
                  <h3>{{ i18n.t('report.development') }}</h3>
                  @for (item of selectedDevUpdates(); track item.id) {
                    <p [class]="'diff-line ' + updateImpactClass(item)"><strong>{{ item.packageName }}</strong><span>{{ item.currentRange }} -> {{ plannedRange(item) }}</span>@if (item.updateType === 'major') { <em>{{ i18n.t('report.manualTesting') }}</em> }</p>
                  } @empty {
                    <p class="muted-line">{{ i18n.t('report.noDevelopmentUpdates') }}</p>
                  }
                </div>
              </mat-card>
              <mat-card class="table-card">
                <div class="card-head"><h2>{{ i18n.t('report.installCommands') }}</h2><span>{{ report()!.project.packageManager }}</span></div>
                <div class="command-list">
                  @if (prodInstallCommand()) {
                    <div><span class="section-kicker">{{ i18n.t('report.production') }}</span><code>{{ prodInstallCommand() }}</code><button mat-button type="button" (click)="copy(prodInstallCommand())">{{ i18n.t('common.copy') }}</button></div>
                  }
                  @if (devInstallCommand()) {
                    <div><span class="section-kicker">{{ i18n.t('report.development') }}</span><code>{{ devInstallCommand() }}</code><button mat-button type="button" (click)="copy(devInstallCommand())">{{ i18n.t('common.copy') }}</button></div>
                  }
                  @if (!prodInstallCommand() && !devInstallCommand()) {
                    <div class="empty-state inline-empty"><mat-icon>terminal</mat-icon><h2>{{ i18n.t('report.noCommands') }}</h2><p>{{ i18n.t('report.noCommandsText') }}</p></div>
                  }
                </div>
              </mat-card>
            </section>
          </section>
        </mat-tab>
        <mat-tab [label]="i18n.t('report.tabPackages')">
          <section class="tab-panel">
            <mat-card class="table-card">
        <div class="card-head"><h2>{{ i18n.t('table.dependencies') }}</h2><span>{{ filteredItems().length }} / {{ report()!.items.length }} {{ i18n.t('report.packages') }}</span></div>
        <div class="report-tools">
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('report.searchPackage') }}</mat-label><input matInput [value]="search()" (input)="search.set($any($event.target).value)" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('report.riskFilter') }}</mat-label><mat-select [value]="riskFilter()" (selectionChange)="riskFilter.set($event.value)"><mat-option value="all">{{ i18n.t('dashboard.range.all') }}</mat-option><mat-option value="critical">{{ i18n.t('risk.critical') }}</mat-option><mat-option value="high">{{ i18n.t('risk.high') }}</mat-option><mat-option value="medium">{{ i18n.t('risk.medium') }}</mat-option><mat-option value="low">{{ i18n.t('risk.low') }}</mat-option><mat-option value="none">{{ i18n.t('risk.none') }}</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('report.updateFilter') }}</mat-label><mat-select [value]="updateFilter()" (selectionChange)="updateFilter.set($event.value)"><mat-option value="all">{{ i18n.t('dashboard.range.all') }}</mat-option><mat-option value="major">{{ i18n.t('update.major') }}</mat-option><mat-option value="minor">{{ i18n.t('update.minor') }}</mat-option><mat-option value="patch">{{ i18n.t('update.patch') }}</mat-option><mat-option value="none">{{ i18n.t('update.none') }}</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ i18n.t('report.sortBy') }}</mat-label><mat-select [value]="sortBy()" (selectionChange)="sortBy.set($event.value)"><mat-option value="risk">{{ i18n.t('report.sort.risk') }}</mat-option><mat-option value="name">{{ i18n.t('report.sort.name') }}</mat-option><mat-option value="update">{{ i18n.t('report.sort.update') }}</mat-option></mat-select></mat-form-field>
        </div>
        <mat-accordion>
          @for (item of filteredItems(); track item.id) {
            <mat-expansion-panel [class]="'risk-panel ' + item.riskLevel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <span class="package-row-title">
                    <strong>{{ item.packageName }}</strong>
                    <small>{{ item.currentVersion }} -> {{ item.latestVersion }}</small>
                  </span>
                </mat-panel-title>
                <mat-panel-description>
                  <span class="score-chip">{{ item.riskScore }}/100</span>
                  <span class="badge-group"><small>{{ i18n.t('report.packageRisk') }}</small><app-risk-badge [level]="item.riskLevel" /></span>
                  <span class="badge-group"><small>{{ i18n.t('report.updateType') }}</small><span [class]="'metric-badge update ' + item.updateType">{{ i18n.t('update.' + item.updateType) }}</span></span>
                </mat-panel-description>
              </mat-expansion-panel-header>
              <div class="expanded-grid">
                <div><h3>{{ i18n.t('report.primarySignal') }}</h3><p>{{ localizedRiskReason(item) }}</p><p>{{ localizedExplanation(item) }}</p><p class="prediction-line">{{ prediction(item) }}</p></div>
                <div><h3>{{ i18n.t('report.recommendedCommand') }}</h3><code>{{ item.updateCommand }}</code><button mat-button (click)="copy(item.updateCommand)">{{ i18n.t('common.copy') }}</button><h3>{{ i18n.t('report.remediationPlan') }}</h3>@for (step of remediationSteps(item); track step) { <p class="tip-line">{{ step }}</p> }</div>
                <div><h3>{{ i18n.t('report.updateImpact') }}</h3>
                  <div class="version-strip">
                    <span><small>{{ i18n.t('report.current') }}</small><strong>{{ item.currentVersion }}</strong></span>
                    <mat-icon>arrow_forward</mat-icon>
                    <span><small>{{ i18n.t('report.latest') }}</small><strong>{{ item.latestVersion }}</strong></span>
                  </div>
                  <p [class]="'impact-note ' + updateImpactClass(item)">{{ updateImpact(item) }}</p>
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
          } @empty {
            <div class="empty-state inline-empty"><mat-icon>filter_alt_off</mat-icon><h2>{{ i18n.t('report.noFilteredPackages') }}</h2><p>{{ i18n.t('report.noFilteredPackagesText') }}</p></div>
          }
        </mat-accordion>
            </mat-card>
          </section>
        </mat-tab>
        <mat-tab [label]="i18n.t('report.tabVulnerabilities')">
          <section class="tab-panel">
            <mat-card class="table-card">
              <div class="card-head"><h2>{{ i18n.t('report.vulnerabilities') }}</h2><span>{{ packageCountLabel(vulnerableItems().length) }}</span></div>
              <div class="vulnerability-list report-list">
                @for (item of vulnerableItems(); track item.id) {
                  <article class="vulnerability-card severe">
                    <div><strong>{{ item.packageName }}</strong><app-risk-badge [level]="item.riskLevel" /></div>
                    <p>{{ localizedRiskReason(item) }}</p>
                    @for (vuln of item.vulnerabilities; track vuln.id) {
                      <p class="tip-line">{{ vuln.id }} - {{ vuln.summary }}</p>
                    }
                  </article>
                } @empty {
                  <div class="empty-state inline-empty"><mat-icon>verified_user</mat-icon><h2>{{ i18n.t('report.noKnownVulnerabilities') }}</h2><p>{{ i18n.t('report.noVulnerabilitiesText') }}</p></div>
                }
              </div>
            </mat-card>
          </section>
        </mat-tab>
        <mat-tab [label]="i18n.t('report.tabReleaseNotes')">
          <section class="tab-panel">
            <mat-card class="table-card">
              <div class="card-head"><h2>{{ i18n.t('report.releaseInsights') }}</h2><span>{{ packageCountLabel(releaseInsightItems().length) }}</span></div>
              <div class="release-list">
                @for (item of releaseInsightItems(); track item.id) {
                  <article class="release-insights">
                    <div class="release-head">
                      <strong>{{ item.packageName }} <small>{{ item.currentVersion }} -> {{ item.latestVersion }}</small></strong>
                      <span class="pill muted">{{ i18n.t('release.source.' + item.releaseInsights!.source) }} - {{ i18n.t('release.confidence.' + item.releaseInsights!.confidence) }}</span>
                    </div>
                    <p>{{ item.releaseInsights!.summary }}</p>
                    @for (note of releaseNotes(item); track note) { <p class="tip-line">{{ note }}</p> }
                    @if (item.releaseInsights!.url) { <a class="external-action" [href]="item.releaseInsights!.url" target="_blank" rel="noreferrer"><mat-icon>open_in_new</mat-icon>{{ i18n.t('report.openReleaseNotes') }}</a> }
                  </article>
                } @empty {
                  <div class="empty-state inline-empty"><mat-icon>article</mat-icon><h2>{{ i18n.t('report.noReleaseInsights') }}</h2><p>{{ i18n.t('report.noReleaseInsightsText') }}</p></div>
                }
              </div>
            </mat-card>
          </section>
        </mat-tab>
      </mat-tab-group>
    }
  `,
})
export class ReportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly scans = inject(ScanService);
  readonly i18n = inject(I18nService);
  private readonly id = signal(this.route.snapshot.paramMap.get('scanId') ?? '');
  readonly report = computed(() => this.scans.getReport(this.id()));
  readonly selectedUpdateIds = signal<string[]>([]);
  readonly savedUpdatePlanIds = signal<string[]>([]);
  private readonly selectionInitializedFor = signal('');
  readonly search = signal('');
  readonly riskFilter = signal<RiskLevel | 'all'>('all');
  readonly updateFilter = signal<UpdateType | 'all'>('all');
  readonly sortBy = signal<'risk' | 'name' | 'update'>('risk');
  readonly previousComparison = computed(() => {
    const scan = this.report()?.scan;
    if (!scan) return null;
    const previousId = this.scans.getPreviousScanId(scan);
    return previousId ? this.scans.compareScans(previousId, scan.id) : null;
  });
  readonly filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    return [...(this.report()?.items ?? [])]
      .filter((item) => !term || item.packageName.toLowerCase().includes(term))
      .filter((item) => this.riskFilter() === 'all' || item.riskLevel === this.riskFilter())
      .filter((item) => this.updateFilter() === 'all' || item.updateType === this.updateFilter())
      .sort((a, b) => this.sortBy() === 'name' ? a.packageName.localeCompare(b.packageName) : this.sortBy() === 'update' ? updateRank(b.updateType) - updateRank(a.updateType) : b.riskScore - a.riskScore);
  });
  readonly fixNowItems = computed(() => (this.report()?.items ?? []).filter((item) => item.riskLevel === 'critical' || item.riskLevel === 'high' || item.isVulnerable));
  readonly planItems = computed(() => (this.report()?.items ?? []).filter((item) => !this.fixNowItems().includes(item) && (item.updateType === 'major' || item.riskLevel === 'medium')));
  readonly monitorItems = computed(() => (this.report()?.items ?? []).filter((item) => item.riskLevel === 'low' || item.riskLevel === 'none'));
  readonly safePatchItems = computed(() => (this.report()?.items ?? []).filter((item) => item.updateType === 'patch' && !item.isVulnerable && item.riskLevel !== 'critical' && item.riskLevel !== 'high'));
  readonly maintenanceItems = computed(() => (this.report()?.items ?? []).filter((item) => !item.isVulnerable && (item.updateType === 'patch' || item.updateType === 'minor') && (item.riskLevel === 'low' || item.riskLevel === 'none')));
  readonly stableItems = computed(() => (this.report()?.items ?? []).filter((item) => !item.isOutdated && !item.isVulnerable && item.riskLevel === 'none'));
  readonly actionLanes = computed(() => [
    { key: 'urgent', tone: 'bad', count: this.fixNowItems().length, title: this.i18n.t('report.actionUrgent'), text: this.i18n.t('report.actionUrgentText') },
    { key: 'planned', tone: 'warn', count: this.planItems().length, title: this.i18n.t('report.actionPlanned'), text: this.i18n.t('report.actionPlannedText') },
    { key: 'maintenance', tone: 'good', count: this.maintenanceItems().length, title: this.i18n.t('report.actionMaintenance'), text: this.i18n.t('report.actionMaintenanceText') },
    { key: 'stable', tone: 'neutral', count: this.stableItems().length, title: this.i18n.t('report.actionStable'), text: this.i18n.t('report.actionStableText') },
  ]);
  readonly prioritizedItems = computed(() => [...this.fixNowItems(), ...this.planItems(), ...this.maintenanceItems()]);
  readonly vulnerableItems = computed(() => (this.report()?.items ?? []).filter((item) => item.isVulnerable || item.vulnerabilities.length));
  readonly releaseInsightItems = computed(() => (this.report()?.items ?? []).filter((item) => item.releaseInsights));
  readonly updatableItems = computed(() => (this.report()?.items ?? []).filter((item) => item.isOutdated && item.latestVersion && item.latestVersion !== item.currentVersion && item.updateType !== 'none' && item.updateType !== 'unknown'));
  readonly recommendedUpdateItems = computed(() => this.updatableItems().filter((item) => item.isVulnerable || item.updateType === 'patch' || item.updateType === 'minor'));
  readonly selectedUpdateItems = computed(() => {
    const selected = new Set(this.selectedUpdateIds());
    return this.updatableItems().filter((item) => selected.has(item.id));
  });
  readonly updatedPackageJson = computed(() => buildUpdatedPackageJson(this.report()?.project.packageJson, this.report()?.items ?? [], this.selectedUpdateItems()));
  readonly updatedPackageJsonText = computed(() => JSON.stringify(this.updatedPackageJson(), null, 2));
  readonly selectedProdUpdates = computed(() => this.selectedUpdateItems().filter((item) => item.dependencyType === 'dependency'));
  readonly selectedDevUpdates = computed(() => this.selectedUpdateItems().filter((item) => item.dependencyType === 'devDependency'));
  readonly selectedMajorUpdates = computed(() => this.selectedUpdateItems().filter((item) => item.updateType === 'major').length);
  readonly selectedRiskyUpdates = computed(() => this.selectedUpdateItems().filter((item) => item.isVulnerable || item.riskLevel === 'critical' || item.riskLevel === 'high').length);
  readonly selectedPatchMinorUpdates = computed(() => this.selectedUpdateItems().filter((item) => item.updateType === 'patch' || item.updateType === 'minor').length);
  readonly hasSavedUpdatePlan = computed(() => {
    const saved = new Set(this.savedUpdatePlanIds());
    return this.updatableItems().some((item) => saved.has(item.id));
  });
  readonly prodInstallCommand = computed(() => buildInstallCommand(this.report()?.project.packageManager ?? 'npm', this.selectedProdUpdates(), false));
  readonly devInstallCommand = computed(() => buildInstallCommand(this.report()?.project.packageManager ?? 'npm', this.selectedDevUpdates(), true));
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
  constructor() {
    effect(() => {
      const scanId = this.report()?.scan.id ?? '';
      if (!scanId || this.selectionInitializedFor() === scanId) return;
      const saved = loadUpdatePlan(scanId);
      this.savedUpdatePlanIds.set(saved);
      this.selectedUpdateIds.set(saved.length ? saved : this.recommendedUpdateItems().map((item) => item.id));
      this.selectionInitializedFor.set(scanId);
    });
  }
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
    if (item.isPossiblyAbandoned) return this.i18n.t('reason.abandoned');
    if (item.updateType === 'major') return this.i18n.t('reason.major');
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
  updateImpactClass(item: DependencyScanItem) {
    if (item.updateType === 'major') return 'severe';
    if (item.updateType === 'minor') return 'moderate';
    if (item.updateType === 'patch') return 'soft';
    return item.isVulnerable ? 'severe' : 'neutral';
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
  triageTone() { return this.fixNowItems().length ? 'bad' : this.planItems().length ? 'warn' : 'good'; }
  triageTitle() {
    if (this.fixNowItems().length) return this.i18n.t('report.triageFixNow');
    if (this.planItems().length) return this.i18n.t('report.triagePlan');
    return this.i18n.t('report.triageHealthy');
  }
  triageText() {
    if (this.fixNowItems().length) return this.i18n.t('report.triageFixNowText');
    if (this.planItems().length) return this.i18n.t('report.triagePlanText');
    return this.i18n.t('report.triageHealthyText');
  }
  signed(value: number) { return value > 0 ? `+${value}` : String(value); }
  packageCountLabel(count: number) { return `${count} ${count === 1 ? this.i18n.t('report.packageSingular') : this.i18n.t('report.packages')}`; }
  actionTone(item: DependencyScanItem) {
    if (this.fixNowItems().includes(item)) return 'bad';
    if (this.planItems().includes(item)) return 'warn';
    return 'good';
  }
  actionLabel(item: DependencyScanItem) {
    if (this.fixNowItems().includes(item)) return this.i18n.t('report.actionUrgent');
    if (this.planItems().includes(item)) return this.i18n.t('report.actionPlanned');
    return this.i18n.t('report.actionMaintenance');
  }
  isUpdateSelected(id: string) { return this.selectedUpdateIds().includes(id); }
  toggleUpdate(id: string, checked: boolean) {
    const selected = new Set(this.selectedUpdateIds());
    checked ? selected.add(id) : selected.delete(id);
    this.selectedUpdateIds.set([...selected]);
  }
  selectRecommendedUpdates() { this.selectedUpdateIds.set(this.recommendedUpdateItems().map((item) => item.id)); }
  clearUpdateSelection() { this.selectedUpdateIds.set([]); }
  saveUpdatePlan() {
    const scanId = this.report()?.scan.id;
    if (!scanId) return;
    const ids = this.selectedUpdateIds();
    localStorage.setItem(updatePlanStorageKey(scanId), JSON.stringify(ids));
    this.savedUpdatePlanIds.set(ids);
  }
  restoreUpdatePlan() {
    const saved = new Set(this.savedUpdatePlanIds());
    this.selectedUpdateIds.set(this.updatableItems().filter((item) => saved.has(item.id)).map((item) => item.id));
  }
  plannedRange(item: DependencyScanItem) { return preserveRangePrefix(item.currentRange, item.latestVersion); }
  packageJsonStatus() {
    const count = this.selectedUpdateItems().length;
    return count ? `${count} ${this.i18n.t('report.changesReady')}` : this.i18n.t('report.noChangesSelected');
  }
  selectedUpdateTone() {
    if (!this.selectedUpdateItems().length) return 'neutral';
    if (this.selectedRiskyUpdates() || this.selectedMajorUpdates()) return 'warn';
    return 'good';
  }
  selectedUpdateSummary() {
    const count = this.selectedUpdateItems().length;
    if (!count) return this.i18n.t('report.noUpdatesSelected');
    if (this.selectedRiskyUpdates()) return this.i18n.t('report.selectionRisky');
    if (this.selectedMajorUpdates()) return this.i18n.t('report.selectionMajor');
    return this.i18n.t('report.selectionLowRisk');
  }
  selectedUpdateGuidance() {
    if (!this.selectedUpdateItems().length) return this.i18n.t('report.selectionEmptyText');
    if (this.selectedRiskyUpdates()) return this.i18n.t('report.selectionRiskyText');
    if (this.selectedMajorUpdates()) return this.i18n.t('report.selectionMajorText');
    return this.i18n.t('report.selectionLowRiskText');
  }
  copyUpdatedPackageJson() { this.copy(this.updatedPackageJsonText()); }
  downloadUpdatedPackageJson() {
    const blob = new Blob([this.updatedPackageJsonText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'package.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  copy(command: string) { navigator.clipboard?.writeText(command); }
}

function updateRank(type: UpdateType) {
  return type === 'major' ? 4 : type === 'minor' ? 3 : type === 'patch' ? 2 : type === 'none' ? 1 : 0;
}

function buildUpdatedPackageJson(source: Record<string, unknown> | undefined, allItems: DependencyScanItem[], selectedItems: DependencyScanItem[]) {
  const base = source ? structuredClone(source) as Record<string, any> : buildPackageJsonFromItems(allItems);
  for (const item of selectedItems) {
    const section = item.dependencyType === 'dependency' ? 'dependencies' : 'devDependencies';
    base[section] = { ...(base[section] ?? {}) };
    base[section][item.packageName] = preserveRangePrefix(String(base[section][item.packageName] ?? item.currentRange), item.latestVersion);
  }
  return base;
}

function buildPackageJsonFromItems(items: DependencyScanItem[]) {
  const packageJson: Record<string, any> = { dependencies: {}, devDependencies: {} };
  for (const item of items) {
    const section = item.dependencyType === 'dependency' ? 'dependencies' : 'devDependencies';
    packageJson[section][item.packageName] = item.currentRange;
  }
  if (!Object.keys(packageJson['dependencies']).length) delete packageJson['dependencies'];
  if (!Object.keys(packageJson['devDependencies']).length) delete packageJson['devDependencies'];
  return packageJson;
}

function preserveRangePrefix(currentRange: string, latestVersion: string) {
  const prefix = currentRange.match(/^(\^|~|>=|>|<=|<|=)/)?.[0] ?? '';
  return `${prefix}${latestVersion}`;
}

function buildInstallCommand(manager: string, items: DependencyScanItem[], dev: boolean) {
  if (!items.length) return '';
  const packages = items.map((item) => `${item.packageName}@${item.latestVersion}`).join(' ');
  if (manager === 'yarn') return `yarn add ${dev ? '-D ' : ''}${packages}`;
  if (manager === 'pnpm') return `pnpm add ${dev ? '-D ' : ''}${packages}`;
  return `npm install ${dev ? '-D ' : ''}${packages}`;
}

function updatePlanStorageKey(scanId: string) {
  return `package-risk-update-plan:${scanId}`;
}

function loadUpdatePlan(scanId: string) {
  try {
    const value = localStorage.getItem(updatePlanStorageKey(scanId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
