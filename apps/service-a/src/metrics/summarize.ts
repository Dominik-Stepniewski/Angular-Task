export function summarize(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') return {};
  const r = result as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const rows = Array.isArray(r['data']) ? r['data'] : r['annotations'];
  if (Array.isArray(rows)) out['results'] = rows.length;
  for (const k of ['total', 'page', 'inserted', 'failedCount', 'fetched', 'pages'] as const) {
    if (typeof r[k] === 'number') out[k] = r[k];
  }
  for (const k of ['assetId', 'label'] as const) {
    if (typeof r[k] === 'string') out[k] = r[k];
  }
  return out;
}
