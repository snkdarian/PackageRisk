export type PackageManager = 'npm' | 'yarn' | 'pnpm';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type UpdateType = 'none' | 'patch' | 'minor' | 'major' | 'unknown';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  packageManager: PackageManager;
  packageJson?: Record<string, unknown>;
  lockFileContent?: string;
  scheduleType: 'manual' | 'weekly' | 'monthly';
  lastScanAt?: string;
  lastHealthScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyScan {
  id: string;
  projectId: string;
  userId: string;
  status: ScanStatus;
  healthScore: number;
  totalDependencies: number;
  totalDevDependencies: number;
  outdatedCount: number;
  vulnerableCount: number;
  deprecatedCount: number;
  abandonedCount: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  createdAt: string;
}

export interface Vulnerability {
  id: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DependencyScanItem {
  id: string;
  scanId: string;
  projectId: string;
  userId: string;
  packageName: string;
  currentRange: string;
  currentVersion: string;
  latestVersion: string;
  dependencyType: 'dependency' | 'devDependency';
  updateType: UpdateType;
  riskLevel: RiskLevel;
  riskScore: number;
  isOutdated: boolean;
  isVulnerable: boolean;
  vulnerabilities: Vulnerability[];
  isDeprecated: boolean;
  isPossiblyAbandoned: boolean;
  lastPublishedAt?: string;
  riskReason: string;
  aiExplanation: string;
  recommendedAction: string;
  updateCommand: string;
  npmUrl: string;
  repositoryUrl?: string;
  releaseInsights?: ReleaseInsights;
}

export interface ReleaseInsights {
  source: 'github-releases' | 'github-changelog' | 'npm-metadata' | 'unavailable';
  url?: string;
  summary: string;
  breakingChanges: string[];
  migrationNotes: string[];
  securityNotes: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface ScanReport {
  scan: DependencyScan;
  project: Project;
  items: DependencyScanItem[];
}

export interface ScanComparison {
  previousScan: DependencyScan;
  currentScan: DependencyScan;
  previousItems: DependencyScanItem[];
  currentItems: DependencyScanItem[];
  healthDelta: number;
  fixedRisks: DependencyScanItem[];
  newRisks: DependencyScanItem[];
  upgradedPackages: DependencyScanItem[];
  downgradedPackages: DependencyScanItem[];
  newVulnerabilities: Vulnerability[];
  resolvedVulnerabilities: Vulnerability[];
}

export interface DashboardStats {
  totalProjects: number;
  totalScans: number;
  averageHealthScore: number;
  criticalRisks: number;
  highRisks: number;
  packagesMonitored: number;
}

export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress?: string;
  discordEnabled: boolean;
  discordWebhookUrl?: string;
  slackEnabled: boolean;
  slackWebhookUrl?: string;
}
