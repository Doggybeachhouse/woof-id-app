/**
 * Smoke test for dog photo storage (1.5 MB file).
 * Run: npx tsx scripts/test-dog-photo-upload.ts
 */
import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import path from "path";

import { getDogPhotoPath, saveDogPhoto } from "../src/lib/dogs/storage";

async function main() {
  const testDir = path.join(process.cwd(), "data", "test");
  mkdirSync(testDir, { recursive: true });
  const size = 1.5 * 1024 * 1024;
  const buffer = Buffer.alloc(size, 0xff);

  console.log(`Saving ${(size / 1024 / 1024).toFixed(2)} MB test photo...`);
  const saved = await saveDogPhoto("test-upload-dog", buffer, "image/jpeg");
  console.log(`saveDogPhoto OK: ${saved}`);

  if (saved.startsWith("http")) {
    console.log("PASS: blob storage upload works");
    return;
  }

  const localPath = getDogPhotoPath(saved);
  const readBack = readFileSync(localPath);
  if (readBack.length !== size) {
    throw new Error(`Size mismatch: wrote ${size}, read ${readBack.length}`);
  }
  unlinkSync(localPath);
  console.log("PASS: large photo save/read works");
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exit(1);
});
