export type CameraFacingMode = "user" | "environment";

export function getCameraVideoConstraints(facingMode: CameraFacingMode) {
  return {
    video: { facingMode: { ideal: facingMode } },
    audio: false,
  } as const;
}
