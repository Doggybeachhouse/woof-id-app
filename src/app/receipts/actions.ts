"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { processDogEvent } from "@/lib/gamification/processDogEvent";
import { coinsFromPurchaseEur } from "@/lib/gamification/receiptCoins";
import { estimateReceiptTotalEur } from "@/lib/gamification/receiptTotal.server";
import { loadProductCatalog } from "@/lib/catalog/products";
import { parseProductCategory } from "@/lib/receipts/categories";
import { guessCategoryFromName } from "@/lib/catalog/products";
import { lookupReceiptByBarcode } from "@/lib/mplus/receiptLookup";
import {
  canonicalReceiptBarcode,
  findExistingReceiptByBarcode,
  normalizeReceiptBarcode,
} from "@/lib/receipts/barcode";
import { RECEIPT_ERROR } from "@/lib/receipts/errors";
import { resolveExistingBarcodeReceipt } from "@/lib/receipts/receiptClaim";
import { recognizeReceiptProducts } from "@/lib/receipts/ocr";
import { saveReceiptImage } from "@/lib/receipts/storage";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

const itemSchema = z.object({
  rawName: z.string().min(1).max(200),
  normalizedName: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(99),
  category: z.string(),
});

function parsePurchaseTotalEur(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const value = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

async function assertDogAccess(dogProfileId: string, userId: string, role: string) {
  const dog = await prisma.dogProfile.findFirst({
    where:
      role === "STAFF" || role === "ADMIN"
        ? { id: dogProfileId }
        : { id: dogProfileId, ownerUserId: userId },
  });
  if (!dog) throw new Error(RECEIPT_ERROR.DOG_NOT_FOUND);
  return dog;
}

const manualItemSchema = z.object({
  articleNumber: z.string().min(1),
  name: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(99),
});

export type ClaimReceiptBarcodeState = {
  error?: string;
  claimedCoins?: number;
  redirectTo?: string;
};

async function claimReceiptBarcode(formData: FormData): Promise<string> {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const dogProfileId = String(formData.get("dogProfileId") ?? "");
  const barcode = normalizeReceiptBarcode(String(formData.get("barcode") ?? ""));

  if (!dogProfileId || barcode.length < 4) {
    throw new Error(RECEIPT_ERROR.INVALID_INPUT);
  }

  await assertDogAccess(dogProfileId, userId, role);

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogProfileId },
    select: { name: true },
  });

  const existing = await findExistingReceiptByBarcode(barcode);
  if (existing) {
    const resolution = await resolveExistingBarcodeReceipt(
      existing,
      dogProfileId,
      dog?.name ?? "",
    );
    if (resolution.action === "redirect") {
      console.info("[receipt] resuming existing barcode claim", {
        scanned: barcode,
        canonical: canonicalReceiptBarcode(barcode),
        existingId: existing.id,
        existingStatus: existing.status,
        dogProfileId,
        path: resolution.path,
      });
      revalidatePath(`/dogs/${dogProfileId}`);
      return resolution.path;
    }
    console.warn("[receipt] duplicate barcode blocked", {
      scanned: barcode,
      canonical: canonicalReceiptBarcode(barcode),
      existingId: existing.id,
      existingBarcode: existing.barcode,
      existingStatus: existing.status,
      dogProfileId,
      code: resolution.code,
      coins: resolution.coins,
    });
    const err = new Error(resolution.code);
    (err as Error & { claimedCoins?: number }).claimedCoins =
      resolution.coins;
    throw err;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scansToday = await prisma.receipt.count({
    where: { dogProfileId, scannedAt: { gte: todayStart } },
  });
  if (scansToday >= 5) {
    console.warn("[receipt] daily scan limit reached", {
      dogProfileId,
      scansToday,
      barcode,
    });
    throw new Error(RECEIPT_ERROR.DAILY_LIMIT);
  }

  const mplus = await lookupReceiptByBarcode(barcode);

  if (!mplus) {
    const receipt = await prisma.receipt.create({
      data: {
        dogProfileId,
        barcode,
        imageUrl: null,
        status: "PENDING",
      },
    });
    console.info("[receipt] barcode not found in mplus, saved pending", {
      dogProfileId,
      barcode,
      receiptId: receipt.id,
    });
    revalidatePath(`/dogs/${dogProfileId}`);
    return `/receipts/${receipt.id}/pending`;
  }

  const storedBarcode = normalizeReceiptBarcode(mplus.barcode);

  const products = mplus.lines.map((line) => ({
    rawName: line.name,
    normalizedName: line.name,
    quantity: line.quantity,
    category: guessCategoryFromName(line.name),
  }));

  const receipt = await prisma.receipt.create({
    data: {
      dogProfileId,
      barcode: storedBarcode,
      status: "PENDING",
      totalEur: mplus.totalEur,
      items: {
        create: products.map((p) => ({
          rawName: p.rawName,
          normalizedName: p.normalizedName,
          quantity: p.quantity,
          category: p.category,
        })),
      },
    },
  });

  revalidatePath(`/receipts/${receipt.id}/review`);
  return `/receipts/${receipt.id}/review`;
}

