const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
/** Stay under Vercel's ~4.5 MB serverless request body limit. */
const MAX_OUTPUT_BYTES = 3.5 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Foto kon niet worden geladen"));
    img.src = src;
  });
}

function scaleDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Foto kon niet worden gecomprimeerd"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Resize and compress a dog profile photo for upload.
 * Converts HEIC/large iPhone photos to JPEG (~1024px, quality 0.85).
 */
export async function compressDogPhoto(file: File): Promise<File> {
  if (typeof document === "undefined") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = scaleDimensions(
      img.naturalWidth,
      img.naturalHeight,
      MAX_DIMENSION,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas niet beschikbaar");

    ctx.drawImage(img, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > MAX_OUTPUT_BYTES && quality > 0.45) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
