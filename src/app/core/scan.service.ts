import { Injectable, computed, signal } from '@angular/core';
import { DEMO_ITEMS, DEMO_SCANS } from './mock-data';
import { DependencyScan, DependencyScanItem, ScanComparison, ScanReport, Vulnerability } from './models';
import { ProjectService } from './project.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ScanService {
  readonly scans = signal<DependencyScan[]>([]);
  readonly items = signal<DependencyScanItem[]>([]);
  readonly recentScans = computed(() => [...this.scans()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8));

  constructor(
    private readonly supabase: SupabaseService,
    private readonly projects: ProjectService,
  ) {
    if (!this.supabase.client) {
      this.scans.set([...DEMO_SCANS]);
      this.items.set([...DEMO_ITEMS]);
    }
  }

  async loadHistory() {
    if (!this.supabase.client) return this.scans();
    const { data, error } = await this.supabase.client.from('dependency_scans').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    this.scans.set((data ?? []).map(mapScan));
    if (this.scans().length) await this.loadItems(this.scans().map((scan) => scan.id));
    return this.scans();
  }

  async loadItems(scanIds: string[]) {
    if (!this.supabase.client || !scanIds.length) return this.items();
    const { data, error } = await this.supabase.client.from('dependency_scan_items').select('*').in('scan_id', scanIds);
    if (error) throw error;
    this.items.set((data ?? []).map(mapItem));
    return this.items();
  }

  getScanById(scanId: string) {
    return this.scans().find((scan) => scan.id === scanId) ?? null;
  }

  getScanItems(scanId: string) {
    return this.items().filter((item) => item.scanId === scanId);
  }

  getScansByProject(projectId: string) {
    return this.scans()
      .filter((scan) => scan.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getPreviousScanId(scan: DependencyScan) {
    const projectScans = this.getScansByProject(scan.projectId);
    const index = projectScans.findIndex((entry) => entry.id === scan.id);
    return index >= 0 && projectScans[index + 1] ? projectScans[index + 1].id : null;
  }

  latestScanForProject(projectId: string) {
    return this.getScansByProject(projectId)[0] ?? null;
  }

  compareScans(previousScanId: string, currentScanId: string): ScanComparison | null {
    const previousScan = this.getScanById(previousScanId);
    const currentScan = this.getScanById(currentScanId);
    if (!previousScan || !currentScan) return null;
    const previousItems = this.getScanItems(previousScanId);
    const currentItems = this.getScanItems(currentScanId);
    const previousRisky = new Map(previousItems.filter(isRisky).map((item) => [item.packageName, item]));
    const currentRisky = new Map(currentItems.filter(isRisky).map((item) => [item.packageName, item]));
    return {
      previousScan,
      currentScan,
      previousItems,
      currentItems,
      healthDelta: currentScan.healthScore - previousScan.healthScore,
      fixedRisks: [...previousRisky.entries()].filter(([name]) => !currentRisky.has(name)).map(([, item]) => item),
      newRisks: [...currentRisky.entries()].filter(([name]) => !previousRisky.has(name)).map(([, item]) => item),
      upgradedPackages: currentItems.filter((current) => {
        const previous = previousItems.find((item) => item.packageName === current.packageName);
        return previous ? compareVersions(previous.currentVersion, current.currentVersion) < 0 : false;
      }),
      downgradedPackages: currentItems.filter((current) => {
        const previous = previousItems.find((item) => item.packageName === current.packageName);
        return previous ? compareVersions(previous.currentVersion, current.currentVersion) > 0 : false;
      }),
      newVulnerabilities: diffVulnerabilities(currentItems, previousItems),
      resolvedVulnerabilities: diffVulnerabilities(previousItems, currentItems),
    };
  }

  async runScan(projectId: string, packageJson: any, lockFileContent?: string) {
    if (this.supabase.client) {
      const { data, error } = await this.supabase.client.functions.invoke('analyze-dependencies', {
        body: { projectId, packageJson, lockFileContent },
      });
      if (error) throw error;
      if (!data?.scan?.id) throw new Error(data?.error ?? 'Scan completed without a report id.');
      await this.loadHistory();
      return data.scan.id as string;
    }

    const dependencies = Object.entries(packageJson.dependencies ?? {});
    const devDependencies = Object.entries(packageJson.devDependencies ?? {});
    const scanId = crypto.randomUUID();
    const generated = [...dependencies, ...devDependencies].map(([name, range], index): DependencyScanItem => {
      const isDev = index >= dependencies.length;
      const majorRisk = name.includes('lodash') || name.includes('axios') || name.includes('minimist');
      const riskLevel = majorRisk ? 'high' : index % 5 === 0 ? 'medium' : index % 3 === 0 ? 'low' : 'none';
      return {
        id: crypto.randomUUID(),
        scanId,
        projectId,
        userId: 'demo-user',
        packageName: name,
        currentRange: String(range),
        currentVersion: cleanVersion(String(range)),
        latestVersion: bumpVersion(String(range)),
        dependencyType: isDev ? 'devDependency' : 'dependency',
        updateType: majorRisk ? 'major' : index % 3 === 0 ? 'minor' : 'patch',
        riskLevel,
        riskScore: riskLevel === 'high' ? 80 : riskLevel === 'medium' ? 55 : riskLevel === 'low' ? 25 : 0,
        isOutdated: riskLevel !== 'none',
        isVulnerable: majorRisk,
        vulnerabilities: majorRisk ? [{ id: 'OSV-DEMO-001', summary: 'Demo vulnerability signal for risky packages.', severity: 'high' }] : [],
        isDeprecated: name.includes('request'),
        isPossiblyAbandoned: index % 7 === 0,
        riskReason: majorRisk ? 'Known ecosystem risk indicators were found for this package.' : 'Package metadata indicates an available update.',
        aiExplanation: 'Rule-based explanation: upgrade in a branch, run tests touching direct consumers, and review release notes before merging.',
        recommendedAction: `Update ${name} after reviewing changelog and test coverage.`,
        updateCommand: `npm install ${name}@latest`,
        npmUrl: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
        releaseInsights: {
          source: 'npm-metadata',
          summary: `${name} has a ${majorRisk ? 'major' : 'maintenance'} update path in demo mode.`,
          breakingChanges: majorRisk ? ['Demo signal: review breaking changes before updating this package.'] : [],
          migrationNotes: majorRisk ? ['Demo signal: test import and configuration changes after the update.'] : [],
          securityNotes: majorRisk ? ['Demo signal: security-sensitive package in this sample scan.'] : [],
          confidence: 'low',
        },
      };
    });
    const critical = generated.filter((item) => item.riskLevel === 'critical').length;
    const high = generated.filter((item) => item.riskLevel === 'high').length;
    const medium = generated.filter((item) => item.riskLevel === 'medium').length;
    const low = generated.filter((item) => item.riskLevel === 'low').length;
    const scan: DependencyScan = {
      id: scanId,
      projectId,
      userId: 'demo-user',
      status: 'completed',
      healthScore: Math.max(0, 100 - critical * 25 - high * 15 - medium * 8 - low * 3),
      totalDependencies: dependencies.length,
      totalDevDependencies: devDependencies.length,
      outdatedCount: generated.filter((item) => item.isOutdated).length,
      vulnerableCount: generated.filter((item) => item.isVulnerable).length,
      deprecatedCount: generated.filter((item) => item.isDeprecated).length,
      abandonedCount: generated.filter((item) => item.isPossiblyAbandoned).length,
      criticalRiskCount: critical,
      highRiskCount: high,
      mediumRiskCount: medium,
      lowRiskCount: low,
      createdAt: new Date().toISOString(),
    };
    this.scans.update((scans) => [scan, ...scans]);
    this.items.update((items) => [...generated, ...items]);
    return scanId;
  }

  getReport(scanId: string): ScanReport | null {
    const scan = this.scans().find((entry) => entry.id === scanId) ?? this.scans()[0];
    const project = scan ? this.projects.getProjectById(scan.projectId) : null;
    if (!scan || !project) return null;
    return { scan, project, items: this.items().filter((item) => item.scanId === scan.id) };
  }
}

function cleanVersion(range: string) {
  return range.match(/\d+\.\d+\.\d+/)?.[0] ?? range;
}

function isRisky(item: DependencyScanItem) {
  return item.riskLevel === 'critical' || item.riskLevel === 'high' || item.isVulnerable;
}

function diffVulnerabilities(source: DependencyScanItem[], target: DependencyScanItem[]) {
  const targetIds = new Set(target.flatMap((item) => item.vulnerabilities.map((vulnerability) => vulnerability.id)));
  return source.flatMap((item) => item.vulnerabilities).filter((vulnerability: Vulnerability) => !targetIds.has(vulnerability.id));
}

function compareVersions(left: string, right: string) {
  const a = cleanVersion(left).split('.').map(Number);
  const b = cleanVersion(right).split('.').map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return 0;
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function bumpVersion(range: string) {
  const version = cleanVersion(range).split('.').map(Number);
  if (version.length !== 3 || version.some(Number.isNaN)) return 'latest';
  return `${version[0] + 1}.${version[1]}.${version[2]}`;
}

function mapScan(row: any): DependencyScan {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    status: row.status,
    healthScore: row.health_score,
    totalDependencies: row.total_dependencies,
    totalDevDependencies: row.total_dev_dependencies,
    outdatedCount: row.outdated_count,
    vulnerableCount: row.vulnerable_count,
    deprecatedCount: row.deprecated_count,
    abandonedCount: row.abandoned_count,
    criticalRiskCount: row.critical_risk_count,
    highRiskCount: row.high_risk_count,
    mediumRiskCount: row.medium_risk_count,
    lowRiskCount: row.low_risk_count,
    createdAt: row.created_at,
  };
}

function mapItem(row: any): DependencyScanItem {
  return {
    id: row.id,
    scanId: row.scan_id,
    projectId: row.project_id,
    userId: row.user_id,
    packageName: row.package_name,
    currentRange: row.current_range,
    currentVersion: row.current_version,
    latestVersion: row.latest_version,
    dependencyType: row.dependency_type,
    updateType: row.update_type,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    isOutdated: row.is_outdated,
    isVulnerable: row.is_vulnerable,
    vulnerabilities: row.vulnerabilities ?? [],
    isDeprecated: row.is_deprecated,
    isPossiblyAbandoned: row.is_possibly_abandoned,
    lastPublishedAt: row.last_published_at,
    riskReason: row.risk_reason,
    aiExplanation: row.ai_explanation,
    recommendedAction: row.recommended_action,
    updateCommand: row.update_command,
    npmUrl: row.npm_url,
    repositoryUrl: row.repository_url,
    releaseInsights: row.release_insights,
  };
}
