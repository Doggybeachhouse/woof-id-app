/**
 * Decode a receipt barcode from a static image (dev/test).
 * Usage: npx tsx scripts/test-receipt-barcode-decode.ts [image-path]
 */
import fs from "node:fs";
import path from "node:path";

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import sharp from "sharp";

const formats = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODABAR,
];

const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, formats],
]);

type Region = { label: string; x: number; y: number; w: number; h: number };

function decodeRegion(
  pixels: Buffer,
  width: number,
  height: number,
  region: Region,
  binarizer: "hybrid" | "global",
) {
  const { x, y, w, h } = region;
  const lum = new Uint8ClampedArray(w * h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcIdx = ((y + row) * width + (x + col)) * 4;
      const r = pixels[srcIdx]!;
      const g = pixels[srcIdx + 1]!;
      const b = pixels[srcIdx + 2]!;
      lum[row * w + col] = (r + g + g + b) >> 2;
    }
  }

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  const source = new RGBLuminanceSource(lum, w, h);
  const Binarizer = binarizer === "global" ? GlobalHistogramBinarizer : HybridBinarizer;
  const bitmap = new BinaryBitmap(new Binarizer(source));

  try {
    const result = reader.decode(bitmap);
    return {
      text: result.getText(),
      format: BarcodeFormat[result.getBarcodeFormat()],
      region: region.label,
      binarizer,
    };
  } catch {
    return null;
  }
}

async function main() {
  const imagePath =
    process.argv[2] ??
    path.join(
      process.env.HOME ?? "",
      ".cursor/projects/Users-indykroos-woof-id-app/assets/IMG_0346-19b3df92-eb75-4db7-b48d-0af4e13d3c24.png",
    );

  if (!fs.existsSync(imagePath)) {
    console.error("Image not found:", imagePath);
    process.exit(1);
  }

  const variants = [
    ["original", await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })],
    [
      "sharpen",
      await sharp(imagePath).sharpen().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ],
    [
      "grayscale-normalize",
      await sharp(imagePath).grayscale().normalize().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ],
    [
      "resize2x",
      await sharp(imagePath).resize({ width: 1536 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ],
  ] as const;

  let found = 0;

  for (const [variantName, { data, info }] of variants) {
    const { width, height } = info;
    const regions: Region[] = [
      { label: "full", x: 0, y: 0, w: width, h: height },
      { label: "bottom-third", x: 0, y: Math.floor(height * 0.66), w: width, h: Math.floor(height * 0.34) },
      { label: "bottom-tight", x: Math.floor(width * 0.05), y: Math.floor(height * 0.78), w: Math.floor(width * 0.9), h: Math.floor(height * 0.18) },
    ];

    for (const region of regions) {
      for (const binarizer of ["hybrid", "global"] as const) {
        const result = decodeRegion(data, width, height, region, binarizer);
        if (result) {
          found += 1;
          console.log(JSON.stringify({ variant: variantName, ...result }));
        }
      }
    }
  }

  if (found === 0) {
    console.log("No barcode decoded. Try a closer photo with the barcode filling the bottom guide frame.");
    process.exit(2);
  }
}

void main();