export async function claimReceiptBarcodeFormAction(
  _prev: ClaimReceiptBarcodeState,
  formData: FormData,
): Promise<ClaimReceiptBarcodeState> {
  try {
    const redirectTo = await claimReceiptBarcode(formData);
    return { redirectTo };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const barcode = normalizeReceiptBarcode(String(formData.get("barcode") ?? ""));
      const dogProfileId = String(formData.get("dogProfileId") ?? "");
      const raced = await findExistingReceiptByBarcode(barcode);
      if (raced) {
        const dog = await prisma.dogProfile.findUnique({
          where: { id: dogProfileId },
          select: { name: true },
        });
        const resolution = await resolveExistingBarcodeReceipt(
          raced,
          dogProfileId,
          dog?.name ?? "",
        );
        if (resolution.action === "redirect") {
          return { redirectTo: resolution.path };
        }
        return {
          error: resolution.code,
          claimedCoins: resolution.coins,
        };
      }
      return { error: RECEIPT_ERROR.DUPLICATE };
    }
    const claimedCoins =
      error instanceof Error
        ? (error as Error & { claimedCoins?: number }).claimedCoins
        : undefined;
    const message =
      error instanceof Error ? error.message : RECEIPT_ERROR.INVALID_INPUT;
    return { error: message, claimedCoins };
  }
}

/** @deprecated Use claimReceiptBarcodeFormAction via useActionState */
export async function claimReceiptBarcodeAction(formData: FormData) {
  const redirectTo = await claimReceiptBarcode(formData);
  redirect(redirectTo);
}

/** @deprecated gebruik claimReceiptBarcodeAction */
export async function manualReceiptAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const dogProfileId = String(formData.get("dogProfileId") ?? "");
  const itemsJson = String(formData.get("items") ?? "[]");

  let items: z.infer<typeof manualItemSchema>[];
  try {
    items = z.array(manualItemSchema).min(1).parse(JSON.parse(itemsJson));
  } catch {
    throw new Error("Voeg minstens één product toe");
  }

  await assertDogAccess(dogProfileId, userId, role);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scansToday = await prisma.receipt.count({
    where: { dogProfileId, scannedAt: { gte: todayStart } },
  });
  if (scansToday >= 5) {
    throw new Error("Maximaal 5 bonnen per hond per dag");
  }

  const catalogByArticle = new Map(
    loadProductCatalog().map((p) => [p.articleNumber, p]),
  );

  const normalizedItems = items.map((item) => {
    const product = catalogByArticle.get(item.articleNumber);
    return {
      rawName: item.name,
      normalizedName: item.name,
      quantity: item.quantity,
      category: guessCategoryFromName(item.name),
      unitPriceEur: product?.priceEur ?? null,
    };
  });

  const totalEur = estimateReceiptTotalEur(normalizedItems);
  const coins = coinsFromPurchaseEur(totalEur);

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.receipt.create({
      data: {
        dogProfileId,
        imageUrl: null,
        status: "CONFIRMED",
        totalEur,
        confirmedAt: new Date(),
      },
    });
    await tx.receiptItem.createMany({
      data: normalizedItems.map((item) => ({
        receiptId: created.id,
        rawName: item.rawName,
        normalizedName: item.normalizedName,
        quantity: item.quantity,
        category: item.category,
        unitPriceEur: item.unitPriceEur,
      })),
    });
    return created;
  });

  await processDogEvent({
    dogProfileId,
    eventType: "RECEIPT_CONFIRMED",
    payload: { receiptId: receipt.id, purchaseAmountEur: totalEur },
  });

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogProfileId },
    select: { name: true },
  });

  revalidatePath(`/dogs/${dogProfileId}`);
  redirect(
    `/receipts/${receipt.id}/success?coins=${coins}&total=${totalEur.toFixed(2)}&dog=${encodeURIComponent(dog?.name ?? "")}`,
  );
}

