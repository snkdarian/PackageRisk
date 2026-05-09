import { Injectable, computed } from '@angular/core';
import { ChartPoint, DashboardStats } from './models';
import { ProjectService } from './project.service';
import { ScanService } from './scan.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly stats = computed<DashboardStats>(() => {
    const scans = this.scans.scans();
    const totalScore = scans.reduce((sum, scan) => sum + scan.healthScore, 0);
    return {
      totalProjects: this.projects.projects().length,
      totalScans: scans.length,
      averageHealthScore: scans.length ? Math.round(totalScore / scans.length) : 0,
      criticalRisks: scans.reduce((sum, scan) => sum + scan.criticalRiskCount, 0),
      highRisks: scans.reduce((sum, scan) => sum + scan.highRiskCount, 0),
      packagesMonitored: scans.reduce((sum, scan) => sum + scan.totalDependencies + scan.totalDevDependencies, 0),
    };
  });

  readonly riskDistribution = computed<ChartPoint[]>(() => [
    { label: 'Low', value: this.scans.scans().reduce((sum, scan) => sum + scan.lowRiskCount, 0), color: '#22c55e' },
    { label: 'Medium', value: this.scans.scans().reduce((sum, scan) => sum + scan.mediumRiskCount, 0), color: '#f59e0b' },
    { label: 'High', value: this.scans.scans().reduce((sum, scan) => sum + scan.highRiskCount, 0), color: '#f97316' },
    { label: 'Critical', value: this.scans.scans().reduce((sum, scan) => sum + scan.criticalRiskCount, 0), color: '#ef4444' },
  ]);

  constructor(
    private readonly projects: ProjectService,
    private readonly scans: ScanService,
  ) {}
}
