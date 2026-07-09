import Link from "next/link";

import { PushAdminForm } from "@/app/admin/push/_components/PushAdminForm";
import { getTranslations } from "@/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/serverAuth";

export default async function AdminPushPage() {
  const { t } = await getTranslations();
  await requireAdmin();

  const subscriberCount = await prisma.pushSubscription.count();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-black/50 hover:text-black">
          {t("push.admin.back")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("push.admin.title")}</h1>
        <p className="text-sm text-black/60 mt-1">{t("push.admin.description")}</p>
      </div>

      <PushAdminForm subscriberCount={subscriberCount} />
    </div>
  );
}
