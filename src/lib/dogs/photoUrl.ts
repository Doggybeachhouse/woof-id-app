/** Cache-busted URL for the dog photo API route (avoids stale browser/CDN images). */
export function dogPhotoApiSrc(
  dogId: string,
  version?: number | string | Date | null,
): string {
  const base = `/api/dogs/${dogId}/photo`;
  if (version == null) return base;
  const v = version instanceof Date ? version.getTime() : version;
  return `${base}?v=${v}`;
}
