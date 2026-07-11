import Link from "next/link";

import { VoucherScannerForm } from "@/app/admin/vouchers/_components/VoucherScannerForm";
import { getTranslations } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminVouchersPage() {
  const { t } = await getTranslations();
  await requireStaff();

  const recent = await prisma.rewardVoucher.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      dog: { select: { name: true, woofId: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{t("admin.vouchers.title")}</h1>
        <p className="text-sm text-black/60 mt-1">
          {t("admin.vouchers.description")}
        </p>
      </div>

      <VoucherScannerForm />

      <p className="text-sm text-black/60">
        {t("checkIn.display.scanVoucherButton")}{" "}
        <Link href="/admin/check-in-display" className="underline">
          {t("admin.home.openQrDisplay")}
        </Link>
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl">{t("admin.vouchers.recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-black/50">{t("admin.vouchers.empty")}</p>
        ) : (
          recent.map((voucher) => (
            <div key={voucher.id} className="card p-4 text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{voucher.rewardTitle}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    voucher.status === "ACTIVE"
                      ? "bg-[#ffde5b]/50"
                      : voucher.status === "VALIDATED"
                        ? "bg-amber-100 text-amber-800"
                      : voucher.status === "REDEEMED"
                        ? "bg-green-100 text-green-800"
                        : "bg-black/10"
                  }`}
                >
                  {t(`admin.vouchers.status.${voucher.status}`)}
                </span>
              </div>
              <p>
                {voucher.dog.name} · {voucher.dog.woofId}
              </p>
              <p className="font-mono text-xs text-black/50">{voucher.code}</p>
            </div>
          ))
        )}
      </section>

      <Link href="/admin" className="text-sm underline text-black/55">
        {t("admin.vouchers.backToAdmin")}
      </Link>
    </div>
  );
}
