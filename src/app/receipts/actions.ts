"use server";

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
  if (!dog) throw new Error("Hond niet gevonden");
  return dog;
}

const manualItemSchema = z.object({
  articleNumber: z.string().min(1),
  name: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(99),
});

export async function claimReceiptBarcodeAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const dogProfileId = String(formData.get("dogProfileId") ?? "");
  const barcode = String(formData.get("barcode") ?? "").trim();

  if (!dogProfileId || barcode.length < 4) {
    throw new Error("Kies een hond en scan een geldige barcode");
  }

  await assertDogAccess(dogProfileId, userId, role);

  const existing = await prisma.receipt.findUnique({ where: { barcode } });
  if (existing) {
    throw new Error("Deze bon is al geregistreerd voor Woof Coins");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scansToday = await prisma.receipt.count({
    where: { dogProfileId, scannedAt: { gte: todayStart } },
  });
  if (scansToday >= 5) {
    throw new Error("Maximaal 5 bonnen per hond per dag");
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
    revalidatePath(`/dogs/${dogProfileId}`);
    redirect(`/receipts/${receipt.id}/pending`);
  }

  const products = mplus.lines.map((line) => ({
    rawName: line.name,
    normalizedName: line.name,
    quantity: line.quantity,
    category: guessCategoryFromName(line.name),
  }));

  const receipt = await prisma.receipt.create({
    data: {
      dogProfileId,
      barcode,
      status: "PENDING",
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
  redirect(`/receipts/${receipt.id}/review`);
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
  const itemsJson = String(formData.get("items") ?? "[]");
  const purchaseTotalRaw = String(formData.get("purchaseTotalEur") ?? "");

  let items: z.infer<typeof itemSchema>[];
  try {
    items = z.array(itemSchema).min(1).parse(JSON.parse(itemsJson));
  } catch {
    throw new Error("Voeg minstens één product toe");
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { dog: true, items: true },
  });
  if (!receipt || receipt.status !== "PENDING") {
    throw new Error("Bon niet gevonden of al bevestigd");
  }

  await assertDogAccess(receipt.dogProfileId, userId, role);

  const normalizedItems = items.map((item) => ({
    rawName: item.rawName.trim() || item.normalizedName.trim(),
    normalizedName: item.normalizedName.trim(),
    quantity: item.quantity,
    category: parseProductCategory(item.category),
  }));

  const estimatedTotal = estimateReceiptTotalEur(normalizedItems);
  const purchaseTotal =
    parsePurchaseTotalEur(purchaseTotalRaw) ?? estimatedTotal;
  const coins = coinsFromPurchaseEur(purchaseTotal);

  await prisma.$transaction(async (tx) => {
    await tx.receiptItem.deleteMany({ where: { receiptId } });
    await tx.receiptItem.createMany({
      data: normalizedItems.map((item) => ({
        receiptId,
        ...item,
      })),
    });
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
