/**
 * Coercition défensive des numériques PostgreSQL : selon la couche API,
 * un NUMERIC peut arriver en number, en string ("12.50") ou en null.
 */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
