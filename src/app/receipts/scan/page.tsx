import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceiptBarcodeForm } from "@/app/receipts/_components/ReceiptBarcodeForm";
import { getTranslations } from "@/i18n/server";
import { isMplusConfigured } from "@/lib/mplus/config";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function ReceiptScanPage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>;
}) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const { dog } = await searchParams;

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, woofId: true },
  });

  if (dogs.length === 0) redirect("/dogs/new");

  const mplusReady = isMplusConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{t("receipts.scan.title")}</h1>
        <p className="text-black/60 text-sm mt-1">
          {t("receipts.scan.description")}
        </p>
      </div>

      <ReceiptBarcodeForm
        dogs={dogs}
        defaultDogId={dog}
        mplusReady={mplusReady}
      />

      <p className="text-center text-sm">
        <Link href="/dogs" className="underline text-black/60">
          {t("receipts.scan.backToDogs")}
        </Link>
      </p>
    </div>
  );
}
