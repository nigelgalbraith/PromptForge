// Parse comma-delimited strings or arrays into a normalized string array.



export function parseCsvOrArray(raw, fallback = []) {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return Array.isArray(fallback) ? fallback : [];
}
