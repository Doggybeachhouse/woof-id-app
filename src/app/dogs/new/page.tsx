import Link from "next/link";

import { createDogAction } from "@/app/dogs/actions";
import { getTranslations } from "@/i18n/server";

export default async function NewDogPage() {
  const { t } = await getTranslations();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dogs" className="text-sm text-black/50 hover:underline">
          {t("dogs.new.back")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("dogs.new.title")}</h1>
      </div>

      <form
        action={createDogAction}
        className="card p-6 space-y-4"
        encType="multipart/form-data"
      >
        <div>
          <label className="label" htmlFor="photo">
            {t("dogs.new.photoLabel")}
          </label>
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
            {t("dogs.new.nameLabel")}
          </label>
          <input id="name" name="name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="breed">
            {t("dogs.new.breedLabel")}
          </label>
          <input id="breed" name="breed" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="birthday">
              {t("dogs.new.birthdayLabel")}
            </label>
            <input id="birthday" name="birthday" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="weightKg">
              {t("dogs.new.weightLabel")}
            </label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              step="0.1"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="favoriteSnack">
            {t("dogs.new.favoriteSnackLabel")}
          </label>
          <input id="favoriteSnack" name="favoriteSnack" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="favoriteIceCream">
            {t("dogs.new.favoriteIceCreamLabel")}
          </label>
          <input id="favoriteIceCream" name="favoriteIceCream" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="personality">
            {t("dogs.new.personalityLabel")}
          </label>
          <textarea
            id="personality"
            name="personality"
            className="input min-h-24"
            rows={3}
          />
        </div>
        <div className="border-t border-black/10 pt-4">
          <label className="label" htmlFor="walletCardId">
            {t("dogs.new.walletLabel")}
          </label>
          <input
            id="walletCardId"
            name="walletCardId"
            className="input font-mono"
            placeholder={t("dogs.new.walletPlaceholder")}
          />
          <p className="text-xs text-black/50 mt-1">
            {t("dogs.new.walletHint")}
          </p>
        </div>
        <button type="submit" className="btn btn-primary w-full">
          {t("dogs.new.submit")}
        </button>
      </form>
    </div>
  );
}
