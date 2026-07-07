export type CorsOrigin = true | string[];

export function parseCorsOrigin(raw: string | undefined): CorsOrigin {
  const value = (raw ?? '').trim();
  if (value === '') return true;
  const list = value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (list.length === 0 || list.includes('*')) return true;
  return list;
}
