import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { getReceiptCoinsAwarded } from "@/lib/receipts/receiptClaim";
import { requireStaff } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const { t } = await getTranslations();
  await requireStaff();
  const { barcode } = await searchParams;

  const receipts = await prisma.receipt.findMany({
    where: barcode?.trim()
      ? { barcode: { contains: barcode.trim() } }
      : undefined,
    orderBy: { scannedAt: "desc" },
    take: 50,
    include: {
      dog: { select: { name: true, woofId: true } },
      items: { select: { id: true } },
    },
  });

  const coinsByReceipt = await Promise.all(
    receipts.map((r) => getReceiptCoinsAwarded(r.id)),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-black/50 hover:underline">
          ← Admin
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("admin.receipts.title")}</h1>
        <p className="text-sm text-black/55">{t("admin.receipts.description")}</p>
      </div>

      <form className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[12rem]">
          <label className="label" htmlFor="barcode">
            {t("admin.receipts.barcodeFilter")}
          </label>
          <input
            id="barcode"
            name="barcode"
            className="input font-mono"
            defaultValue={barcode ?? ""}
            placeholder={t("admin.receipts.barcodePlaceholder")}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          {t("admin.receipts.search")}
        </button>
      </form>

      <div className="space-y-2">
        {receipts.length === 0 ? (
          <p className="text-sm text-black/55">{t("admin.receipts.empty")}</p>
        ) : (
          receipts.map((receipt, index) => {
            const coins = coinsByReceipt[index];
            const stuck =
              receipt.status === "CONFIRMED" && coins === 0 && receipt.totalEur;
            return (
              <div key={receipt.id} className="card p-4 text-sm space-y-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <span className="font-semibold">{receipt.dog.name}</span>
                  <span className="text-black/45">{receipt.dog.woofId}</span>
                  <span
                    className={
                      receipt.status === "PENDING"
                        ? "text-amber-700"
                        : stuck
                          ? "text-red-600"
                          : "text-emerald-700"
                    }
                  >
                    {receipt.status}
                    {stuck ? " · no coins" : coins > 0 ? ` · +${coins} coins` : ""}
                  </span>
                </div>
                <p className="font-mono text-xs text-black/60">
                  {receipt.barcode ?? "—"} · {receipt.id}
                </p>
                <p className="text-xs text-black/45">
                  {receipt.items.length} items
                  {receipt.totalEur != null
                    ? ` · €${Number(receipt.totalEur).toFixed(2)}`
                    : ""}
                  {" · "}
                  {receipt.scannedAt.toLocaleString("nl-NL")}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
