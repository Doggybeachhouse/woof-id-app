import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceiptBarcodeForm } from "@/app/receipts/_components/ReceiptBarcodeForm";
import { getTranslations } from "@/i18n/server";
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

  const mplusReady = !!(
    process.env.MPLUS_API_URL &&
    process.env.MPLUS_IDENT &&
    process.env.MPLUS_SECRET
  );

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

      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-black/65">
          {mplusReady
            ? t("receipts.scan.manualFallback")
            : t("receipts.scan.manualFallbackPending")}
        </p>
        <Link
          href={dog ? `/receipts/manual?dog=${dog}` : "/receipts/manual"}
          className="btn btn-secondary text-sm inline-flex"
        >
          {t("receipts.scan.manualLink")}
        </Link>
      </div>

      <p className="text-center text-sm">
        <Link href="/dogs" className="underline text-black/60">
          {t("receipts.scan.backToDogs")}
        </Link>
      </p>
    </div>
  );
}
