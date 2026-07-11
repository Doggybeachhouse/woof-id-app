import Link from "next/link";
import { notFound } from "next/navigation";

import { ReceiptReviewForm } from "@/app/receipts/_components/ReceiptReviewForm";
import { cancelReceiptAction } from "@/app/receipts/actions";
import { coinsFromPurchaseEur } from "@/lib/gamification/receiptCoins";
import { estimateReceiptTotalEur } from "@/lib/gamification/receiptTotal.server";
import { getTranslations } from "@/i18n/server";
import { requireUser, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function ReceiptReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resumed?: string }>;
}) {
  const { t } = await getTranslations();
  const { id } = await params;
  const { resumed } = await searchParams;
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      dog: true,
      items: true,
    },
  });

  if (!receipt) notFound();
  if (receipt.status !== "PENDING") {
    return (
      <div className="card p-6 text-center space-y-3">
        <p>{t("receipts.review.alreadyConfirmed")}</p>
        <Link href={`/dogs/${receipt.dogProfileId}`} className="btn btn-primary">
          {t("receipts.review.toDog", { dogName: receipt.dog.name })}
        </Link>
      </div>
    );
  }

  const canView =
    isStaffRole(role) || receipt.dog.ownerUserId === userId;
  if (!canView) notFound();

  const storedTotalEur =
    receipt.totalEur != null ? Number(receipt.totalEur) : null;
  const fromMplus = !!receipt.barcode && receipt.items.length > 0;

  const initialPurchaseTotalEur =
    storedTotalEur ??
    estimateReceiptTotalEur(
      receipt.items.map((item) => ({
        normalizedName: item.normalizedName,
        quantity: item.quantity,
        unitPriceEur:
          item.unitPriceEur != null ? Number(item.unitPriceEur) : null,
      })),
    );

  const previewCoins = coinsFromPurchaseEur(initialPurchaseTotalEur);

  return (
    <div className="space-y-6">
      {resumed === "1" && (
        <div className="card p-4 bg-amber-50 border border-amber-200/80 text-sm text-amber-900 text-center">
          {t("receipts.review.resumed")}
        </div>
      )}
      <div>
        <Link
          href="/receipts/scan"
          className="text-sm text-black/50 hover:underline"
        >
          {t("receipts.review.back")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("receipts.review.title")}</h1>
        <p className="text-black/50 text-sm">
          {t("receipts.review.forDog", { dogName: receipt.dog.name })}
        </p>
      </div>

      {fromMplus && initialPurchaseTotalEur > 0 && (
        <div className="card p-4 bg-emerald-50 border border-emerald-200/80 space-y-2 text-center">
          <p className="text-sm font-semibold text-emerald-900">
            {t("receipts.review.mplusFound")}
          </p>
          <p className="text-sm text-emerald-800">
            {t("receipts.review.mplusTotal", {
              total: initialPurchaseTotalEur.toFixed(2),
            })}
          </p>
          <span className="coin-badge">
            {t("receipts.review.coinsAfterConfirm", { count: previewCoins })}
          </span>
        </div>
      )}

      {receipt.imageUrl && (
        <div className="card p-3 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/receipts/${receipt.id}/image`}
            alt={t("receipts.review.receiptPhotoAlt")}
            className="w-full max-h-48 object-contain bg-white rounded-lg"
          />
        </div>
      )}

      <ReceiptReviewForm
        receiptId={receipt.id}
        fromMplus={fromMplus}
        initialItems={receipt.items.map((item) => ({
          rawName: item.rawName,
          normalizedName: item.normalizedName,
          quantity: item.quantity,
          category: item.category,
        }))}
        initialPurchaseTotalEur={initialPurchaseTotalEur}
      />

      <form action={cancelReceiptAction.bind(null, receipt.id)}>
        <button type="submit" className="text-sm text-black/40 underline w-full">
          {t("receipts.review.cancel")}
        </button>
      </form>
    </div>
  );
}
