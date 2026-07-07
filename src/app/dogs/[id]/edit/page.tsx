import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

import { updateDogAction } from "@/app/dogs/actions";
import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function EditDogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getTranslations();
  const { id } = await params;
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const dog = await prisma.dogProfile.findFirst({
    where: { id, ownerUserId: userId },
    include: { walletLink: true },
  });

  if (!dog) notFound();

  const birthdayValue = dog.birthday
    ? DateTime.fromJSDate(dog.birthday).toFormat("yyyy-MM-dd")
    : "";

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dogs/${dog.id}`} className="text-sm text-black/50 hover:underline">
          {t("dogs.edit.back", { dogName: dog.name })}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("dogs.edit.title")}</h1>
      </div>

      <form action={updateDogAction} className="card p-6 space-y-4" encType="multipart/form-data">
        <input type="hidden" name="dogId" value={dog.id} />

        <div>
          <label className="label" htmlFor="photo">
            {t("dogs.edit.photoLabel", { dogName: dog.name })}
          </label>
          {dog.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/dogs/${dog.id}/photo`}
              alt={dog.name}
              className="w-28 h-28 rounded-2xl object-cover border border-black/10 mb-2"
            />
          )}
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="name">
            {t("dogs.edit.nameLabel")}
          </label>
          <input id="name" name="name" className="input" defaultValue={dog.name} required />
        </div>

        <div>
          <label className="label" htmlFor="breed">
            {t("dogs.edit.breedLabel")}
          </label>
          <input id="breed" name="breed" className="input" defaultValue={dog.breed ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="birthday">
              {t("dogs.edit.birthdayLabel")}
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              className="input"
              defaultValue={birthdayValue}
            />
          </div>
          <div>
            <label className="label" htmlFor="weightKg">
              {t("dogs.edit.weightLabel")}
            </label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              step="0.1"
              className="input"
              defaultValue={dog.weightKg ?? ""}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="favoriteSnack">
            {t("dogs.edit.favoriteSnackLabel")}
          </label>
          <input
            id="favoriteSnack"
            name="favoriteSnack"
            className="input"
            defaultValue={dog.favoriteSnack ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="favoriteIceCream">
            {t("dogs.edit.favoriteIceCreamLabel")}
          </label>
          <input
            id="favoriteIceCream"
            name="favoriteIceCream"
            className="input"
            defaultValue={dog.favoriteIceCream ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="personality">
            {t("dogs.edit.personalityLabel")}
          </label>
          <textarea
            id="personality"
            name="personality"
            className="input min-h-24"
            rows={3}
            defaultValue={dog.personality ?? ""}
          />
        </div>

        <div className="border-t border-black/10 pt-4">
          <label className="label" htmlFor="walletCardId">
            {t("dogs.edit.walletLabel")}
          </label>
          <input
            id="walletCardId"
            name="walletCardId"
            className="input font-mono"
            placeholder={t("dogs.edit.walletPlaceholder")}
            defaultValue={dog.walletLink?.walletCardId ?? ""}
          />
          <p className="text-xs text-black/50 mt-1">
            {t("dogs.edit.walletHint")}
          </p>
        </div>

        <button type="submit" className="btn btn-primary w-full">
          {t("dogs.edit.submit")}
        </button>
      </form>
    </div>
  );
}
