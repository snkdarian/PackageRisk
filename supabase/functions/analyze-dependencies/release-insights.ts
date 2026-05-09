export interface ReleaseInsights {
  source: 'github-releases' | 'github-changelog' | 'npm-metadata' | 'unavailable';
  url?: string;
  summary: string;
  breakingChanges: string[];
  migrationNotes: string[];
  securityNotes: string[];
  confidence: 'low' | 'medium' | 'high';
}

const INTERESTING_PATTERNS = [
  /breaking/i,
  /migration|migrate/i,
  /security|vulnerab|cve|advisory/i,
  /deprecated|deprecation/i,
  /removed|drop(ped)? support|no longer/i,
  /require(s|d)? node|node\.js|typescript/i,
  /api|config|configuration/i,
];

export async function fetchReleaseInsights(input: {
  packageName: string;
  repositoryUrl?: string;
  currentVersion: string;
  latestVersion: string;
  updateType: string;
  isVulnerable: boolean;
  isDeprecated: boolean;
}): Promise<ReleaseInsights> {
  const fallback = metadataFallback(input);
  const repo = normalizeGithubRepo(input.repositoryUrl);
  if (!repo) return fallback;

  const latestRelease = await fetchLatestRelease(repo);
  if (latestRelease?.body) {
    return buildInsights({
      source: 'github-releases',
      url: latestRelease.url,
      text: `${latestRelease.title}\n${latestRelease.body}`,
      fallback,
    });
  }

  const changelog = await fetchChangelog(repo);
  if (changelog?.text) {
    return buildInsights({
      source: 'github-changelog',
      url: changelog.url,
      text: changelog.text,
      fallback,
    });
  }

  return fallback;
}

function metadataFallback(input: {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: string;
  isVulnerable: boolean;
  isDeprecated: boolean;
}): ReleaseInsights {
  const breakingChanges = input.updateType === 'major'
    ? [`Major version jump from ${input.currentVersion} to ${input.latestVersion}; review migration notes before updating.`]
    : [];
  const securityNotes = input.isVulnerable ? ['Known vulnerability signals were found for the installed version.'] : [];
  const migrationNotes = input.isDeprecated ? ['Package metadata marks the installed version as deprecated; look for maintainer migration guidance.'] : [];
  const summary = [
    `${input.packageName}: ${input.currentVersion || 'installed'} -> ${input.latestVersion || 'latest'} (${input.updateType}).`,
    breakingChanges.length ? 'Treat this as a compatibility-sensitive update.' : '',
    securityNotes.length ? 'Security validation is required.' : '',
  ].filter(Boolean).join(' ');
  return {
    source: 'npm-metadata',
    summary,
    breakingChanges,
    migrationNotes,
    securityNotes,
    confidence: input.updateType === 'major' || input.isVulnerable || input.isDeprecated ? 'medium' : 'low',
  };
}

async function fetchLatestRelease(repo: string) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'dependency-risk-scanner' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      title: String(json.name ?? json.tag_name ?? 'Latest release'),
      body: String(json.body ?? ''),
      url: String(json.html_url ?? `https://github.com/${repo}/releases`),
    };
  } catch {
    return null;
  }
}

async function fetchChangelog(repo: string) {
  const paths = ['CHANGELOG.md', 'Changelog.md', 'changelog.md', 'HISTORY.md', 'RELEASES.md'];
  const branches = ['HEAD', 'main', 'master'];
  for (const branch of branches) {
    for (const path of paths) {
      try {
        const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
        const res = await fetch(url, { headers: { 'user-agent': 'dependency-risk-scanner' } });
        if (res.ok) return { url: `https://github.com/${repo}/blob/${branch}/${path}`, text: await res.text() };
      } catch {
        // Try the next common changelog path.
      }
    }
  }
  return null;
}

function buildInsights(input: { source: ReleaseInsights['source']; url?: string; text: string; fallback: ReleaseInsights }): ReleaseInsights {
  const lines = input.text
    .split('\n')
    .map((line) => line.replace(/^[-*#>\s]+/, '').trim())
    .filter((line) => line.length >= 12 && line.length <= 240);
  const interesting = unique(lines.filter((line) => INTERESTING_PATTERNS.some((pattern) => pattern.test(line)))).slice(0, 12);
  const breakingChanges = interesting.filter((line) => /breaking|removed|drop(ped)? support|no longer|api/i.test(line)).slice(0, 4);
  const migrationNotes = interesting.filter((line) => /migration|migrate|deprecated|require(s|d)? node|typescript|config/i.test(line)).slice(0, 4);
  const securityNotes = interesting.filter((line) => /security|vulnerab|cve|advisory/i.test(line)).slice(0, 4);
  const summaryLine = interesting[0] ?? lines.find((line) => !/^v?\d+\.\d+/.test(line)) ?? input.fallback.summary;
  return {
    source: input.source,
    url: input.url,
    summary: summaryLine,
    breakingChanges: breakingChanges.length ? breakingChanges : input.fallback.breakingChanges,
    migrationNotes: migrationNotes.length ? migrationNotes : input.fallback.migrationNotes,
    securityNotes: securityNotes.length ? securityNotes : input.fallback.securityNotes,
    confidence: interesting.length >= 3 ? 'high' : interesting.length ? 'medium' : input.fallback.confidence,
  };
}

function normalizeGithubRepo(url?: string) {
  if (!url) return null;
  const cleaned = url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git(#.*)?$/, '')
    .replace(/#.*$/, '');
  const match = cleaned.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\/$/, '')}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
