import { VoucherCodes } from "@/app/rewards/_components/VoucherCodes";
import { getTranslations } from "@/i18n/server";
import { prisma } from "@/lib/prisma";

type ActiveVouchersListProps = {
  dogProfileId: string;
  compact?: boolean;
};

export async function ActiveVouchersList({
  dogProfileId,
  compact = false,
}: ActiveVouchersListProps) {
  const { t } = await getTranslations();

  const vouchers = await prisma.rewardVoucher.findMany({
    where: {
      dogProfileId,
      status: { in: ["ACTIVE", "VALIDATED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (vouchers.length === 0) {
    return (
      <p className="text-sm text-[var(--foreground-muted)]">
        {t("rewards.vouchers.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {vouchers.map((voucher) => (
        <article key={voucher.id} className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">{voucher.rewardTitle}</h3>
            {voucher.status === "VALIDATED" && (
              <span className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {t("rewards.vouchers.validated")}
              </span>
            )}
          </div>
          <VoucherCodes
            code={voucher.code}
            rewardTitle={voucher.rewardTitle}
            compact={compact}
          />
        </article>
      ))}
    </div>
  );
}