export async function scanReceiptAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const dogProfileId = String(formData.get("dogProfileId") ?? "");
  const file = formData.get("image");

  if (!dogProfileId || !(file instanceof File)) {
    throw new Error("Kies een hond en een bonfoto");
  }

  await assertDogAccess(dogProfileId, userId, role);

  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Alleen JPG, PNG of WebP toegestaan");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Foto is te groot (max 5 MB)");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scansToday = await prisma.receipt.count({
    where: {
      dogProfileId,
      scannedAt: { gte: todayStart },
    },
  });
  if (scansToday >= 5) {
    throw new Error("Maximaal 5 bonnen per hond per dag");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Bonfoto-AI is niet ingeschakeld. Gebruik Bon registreren (gratis) via het menu.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const receipt = await prisma.receipt.create({
    data: {
      dogProfileId,
      imageUrl: "pending",
      status: "PENDING",
    },
  });

  const filename = await saveReceiptImage(receipt.id, buffer, file.type);
  await prisma.receipt.update({
    where: { id: receipt.id },
    data: { imageUrl: filename },
  });

  let products;
  try {
    products = await recognizeReceiptProducts(base64, file.type);
  } catch (err) {
    await prisma.receiptItem.deleteMany({ where: { receiptId: receipt.id } });
    await prisma.receipt.delete({ where: { id: receipt.id } });
    throw err;
  }

  if (products.length === 0) {
    products = [
      {
        rawName: "Onbekend product",
        normalizedName: "Product handmatig invullen",
        quantity: 1,
        category: parseProductCategory("OTHER"),
      },
    ];
  }

  await prisma.receiptItem.createMany({
    data: products.map((p) => ({
      receiptId: receipt.id,
      rawName: p.rawName,
      normalizedName: p.normalizedName,
      quantity: p.quantity,
      category: p.category,
    })),
  });

  revalidatePath(`/receipts/${receipt.id}/review`);
  redirect(`/receipts/${receipt.id}/review`);
}

export async function confirmReceiptAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const receiptId = String(formData.get("receiptId") ?? "");
  const useStoredItems = formData.get("useStoredItems") === "true";
  const itemsJson = String(formData.get("items") ?? "[]");
  const purchaseTotalRaw = String(formData.get("purchaseTotalEur") ?? "");

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { dog: true, items: true },
  });
  if (!receipt || receipt.status !== "PENDING") {
    throw new Error("Bon niet gevonden of al bevestigd");
  }

  await assertDogAccess(receipt.dogProfileId, userId, role);

  let normalizedItems: {
    rawName: string;
    normalizedName: string;
    quantity: number;
    category: ReturnType<typeof parseProductCategory>;
  }[];

  if (useStoredItems) {
    if (receipt.items.length === 0) {
      throw new Error("Voeg minstens één product toe");
    }
    normalizedItems = receipt.items.map((item) => ({
      rawName: item.rawName.trim() || item.normalizedName.trim(),
      normalizedName: item.normalizedName.trim(),
      quantity: item.quantity,
      category: item.category,
    }));
  } else {
    let items: z.infer<typeof itemSchema>[];
    try {
      items = z.array(itemSchema).min(1).parse(JSON.parse(itemsJson));
    } catch {
      throw new Error("Voeg minstens één product toe");
    }
    normalizedItems = items.map((item) => ({
      rawName: item.rawName.trim() || item.normalizedName.trim(),
      normalizedName: item.normalizedName.trim(),
      quantity: item.quantity,
      category: parseProductCategory(item.category),
    }));
  }

  const estimatedTotal = estimateReceiptTotalEur(normalizedItems);
  const purchaseTotal =
    parsePurchaseTotalEur(purchaseTotalRaw) ?? estimatedTotal;
  const coins = coinsFromPurchaseEur(purchaseTotal);

  await prisma.$transaction(async (tx) => {
    if (!useStoredItems) {
      await tx.receiptItem.deleteMany({ where: { receiptId } });
      await tx.receiptItem.createMany({
        data: normalizedItems.map((item) => ({
          receiptId,
          ...item,
        })),
      });
    }
    await tx.receipt.update({
      where: { id: receiptId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        totalEur: purchaseTotal,
      },
    });
  });

  await processDogEvent({
    dogProfileId: receipt.dogProfileId,
    eventType: "RECEIPT_CONFIRMED",
    payload: { receiptId, purchaseAmountEur: purchaseTotal },
  });

  revalidatePath(`/dogs/${receipt.dogProfileId}`);
  redirect(
    `/receipts/${receiptId}/success?coins=${coins}&total=${purchaseTotal.toFixed(2)}&dog=${encodeURIComponent(receipt.dog.name)}`,
  );
}

export async function cancelReceiptAction(receiptId: string) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  });
  if (!receipt || receipt.status !== "PENDING") return;

  await assertDogAccess(receipt.dogProfileId, userId, role);

  await prisma.receiptItem.deleteMany({ where: { receiptId } });
  await prisma.receipt.delete({ where: { id: receiptId } });

  redirect("/receipts/scan");
}
