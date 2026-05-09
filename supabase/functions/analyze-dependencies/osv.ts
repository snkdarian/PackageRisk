export async function queryOsv(name: string, version: string) {
  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ package: { name, ecosystem: 'npm' }, version }),
    });
    const json = await res.json();
    return (json.vulns ?? []).map((v: any) => ({
      id: v.id,
      summary: v.summary ?? 'Vulnerability details available in OSV.',
      severity: normalizeSeverity(v.severity?.[0]?.score ?? v.database_specific?.severity),
    }));
  } catch {
    return [];
  }
}

function normalizeSeverity(value: string) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('critical') || text.startsWith('9')) return 'critical';
  if (text.includes('high') || text.startsWith('7') || text.startsWith('8')) return 'high';
  if (text.includes('medium') || text.startsWith('4') || text.startsWith('5') || text.startsWith('6')) return 'medium';
  return 'low';
}
