import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "@/i18n/server";
import { isMplusConfigured } from "@/lib/mplus/config";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function ReceiptPendingPage({
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

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { dog: { select: { id: true, name: true, ownerUserId: true } } },
  });

  if (!receipt || receipt.dog.ownerUserId !== userId) notFound();

  const mplusReady = isMplusConfigured();

  return (
    <div className="card p-8 text-center space-y-4">
      {resumed === "1" && (
        <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl py-2 px-3">
          {t("receipts.pending.resumed")}
        </p>
      )}
      <p className="text-5xl">🧾</p>
      <h1 className="font-display text-3xl">{t("receipts.pending.title")}</h1>
      <p className="text-black/65 text-sm">
        {t("receipts.pending.message", { dogName: receipt.dog.name })}
      </p>
      {receipt.barcode && (
        <p className="font-mono text-sm bg-black/5 rounded-xl py-2 px-3 inline-block">
          {receipt.barcode}
        </p>
      )}
      <p className="text-sm text-black/60">
        {mplusReady
          ? t("receipts.pending.notFoundHint")
          : t("receipts.pending.activationHint")}
      </p>
      <div className="flex flex-col gap-3 pt-2">
        <Link
          href={`/receipts/scan?dog=${receipt.dog.id}`}
          className="btn btn-primary inline-flex"
        >
          {t("receipts.barcodeForm.retryScan")}
        </Link>
        <Link href={`/dogs/${receipt.dog.id}`} className="btn btn-secondary inline-flex">
          {t("receipts.pending.toDogProfile")}
        </Link>
      </div>
    </div>
  );
}
