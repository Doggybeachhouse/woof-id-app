"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { DUNE_FACTS } from "@/lib/scavengerHunt/facts";

type HuntDuneFactCardProps = {
  checkpointStep: number;
};

export function HuntDuneFactCard({ checkpointStep }: HuntDuneFactCardProps) {
  const { locale } = useI18n();
  const [factIndex, setFactIndex] = useState(() => checkpointStep % DUNE_FACTS.length);

  useEffect(() => {
    setFactIndex(checkpointStep % DUNE_FACTS.length);
  }, [checkpointStep]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % DUNE_FACTS.length);
    }, 25_000);
    return () => window.clearInterval(interval);
  }, []);

  const fact = DUNE_FACTS[factIndex]!;

  return (
    <div className="hunt-fact-card">
      <p className="hunt-fact-card__eyebrow">{fact.title[locale]}</p>
      {fact.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fact.imageUrl}
          alt=""
          className="hunt-fact-card__image"
          loading="lazy"
        />
      )}
      <p className="hunt-fact-card__body">{fact.body[locale]}</p>
    </div>
  );
}
