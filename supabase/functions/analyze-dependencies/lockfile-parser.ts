export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export function detectPackageManager(packageJson: any, lockFileName?: string, lockFileContent?: string): PackageManager {
  const name = String(lockFileName ?? '').toLowerCase();
  if (name.includes('pnpm-lock')) return 'pnpm';
  if (name.includes('yarn.lock')) return 'yarn';
  if (name.includes('package-lock')) return 'npm';
  const content = lockFileContent ?? '';
  if (content.includes('lockfileVersion:') && content.includes('importers:')) return 'pnpm';
  if (content.includes('__metadata:') || /^\S.*@.*:\n\s+version/m.test(content)) return 'yarn';
  const declared = String(packageJson?.packageManager ?? '').toLowerCase();
  if (declared.startsWith('pnpm@')) return 'pnpm';
  if (declared.startsWith('yarn@')) return 'yarn';
  if (declared.startsWith('npm@')) return 'npm';
  return 'npm';
}

export function parseInstalledVersions(lockFileContent: string | undefined, packageManager: PackageManager) {
  if (!lockFileContent?.trim()) return new Map<string, string>();
  if (packageManager === 'npm') return parsePackageLock(lockFileContent);
  if (packageManager === 'yarn') return parseYarnLock(lockFileContent);
  return parsePnpmLock(lockFileContent);
}

function parsePackageLock(content: string) {
  const versions = new Map<string, string>();
  try {
    const parsed = JSON.parse(content);
    for (const [path, meta] of Object.entries<any>(parsed.packages ?? {})) {
      if (!path.startsWith('node_modules/') || !meta?.version) continue;
      versions.set(path.replace(/^node_modules\//, ''), String(meta.version));
    }
    for (const [name, meta] of Object.entries<any>(parsed.dependencies ?? {})) {
      if (meta?.version && !versions.has(name)) versions.set(name, String(meta.version));
    }
  } catch {
    return versions;
  }
  return versions;
}

function parseYarnLock(content: string) {
  const versions = new Map<string, string>();
  for (const block of content.split(/\n(?=\S)/)) {
    const version = block.match(/\n\s+version\s+"([^"]+)"/)?.[1];
    if (!version) continue;
    const header = block.split('\n')[0] ?? '';
    for (const token of header.split(',')) {
      const name = packageNameFromYarnToken(token.trim().replace(/^"|"$/g, ''));
      if (name && !versions.has(name)) versions.set(name, version);
    }
  }
  return versions;
}

function packageNameFromYarnToken(token: string) {
  if (!token) return '';
  const rangeIndex = token.startsWith('@') ? token.indexOf('@', 1) : token.indexOf('@');
  return rangeIndex > 0 ? token.slice(0, rangeIndex) : token;
}

function parsePnpmLock(content: string) {
  const versions = new Map<string, string>();
  const dependencyLine = /^\s{4}((?:@[^/\s]+\/)?[^:\s]+):\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = dependencyLine.exec(content))) {
    const name = match[1];
    const value = match[2];
    const version = value.match(/version:\s*([^\s,}]+)/)?.[1] ?? value.match(/^([0-9]+\.[0-9]+\.[0-9][^\s]*)/)?.[1];
    if (version && !version.startsWith('link:') && !version.startsWith('workspace:')) versions.set(name, cleanLockVersion(version));
  }
  const packageBlock = /^\s{2}\/((?:@[^/\s]+\/)?[^@\s]+)@([^:\(\s]+).*:$/gm;
  while ((match = packageBlock.exec(content))) {
    if (!versions.has(match[1])) versions.set(match[1], cleanLockVersion(match[2]));
  }
  return versions;
}

function cleanLockVersion(version: string) {
  return version.replace(/^['"]|['"]$/g, '').replace(/\(.+\)$/, '');
}
