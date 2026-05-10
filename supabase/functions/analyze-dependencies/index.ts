import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { analyzePackage } from './risk-engine.ts';
import { buildSummary } from './score.ts';
import { detectPackageManager, parseInstalledVersions } from './lockfile-parser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const body = await req.json().catch(() => null);
  if (!body?.packageJson || typeof body.packageJson !== 'object') return Response.json({ error: 'Invalid packageJson' }, { status: 400, headers: corsHeaders });

  const packageManager = detectPackageManager(body.packageJson, body.lockFileName, body.lockFileContent);
  const installedVersions = parseInstalledVersions(body.lockFileContent, packageManager);
  const entries = [
    ...Object.entries(body.packageJson.dependencies ?? {}).map(([name, range]) => ({ name, range: String(range), installedVersion: installedVersions.get(name), dependencyType: 'dependency' as const })),
    ...Object.entries(body.packageJson.devDependencies ?? {}).map(([name, range]) => ({ name, range: String(range), installedVersion: installedVersions.get(name), dependencyType: 'devDependency' as const })),
  ].filter((dep) => !/^(workspace:|file:|link:|git\+|https?:\/\/)/.test(dep.range));

  if (!entries.length) return Response.json({ error: 'No supported dependencies found' }, { status: 400, headers: corsHeaders });

  if (body.projectId) {
    const { data: project } = await supabase.from('projects').select('id,user_id').eq('id', body.projectId).eq('user_id', userData.user.id).single();
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404, headers: corsHeaders });
  }

  const items = [];
  for (let i = 0; i < entries.length; i += 10) {
    items.push(...await Promise.all(entries.slice(i, i + 10).map(analyzePackage)));
  }
  const summary = buildSummary(items, body.packageJson);

  const { data: scan, error: scanError } = await supabase.from('dependency_scans').insert({
    project_id: body.projectId,
    user_id: userData.user.id,
    status: 'completed',
    health_score: summary.healthScore,
    total_dependencies: summary.totalDependencies,
    total_dev_dependencies: summary.totalDevDependencies,
    outdated_count: summary.outdatedCount,
    vulnerable_count: summary.vulnerableCount,
    deprecated_count: summary.deprecatedCount,
    abandoned_count: summary.abandonedCount,
    critical_risk_count: summary.criticalRiskCount,
    high_risk_count: summary.highRiskCount,
    medium_risk_count: summary.mediumRiskCount,
    low_risk_count: summary.lowRiskCount,
    raw_summary: summary,
  }).select().single();
  if (scanError) return Response.json({ error: scanError.message }, { status: 500, headers: corsHeaders });

  await supabase.from('dependency_scan_items').insert(items.map((item) => ({
    scan_id: scan.id,
    project_id: body.projectId,
    user_id: userData.user.id,
    package_name: item.packageName,
    current_range: item.currentRange,
    current_version: item.currentVersion,
    latest_version: item.latestVersion,
    dependency_type: item.dependencyType,
    update_type: item.updateType,
    risk_level: item.riskLevel,
    risk_score: item.riskScore,
    is_outdated: item.isOutdated,
    is_vulnerable: item.isVulnerable,
    vulnerabilities: item.vulnerabilities,
    is_deprecated: item.isDeprecated,
    is_possibly_abandoned: item.isPossiblyAbandoned,
    last_published_at: item.lastPublishedAt,
    risk_reason: item.riskReason,
    ai_explanation: item.aiExplanation,
    recommended_action: item.recommendedAction,
    update_command: item.updateCommand,
    npm_url: item.npmUrl,
    repository_url: item.repositoryUrl,
    release_insights: item.releaseInsights,
  })));

  await supabase.from('projects').update({ package_manager: packageManager, lock_file_content: body.lockFileContent, last_scan_at: new Date().toISOString(), last_health_score: summary.healthScore }).eq('id', body.projectId);
  return Response.json({ scan, items, summary }, { headers: corsHeaders });
});
