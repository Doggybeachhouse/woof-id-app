"use client";

import { useState } from "react";

import { useI18n } from "@/i18n/client";
import type { HuntRouteVariant } from "@/lib/scavengerHunt/hunts";
import { getDurationMinutes } from "@/lib/scavengerHunt/hunts";

type HuntRouteChoiceProps = {
  huntSlug: string;
  value: HuntRouteVariant;
  onChange: (variant: HuntRouteVariant) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function HuntRouteChoice({
  huntSlug,
  value,
  onChange,
  disabled = false,
  compact = false,
}: HuntRouteChoiceProps) {
  const { t } = useI18n();
  const fullMinutes = getDurationMinutes(huntSlug, "full");
  const shortMinutes = getDurationMinutes(huntSlug, "short");

  return (
    <fieldset
      className={`hunt-route-choice${compact ? " hunt-route-choice--compact" : ""}`}
      disabled={disabled}
    >
      <legend className="hunt-route-choice__legend">
        {t("hunt.route.legend")}
      </legend>
      <div className="hunt-route-choice__options">
        <label
          className={`hunt-route-choice__option${value === "full" ? " hunt-route-choice__option--active" : ""}`}
        >
          <input
            type="radio"
            name={`route-${huntSlug}`}
            value="full"
            checked={value === "full"}
            onChange={() => onChange("full")}
            disabled={disabled}
          />
          <span className="hunt-route-choice__title">
            {t("hunt.route.full.title")}
          </span>
          <span className="hunt-route-choice__meta">
            {t("hunt.route.duration", { minutes: fullMinutes })}
          </span>
          <span className="hunt-route-choice__desc">
            {t("hunt.route.full.description")}
          </span>
        </label>
        <label
          className={`hunt-route-choice__option${value === "short" ? " hunt-route-choice__option--active" : ""}`}
        >
          <input
            type="radio"
            name={`route-${huntSlug}`}
            value="short"
            checked={value === "short"}
            onChange={() => onChange("short")}
            disabled={disabled}
          />
          <span className="hunt-route-choice__title">
            {t("hunt.route.short.title")}
          </span>
          <span className="hunt-route-choice__meta">
            {t("hunt.route.duration", { minutes: shortMinutes })}
          </span>
          <span className="hunt-route-choice__desc">
            {t("hunt.route.short.description")}
          </span>
        </label>
      </div>
    </fieldset>
  );
}

type HuntRouteChoiceWithSaveProps = HuntRouteChoiceProps & {
  dogId: string;
  onSaved?: (variant: HuntRouteVariant) => void;
};

export function HuntRouteChoiceWithSave({
  dogId,
  huntSlug,
  value,
  onChange,
  onSaved,
  disabled,
  compact,
}: HuntRouteChoiceWithSaveProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  async function handleChange(variant: HuntRouteVariant) {
    if (variant === value || saving) return;
    onChange(variant);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/hunt/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogId, huntSlug, routeVariant: variant }),
      });
      const data = (await res.json()) as { error?: string; routeVariant?: HuntRouteVariant };
      if (!res.ok) {
        onChange(value);
        setError(
          data.error === "route_locked"
            ? t("hunt.route.errors.locked")
            : t("hunt.route.errors.generic"),
        );
        return;
      }
      if (data.routeVariant) {
        onChange(data.routeVariant);
        onSaved?.(data.routeVariant);
      }
    } catch {
      onChange(value);
      setError(t("hunt.route.errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <HuntRouteChoice
        huntSlug={huntSlug}
        value={value}
        onChange={(variant) => void handleChange(variant)}
        disabled={disabled || saving}
        compact={compact}
      />
      {saving && (
        <p className="text-xs text-[var(--foreground-muted)]">{t("hunt.route.saving")}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
