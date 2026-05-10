import { compareVersions, cleanVersion, updateType } from './semver-utils.ts';
import { queryOsv } from './osv.ts';
import { fetchNpmPackage } from './npm-registry.ts';
import { fetchReleaseInsights } from './release-insights.ts';

export async function analyzePackage(dep: { name: string; range: string; dependencyType: 'dependency' | 'devDependency'; installedVersion?: string }) {
  const currentVersion = dep.installedVersion || cleanVersion(dep.range);
  const npm = await fetchNpmPackage(dep.name, currentVersion);
  const latestVersion = npm.latestVersion ?? 'unknown';
  const vulnerabilities = currentVersion ? await queryOsv(dep.name, currentVersion) : [];
  const type = updateType(currentVersion, latestVersion);
  const isOutdated = compareVersions(currentVersion, latestVersion) < 0;
  const isDeprecated = Boolean(npm.deprecated);
  const isPossiblyAbandoned = npm.lastPublishedAt ? Date.now() - new Date(npm.lastPublishedAt).getTime() > 1000 * 60 * 60 * 24 * 730 : false;
  const ageDays = npm.lastPublishedAt ? Math.floor((Date.now() - new Date(npm.lastPublishedAt).getTime()) / (1000 * 60 * 60 * 24)) : undefined;
  const hasHighVuln = vulnerabilities.some((v) => v.severity === 'high' || v.severity === 'critical');
  const prediction = predictRisk({
    dependencyType: dep.dependencyType,
    type,
    vulnerabilities,
    isDeprecated,
    isPossiblyAbandoned,
    isOutdated,
    ageDays,
    monthlyDownloads: npm.monthlyDownloads,
  });
  const riskLevel = prediction.riskLevel;
  const guidance = buildGuidance({
    depName: dep.name,
    currentVersion,
    latestVersion,
    type,
    vulnerabilities,
    isDeprecated,
    isPossiblyAbandoned,
    isOutdated,
    ageDays,
    monthlyDownloads: npm.monthlyDownloads,
    versionCount: npm.versionCount,
    license: npm.license,
    dependencyType: dep.dependencyType,
    predictedRisk: prediction.predictedRisk,
    urgency: prediction.urgency,
  });
  const releaseInsights = await fetchReleaseInsights({
    packageName: dep.name,
    repositoryUrl: npm.repositoryUrl,
    currentVersion,
    latestVersion,
    updateType: type,
    isVulnerable: vulnerabilities.length > 0,
    isDeprecated,
  });
  return {
    packageName: dep.name,
    currentRange: dep.range,
    currentVersion,
    latestVersion,
    dependencyType: dep.dependencyType,
    updateType: type,
    riskLevel,
    riskScore: prediction.riskScore,
    isOutdated,
    isVulnerable: vulnerabilities.length > 0,
    vulnerabilities,
    isDeprecated,
    isPossiblyAbandoned,
    lastPublishedAt: npm.lastPublishedAt,
    riskReason: guidance.reason,
    aiExplanation: guidance.explanation,
    recommendedAction: guidance.action,
    updateCommand: `npm install ${dep.name}@${latestVersion}`,
    npmUrl: `https://www.npmjs.com/package/${encodeURIComponent(dep.name)}`,
    repositoryUrl: npm.repositoryUrl,
    releaseInsights,
  };
}

