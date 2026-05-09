export async function fetchNpmPackage(name: string, currentVersion: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const [registryRes, downloadsRes] = await Promise.allSettled([
      fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { signal: controller.signal }),
      fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(name)}`, { signal: controller.signal }),
    ]);
    const json = registryRes.status === 'fulfilled' ? await registryRes.value.json() : {};
    const downloadsJson = downloadsRes.status === 'fulfilled' ? await downloadsRes.value.json().catch(() => ({})) : {};
    const latestVersion = json?.['dist-tags']?.latest;
    const versionMeta = currentVersion ? json?.versions?.[currentVersion] : null;
    const versions = Object.keys(json?.versions ?? {});
    return {
      latestVersion,
      deprecated: versionMeta?.deprecated,
      repositoryUrl: typeof json?.repository === 'string' ? json.repository : json?.repository?.url,
      lastPublishedAt: latestVersion ? json?.time?.[latestVersion] : undefined,
      monthlyDownloads: typeof downloadsJson?.downloads === 'number' ? downloadsJson.downloads : undefined,
      versionCount: versions.length,
      license: versionMeta?.license ?? json?.license,
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}
