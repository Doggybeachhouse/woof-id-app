"use client";

import Image from "next/image";
import Link from "next/link";

import { useI18n } from "@/i18n/client";

type DbhLogoProps = {
  variant?: "full" | "nav";
  className?: string;
  href?: string | null;
};

export function DbhLogo({
  variant = "full",
  className = "",
  href = null,
}: DbhLogoProps) {
  const { t } = useI18n();
  const src = variant === "nav" ? "/dbh-logo-nav.png" : "/dbh-logo.png";
  const size = variant === "nav" ? 48 : 200;

  const image = (
    <Image
      src={src}
      alt={t("nav.brand.logoAlt")}
      width={size}
      height={size}
      className={className}
      priority={variant === "full"}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center shrink-0">
      {image}
    </Link>
  );
}
