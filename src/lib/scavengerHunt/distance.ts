const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

/** Initial bearing from point 1 to point 2, in degrees (0 = north, clockwise). */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export type CardinalDirection =
  | "north"
  | "northEast"
  | "east"
  | "southEast"
  | "south"
  | "southWest"
  | "west"
  | "northWest";

/** Map bearing (0–360) to one of eight compass labels. */
export function bearingToCardinal(bearing: number): CardinalDirection {
  const normalized = ((bearing % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  const directions: CardinalDirection[] = [
    "north",
    "northEast",
    "east",
    "southEast",
    "south",
    "southWest",
    "west",
    "northWest",
  ];
  return directions[index]!;
}

/** Great-circle distance between two WGS-84 coordinates, in meters. */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function isWithinRadius(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number,
): boolean {
  return haversineDistanceMeters(userLat, userLng, targetLat, targetLng) <= radiusMeters;
}

/** Shortest absolute difference between two bearings (0–180°). */
export function angleDifferenceDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export const COMPASS_ALIGNMENT_TOLERANCE_DEG = 28;

/** True when two bearings point roughly the same way (within tolerance). */
export function areBearingsAligned(
  a: number,
  b: number,
  toleranceDeg = COMPASS_ALIGNMENT_TOLERANCE_DEG,
): boolean {
  return angleDifferenceDeg(a, b) <= toleranceDeg;
}

/** Minimum GPS movement before inferring a walk direction (reduces jitter). */
export const MOVEMENT_BEARING_MIN_METERS = 4;
