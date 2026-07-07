import Link from "next/link";
import { redirect } from "next/navigation";

import { ManualReceiptForm } from "@/app/receipts/_components/ManualReceiptForm";
import { getTranslations } from "@/i18n/server";
import { loadProductCatalog } from "@/lib/catalog/products";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function ManualReceiptPage({
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

  const products = loadProductCatalog();
  if (products.length === 0) redirect("/receipts/scan");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/receipts/scan" className="text-sm text-black/50 hover:underline">
          {t("receipts.manual.backToScan")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("receipts.manual.title")}</h1>
        <p className="text-black/60 text-sm mt-1">{t("receipts.manual.description")}</p>
      </div>

      <ManualReceiptForm dogs={dogs} products={products} defaultDogId={dog} />
    </div>
  );
}
