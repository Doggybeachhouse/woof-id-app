"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  startWalletTopUpAction,
  type TopUpFormState,
} from "@/app/wallet/top-up/actions";
import { useI18n } from "@/i18n/client";

type DogOption = {
  id: string;
  name: string;
  woofId: string;
  walletCardId: string;
};

type DogWithoutWallet = {
  id: string;
  name: string;
};

const PRESETS = ["10", "20", "25", "50"];

const ERROR_KEYS: Record<string, string> = {
  invalid_email: "errors.wallet.invalidEmail",
  invalid_barcode: "errors.wallet.invalidBarcode",
  invalid_amount: "errors.wallet.invalidAmount",
  barcode_not_found: "errors.wallet.barcodeNotFound",
  no_webshop_account: "errors.wallet.noWebshopAccount",
  wwm_no_barcode: "errors.wallet.noBarcode",
  wwm_no_product: "errors.wallet.noProduct",
  wwm_no_cart: "errors.wallet.noCart",
  wwm_cart_add_failed: "errors.wallet.cartAddFailed",
  wallet_plugin_missing: "errors.wallet.pluginMissing",
  woocommerce_missing: "errors.wallet.woocommerceMissing",
  rest_no_route: "errors.wallet.restNoRoute",
  auth_failed: "errors.wallet.authFailed",
  network_error: "errors.wallet.networkError",
  no_checkout_url: "errors.wallet.noCheckoutUrl",
  unknown: "errors.wallet.topUpFailed",
  not_configured: "errors.wallet.notConfigured",
};

const initialState: TopUpFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? t("wallet.topUp.submitLoading") : t("wallet.topUp.submit")}
    </button>
  );
}

export function WalletTopUpForm({
  dogs,
  dogsWithoutWallet = [],
  userEmail,
  preselectedDogId,
}: {
  dogs: DogOption[];
  dogsWithoutWallet?: DogWithoutWallet[];
  userEmail: string;
  preselectedDogId?: string;
}) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const initialDogId =
    dogs.find((d) => d.id === preselectedDogId)?.id ?? dogs[0]?.id ?? "";
  const [dogId, setDogId] = useState(initialDogId);
  const [state, formAction] = useActionState(startWalletTopUpAction, initialState);

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.assign(state.checkoutUrl);
    }
  }, [state.checkoutUrl]);

  function clearCustomAmount() {
    const custom = formRef.current?.elements.namedItem(
      "amountEurCustom",
    ) as HTMLInputElement | null;
    if (custom) custom.value = "";
  }

  function onCustomAmountChange() {
    const form = formRef.current;
    if (!form) return;
    form
      .querySelectorAll<HTMLInputElement>('input[name="amountEur"]')
      .forEach((radio) => {
        radio.checked = false;
      });
  }

  if (dogs.length === 0) {
    return (
      <div className="card-luxe p-6 space-y-4">
        <div>
          <p className="eyebrow">{t("wallet.topUp.eyebrow")}</p>
          <h1 className="font-display text-3xl">{t("wallet.topUp.title")}</h1>
        </div>
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("wallet.topUp.noWalletBody")}
        </p>
        {dogsWithoutWallet.length > 0 && (
          <ul className="space-y-2">
            {dogsWithoutWallet.map((dog) => (
              <li key={dog.id}>
                <Link
                  href={`/dogs/${dog.id}/edit`}
                  className="btn btn-secondary w-full text-sm"
                >
                  {t("wallet.topUp.linkWalletFor", { dogName: dog.name })}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dogs" className="btn btn-primary inline-flex">
          {t("wallet.topUp.toDogs")}
        </Link>
      </div>
    );
  }

  const activeDog = dogs.find((d) => d.id === dogId) ?? dogs[0];
  const errorKey = state.code ? ERROR_KEYS[state.code] : undefined;
  // Prefer the server-localized message; i18n is fallback for codes without copy.
  const errorMessage =
    state.error ||
    (errorKey ? t(errorKey) : "");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="card-luxe p-6 space-y-5"
    >
      <div>
        <p className="eyebrow">{t("wallet.topUp.eyebrow")}</p>
        <h1 className="font-display text-3xl">{t("wallet.topUp.title")}</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          {t("wallet.topUp.description")}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="dogProfileId">
          {t("wallet.topUp.dogLabel")}
        </label>
        <select
          id="dogProfileId"
          name="dogProfileId"
          className="input"
          value={dogId}
          onChange={(e) => setDogId(e.target.value)}
          required
        >
          {dogs.map((dog) => (
            <option key={dog.id} value={dog.id}>
              {dog.name} ({dog.woofId})
            </option>
          ))}
        </select>
        {activeDog && (
          <p className="text-xs font-mono text-[var(--foreground-muted)] mt-2">
            {t("wallet.topUp.barcode", { walletCardId: activeDog.walletCardId })}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="label">{t("wallet.topUp.amountLabel")}</legend>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <label key={preset} className="amount-preset">
              <input
                type="radio"
                name="amountEur"
                value={preset}
                defaultChecked={preset === "20"}
                className="amount-preset-input"
                onChange={clearCustomAmount}
              />
              <span className="amount-preset-btn btn text-sm btn-secondary">
                €{preset}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="amountEurCustom">
            {t("wallet.topUp.customAmountLabel")}
          </label>
          <input
            id="amountEurCustom"
            name="amountEurCustom"
            className="input"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t("wallet.topUp.customAmountPlaceholder")}
            onChange={onCustomAmountChange}
          />
        </div>
      </fieldset>

      <p className="text-xs text-[var(--foreground-muted)]">
        {t("wallet.topUp.loggedInAs", { email: userEmail })}
      </p>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <SubmitButton />
    </form>
  );
}
