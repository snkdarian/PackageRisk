export function cleanVersion(range: string) {
  return range.match(/\d+\.\d+\.\d+/)?.[0] ?? '';
}

export function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  return 0;
}

export function updateType(current: string, latest: string) {
  const a = current.split('.').map(Number);
  const b = latest.split('.').map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return 'unknown';
  if (compareVersions(current, latest) === 0) return 'none';
  if (a[0] !== b[0]) return 'major';
  if (a[1] !== b[1]) return 'minor';
  return 'patch';
}
