import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { del, put } from "@vercel/blob";

const DOGS_DIR = path.join(process.cwd(), "data", "dogs");

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic") || mimeType.includes("heif")) return "heic";
  return "jpg";
}

export function isRemotePhotoRef(photoRef: string): boolean {
  return photoRef.startsWith("http://") || photoRef.startsWith("https://");
}

async function removePreviousPhoto(previousPhotoRef?: string | null) {
  if (!previousPhotoRef) return;

  if (isRemotePhotoRef(previousPhotoRef)) {
    try {
      await del(previousPhotoRef);
    } catch (error) {
      console.warn("[saveDogPhoto] failed to delete previous blob", error);
    }
    return;
  }

  try {
    await unlink(getDogPhotoPath(previousPhotoRef));
  } catch {
    // Previous local file may already be gone.
  }
}

export async function saveDogPhoto(
  dogId: string,
  buffer: Buffer,
  mimeType: string,
  previousPhotoRef?: string | null,
): Promise<string> {
  const ext = extensionForMime(mimeType);
  const filename = `${dogId}-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`dogs/${filename}`, buffer, {
        access: "public",
        contentType: mimeType || "image/jpeg",
        addRandomSuffix: false,
      });
      await removePreviousPhoto(previousPhotoRef);
      return blob.url;
    } catch (error) {
      console.error("[saveDogPhoto] Vercel Blob upload failed", {
        dogId,
        mimeType,
        bytes: buffer.length,
        error,
      });
      throw new Error("Foto opslaan mislukt. Probeer het opnieuw.");
    }
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Foto-opslag is niet geconfigureerd (BLOB_READ_WRITE_TOKEN ontbreekt)",
    );
  }

  await mkdir(DOGS_DIR, { recursive: true });
  await writeFile(path.join(DOGS_DIR, filename), buffer);
  await removePreviousPhoto(previousPhotoRef);
  return filename;
}

export function getDogPhotoPath(filename: string): string {
  return path.join(DOGS_DIR, filename);
}
