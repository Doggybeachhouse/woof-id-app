"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  submitCheckInAction,
  type CheckInFormState,
} from "@/app/dogs/actions";
import { useI18n } from "@/i18n/client";

type DogOption = {
  id: string;
  name: string;
  woofId: string;
};

const initialState: CheckInFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      className="btn btn-primary w-full text-lg"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? t("checkIn.page.submitLoading") : t("checkIn.page.submit")}
    </button>
  );
}

export function CheckInForm({
  dogs,
  checkedInTodayNames,
  locKey,
  token,
  preselectedDogId,
}: {
  dogs: DogOption[];
  checkedInTodayNames: string[];
  locKey: string;
  token: string;
  preselectedDogId?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction] = useActionState(submitCheckInAction, initialState);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state.redirectTo, router]);

  const defaultDogId =
    preselectedDogId && dogs.some((d) => d.id === preselectedDogId)
      ? preselectedDogId
      : dogs[0]?.id;

  return (
    <form action={formAction} className="card p-6 space-y-4">
      <input type="hidden" name="loc" value={locKey} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="dogProfileId">
          {t("checkIn.page.selectDogLabel")}
        </label>
        <select
          id="dogProfileId"
          name="dogProfileId"
          className="input"
          defaultValue={defaultDogId}
          required
        >
          {dogs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.woofId})
            </option>
          ))}
        </select>
      </div>

      {checkedInTodayNames.length > 0 && (
        <p className="text-xs text-[var(--foreground-muted)]">
          {t("checkIn.page.alreadyCheckedInToday")}{" "}
          {checkedInTodayNames.join(", ")}
        </p>
      )}

      <p className="text-xs text-[var(--foreground-muted)]">
        {t("checkIn.page.maxPerDay")}
      </p>

      {state.error && (
        <div className="card p-4 text-sm text-red-700 bg-red-50 border-red-200">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
