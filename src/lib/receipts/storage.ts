import { mkdir, writeFile } from "fs/promises";
import path from "path";

const RECEIPTS_DIR = path.join(process.cwd(), "data", "receipts");

export async function saveReceiptImage(
  receiptId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  await mkdir(RECEIPTS_DIR, { recursive: true });
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filename = `${receiptId}.${ext}`;
  const fullPath = path.join(RECEIPTS_DIR, filename);
  await writeFile(fullPath, buffer);
  return filename;
}

export function getReceiptImagePath(filename: string): string {
  return path.join(RECEIPTS_DIR, filename);
}
