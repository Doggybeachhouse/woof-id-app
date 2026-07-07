import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DOGS_DIR = path.join(process.cwd(), "data", "dogs");

export async function saveDogPhoto(
  dogId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  await mkdir(DOGS_DIR, { recursive: true });
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  const filename = `${dogId}.${ext}`;
  await writeFile(path.join(DOGS_DIR, filename), buffer);
  return filename;
}

export function getDogPhotoPath(filename: string): string {
  return path.join(DOGS_DIR, filename);
}
