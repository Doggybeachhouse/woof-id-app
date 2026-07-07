import Link from "next/link";

import { RecoveryLinkForm } from "@/app/admin/users/_components/RecoveryLinkForm";
import { getTranslations } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";

export default async function AdminUsersPage() {
  const { t } = await getTranslations();
  await requireStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{t("admin.users.title")}</h1>
        <p className="text-sm text-black/60 mt-1">
          {t("admin.users.description")}
        </p>
      </div>

      <RecoveryLinkForm />

      <Link href="/admin" className="text-sm underline text-black/55">
        {t("admin.users.backToAdmin")}
      </Link>
    </div>
  );
}
