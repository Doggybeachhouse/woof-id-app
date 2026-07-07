import Link from "next/link";
import { notFound } from "next/navigation";

import { ReceiptReviewForm } from "@/app/receipts/_components/ReceiptReviewForm";
import { cancelReceiptAction } from "@/app/receipts/actions";
import { getTranslations } from "@/i18n/server";
import { requireUser, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function ReceiptReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getTranslations();
  const { id } = await params;
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

  return (
    <div className="space-y-6">
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

      <div className="card p-3 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/receipts/${receipt.id}/image`}
          alt={t("receipts.review.receiptPhotoAlt")}
          className="w-full max-h-48 object-contain bg-white rounded-lg"
        />
      </div>

      <ReceiptReviewForm
        receiptId={receipt.id}
        initialItems={receipt.items.map((item) => ({
          rawName: item.rawName,
          normalizedName: item.normalizedName,
          quantity: item.quantity,
          category: item.category,
        }))}
      />

      <form action={cancelReceiptAction.bind(null, receipt.id)}>
        <button type="submit" className="text-sm text-black/40 underline w-full">
          {t("receipts.review.cancel")}
        </button>
      </form>
    </div>
  );
}