function buildGuidance(input: {
  depName: string;
  currentVersion: string;
  latestVersion: string;
  type: string;
  vulnerabilities: Array<{ severity: string }>;
  isDeprecated: boolean;
  isPossiblyAbandoned: boolean;
  isOutdated: boolean;
  ageDays?: number;
  monthlyDownloads?: number;
  versionCount?: number;
  license?: string;
  dependencyType: 'dependency' | 'devDependency';
  predictedRisk: string;
  urgency: string;
}) {
  const context = [
    input.type !== 'none' && input.type !== 'unknown' ? `Update type: ${input.type}.` : '',
    typeof input.ageDays === 'number' ? `Latest release age: ${input.ageDays} days.` : '',
    typeof input.monthlyDownloads === 'number' ? `npm demand: ${formatDownloads(input.monthlyDownloads)} downloads/month.` : '',
    input.license ? `License signal: ${input.license}.` : '',
    input.dependencyType === 'dependency' ? 'Runtime dependency: test user-facing flows.' : 'Dev dependency: focus on CI/build/test pipelines.',
    `Prediction: ${input.predictedRisk}. Urgency: ${input.urgency}.`,
  ].filter(Boolean).join(' ');

  if (input.vulnerabilities.length) {
    const worst = input.vulnerabilities.some((v) => v.severity === 'critical') ? 'critical' : input.vulnerabilities.some((v) => v.severity === 'high') ? 'high' : 'known';
    return {
      reason: `${worst[0].toUpperCase()}${worst.slice(1)} vulnerability signals were found for this installed version.`,
      explanation: `${context} Treat ${input.depName} as security work first. Update in a short-lived branch, run direct consumer tests, and check release notes for breaking changes before merging.`,
      action: `Upgrade ${input.depName} from ${input.currentVersion || input.depName} to ${input.latestVersion}, rerun tests, then rerun the scan to confirm the advisory is cleared.`,
    };
  }
  if (input.isDeprecated) {
    return {
      reason: 'The installed package version is marked deprecated in npm metadata.',
      explanation: `${context} A deprecated package can keep working while still being risky. Look for the maintainer's replacement guidance and avoid building new code on top of ${input.depName}.`,
      action: `Plan a replacement or supported version for ${input.depName}, then remove deprecated usage from active paths.`,
    };
  }
  if (input.type === 'major') {
    return {
      reason: 'A major version update is available, which may include breaking API changes.',
      explanation: `${context} Major upgrades need a migration pass. Review changelog entries, update types/configuration, and smoke test flows that import ${input.depName}.`,
      action: `Schedule a controlled upgrade to ${input.latestVersion} with regression coverage.`,
    };
  }
  if (input.isPossiblyAbandoned) {
    return {
      reason: 'The package has a low recent publish activity signal.',
      explanation: `${context} Low maintenance does not always mean unsafe, but it increases long-term risk. Check repository activity, issue response time, and available alternatives.`,
      action: `Review whether ${input.depName} should be replaced or pinned with additional monitoring.`,
    };
  }
  if (input.isOutdated) {
    return {
      reason: 'A newer version is available.',
      explanation: `${context} This looks like routine maintenance. Prefer small updates, keep the lockfile clean, and let CI catch compatibility issues.`,
      action: `Update ${input.depName} to ${input.latestVersion} during the next maintenance pass.`,
    };
  }
  return {
    reason: 'No notable risk found.',
    explanation: `${context} Keep ${input.depName} in scheduled scans so new advisories or metadata changes are caught early.`,
    action: `Keep ${input.depName} monitored.`,
  };
}

function predictRisk(input: {
  dependencyType: 'dependency' | 'devDependency';
  type: string;
  vulnerabilities: Array<{ severity: string }>;
  isDeprecated: boolean;
  isPossiblyAbandoned: boolean;
  isOutdated: boolean;
  ageDays?: number;
  monthlyDownloads?: number;
}) {
  let score = 0;
  if (input.vulnerabilities.some((v) => v.severity === 'critical')) score += 55;
  else if (input.vulnerabilities.some((v) => v.severity === 'high')) score += 45;
  else if (input.vulnerabilities.length) score += 32;
  if (input.isDeprecated) score += 30;
  if (input.type === 'major') score += 24;
  if (input.type === 'minor') score += 10;
  if (input.type === 'patch') score += 4;
  if (input.isPossiblyAbandoned) score += 18;
  if ((input.ageDays ?? 0) > 1095) score += 14;
  else if ((input.ageDays ?? 0) > 730) score += 9;
  if (input.dependencyType === 'dependency') score += 6;
  if (typeof input.monthlyDownloads === 'number' && input.monthlyDownloads < 1000) score += 8;
  if (!input.isOutdated && !input.vulnerabilities.length && !input.isDeprecated) score = Math.max(0, score - 12);
  const riskScore = Math.min(100, score);
  const riskLevel = riskScore >= 85 ? 'critical' : riskScore >= 65 ? 'high' : riskScore >= 38 ? 'medium' : riskScore > 0 ? 'low' : 'none';
  const predictedRisk = riskScore >= 85
    ? 'Very likely to need immediate remediation'
    : riskScore >= 65
      ? 'Likely to create security or maintenance pressure soon'
      : riskScore >= 38
        ? 'Moderate risk; schedule an upgrade window'
        : riskScore > 0
          ? 'Low near-term risk; keep in maintenance backlog'
          : 'Stable based on available public metadata';
  const urgency = riskScore >= 85 ? 'now' : riskScore >= 65 ? 'this week' : riskScore >= 38 ? 'this sprint' : riskScore > 0 ? 'next maintenance cycle' : 'monitor';
  return { riskScore, riskLevel, predictedRisk, urgency };
}

function formatDownloads(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}
