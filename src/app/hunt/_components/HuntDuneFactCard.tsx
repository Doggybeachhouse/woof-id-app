"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { getHuntFacts } from "@/lib/scavengerHunt/facts";

type HuntDuneFactCardProps = {
  checkpointStep: number;
  huntSlug: string;
};

export function HuntDuneFactCard({ checkpointStep, huntSlug }: HuntDuneFactCardProps) {
  const { locale } = useI18n();
  const facts = getHuntFacts(huntSlug);
  const [factIndex, setFactIndex] = useState(() => checkpointStep % facts.length);

  useEffect(() => {
    setFactIndex(checkpointStep % facts.length);
  }, [checkpointStep, facts.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 25_000);
    return () => window.clearInterval(interval);
  }, [facts.length]);

  const fact = facts[factIndex]!;

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
