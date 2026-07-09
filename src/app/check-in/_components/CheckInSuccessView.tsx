"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";

function GreenCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.15} />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

export function CheckInSuccessView({
  dogName,
  location,
}: {
  dogName: string;
  location: string;
}) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`card-luxe p-8 max-w-lg mx-auto text-center space-y-4 transition-opacity duration-300 ${
        revealed ? "opacity-100" : "opacity-0"
      }`}
    >
      <p
        className={`text-4xl checkin-confetti ${revealed ? "" : "opacity-0"}`}
        aria-hidden
      >
        🎉
      </p>
      <GreenCheckIcon
        className={`voucher-check-pop mx-auto h-20 w-20 text-green-600 ${
          revealed ? "" : "opacity-0"
        }`}
      />
      <h1 className="font-display text-3xl">{t("checkIn.success.title")}</h1>
      <p
        className={`text-lg font-semibold transition-all duration-500 ${
          revealed ? "checkin-dog-name-pop" : "opacity-0 translate-y-2"
        }`}
      >
        {t("checkIn.success.message", { dogName, location })}
      </p>
      <p
        className={`coin-badge inline-flex text-base transition-all duration-500 delay-150 ${
          revealed ? "checkin-coins-pop" : "opacity-0 scale-90"
        }`}
      >
        {t("checkIn.success.coinsEarned")}
      </p>
      <div className="flex flex-col gap-3 pt-4">
        <Link href="/dogs" className="btn btn-primary">
          {t("checkIn.success.toDogProfile")}
        </Link>
        <Link href="/" className="text-sm underline text-black/60">
          {t("checkIn.success.home")}
        </Link>
      </div>
    </div>
  );
}
