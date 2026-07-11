/** Turn stored hunt photo ref into a browser-fetchable URL. */
export function resolveHuntPhotoUrl(
  imageUrl: string,
  progressId: string,
  checkpointIndex: number,
): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const params = new URLSearchParams({
    progressId,
    checkpointIndex: String(checkpointIndex),
  });
  return `/api/hunt/photo?${params.toString()}`;
}
