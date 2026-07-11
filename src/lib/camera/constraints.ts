export type CameraFacingMode = "user" | "environment";

type CameraOptions = {
  /** Request moderate resolution — helps 1D thermal receipt barcodes without 1080p decode cost. */
  highResolution?: boolean;
};

export function getCameraVideoConstraints(
  facingMode: CameraFacingMode,
  options?: CameraOptions,
) {
  const video: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
  };

  if (options?.highResolution) {
    video.width = { ideal: 1280 };
    video.height = { ideal: 720 };
  }

  return {
    video,
    audio: false,
  } as const;
}
