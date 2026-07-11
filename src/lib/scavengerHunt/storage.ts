import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const HUNT_DIR = path.join(process.cwd(), "data", "hunt");

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic") || mimeType.includes("heif")) return "heic";
  return "jpg";
}

export async function saveHuntPhoto(
  progressId: string,
  checkpointIndex: number,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = extensionForMime(mimeType);
  const filename = `${progressId}-cp${checkpointIndex}-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`hunt/${filename}`, buffer, {
      access: "public",
      contentType: mimeType || "image/jpeg",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Foto-opslag is niet geconfigureerd (BLOB_READ_WRITE_TOKEN ontbreekt)",
    );
  }

  await mkdir(HUNT_DIR, { recursive: true });
  await writeFile(path.join(HUNT_DIR, filename), buffer);
  return filename;
}
