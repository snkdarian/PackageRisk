export function buildSummary(items: any[], packageJson: any) {
  const count = (level: string) => items.filter((item) => item.riskLevel === level).length;
  const criticalRiskCount = count('critical');
  const highRiskCount = count('high');
  const mediumRiskCount = count('medium');
  const lowRiskCount = count('low');
  return {
    healthScore: Math.max(0, 100 - criticalRiskCount * 25 - highRiskCount * 15 - mediumRiskCount * 8 - lowRiskCount * 3),
    totalDependencies: Object.keys(packageJson.dependencies ?? {}).length,
    totalDevDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
    outdatedCount: items.filter((item) => item.isOutdated).length,
    vulnerableCount: items.filter((item) => item.isVulnerable).length,
    deprecatedCount: items.filter((item) => item.isDeprecated).length,
    abandonedCount: items.filter((item) => item.isPossiblyAbandoned).length,
    criticalRiskCount,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
  };
}
