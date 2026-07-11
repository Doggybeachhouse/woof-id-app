"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";
import {
  areBearingsAligned,
  bearingToCardinal,
  calculateBearing,
  haversineDistanceMeters,
  MOVEMENT_BEARING_MIN_METERS,
  type CardinalDirection,
} from "@/lib/scavengerHunt/distance";

import { useHuntCompass } from "./useHuntCompass";

type HuntCompassArrowProps = {
  userLat: number;
  userLng: number;
  targetLat: number;
  targetLng: number;
};

function formatBearingDegrees(bearing: number) {
  return `${Math.round(bearing)}°`;
}

/** Pick the shortest clockwise delta between two angles (degrees). */
function shortestAngleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

export function HuntCompassArrow({
  userLat,
  userLng,
  targetLat,
  targetLng,
}: HuntCompassArrowProps) {
  const { t } = useI18n();
  const { status, deviceHeading, needsPermissionTap, requestAccess } = useHuntCompass(true);

  const bearing = calculateBearing(userLat, userLng, targetLat, targetLng);

  const prevPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [movementBearing, setMovementBearing] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevPositionRef.current;
    if (!prev) {
      prevPositionRef.current = { lat: userLat, lng: userLng };
      return;
    }

    const movedMeters = haversineDistanceMeters(prev.lat, prev.lng, userLat, userLng);
    if (movedMeters >= MOVEMENT_BEARING_MIN_METERS) {
      setMovementBearing(calculateBearing(prev.lat, prev.lng, userLat, userLng));
      prevPositionRef.current = { lat: userLat, lng: userLng };
    }
  }, [userLat, userLng]);

  const cardinal: CardinalDirection = bearingToCardinal(bearing);
  const directionLabel = t(`hunt.compass.direction.${cardinal}`);

  const hasLiveCompass = deviceHeading != null && status === "active";
  const userHeading = hasLiveCompass ? deviceHeading : movementBearing;
  const isOnTrack = userHeading != null && areBearingsAligned(userHeading, bearing);
  const targetRotation = hasLiveCompass ? bearing - deviceHeading : bearing;

  const rotationRef = useRef(targetRotation);
  const [displayRotation, setDisplayRotation] = useState(targetRotation);

  useEffect(() => {
    const prev = rotationRef.current;
    const next = prev + shortestAngleDelta(prev, targetRotation);
    rotationRef.current = next;
    setDisplayRotation(next);
  }, [targetRotation]);

  const statusMessage =
    status === "denied"
      ? t("hunt.compass.permissionDenied")
      : status === "unsupported"
        ? t("hunt.compass.unsupported")
        : status === "calibrating"
          ? t("hunt.compass.calibrating")
          : status === "active"
            ? t("hunt.compass.live")
            : t("hunt.compass.bearingOnly");

  return (
    <div
      className={`hunt-compass${isOnTrack ? " hunt-compass--on-track" : ""}`}
      aria-live="polite"
    >
      <div className="hunt-compass__ring">
        <span className="hunt-compass__label hunt-compass__label--n" aria-hidden>
          N
        </span>
        <div
          className="hunt-compass__arrow-wrap"
          style={{ transform: `rotate(${displayRotation}deg)` }}
          aria-hidden
        >
          <svg className="hunt-compass__arrow" viewBox="0 0 64 64">
            <path d="M32 6 L44 46 L32 38 L20 46 Z" fill="currentColor" />
          </svg>
        </div>
        <span className="hunt-compass__center-dot" aria-hidden />
      </div>

      <div className="hunt-compass__meta">
        <p className="hunt-compass__direction">{directionLabel}</p>
        <p className="hunt-compass__bearing">
          {t("hunt.compass.bearing", {
            degrees: formatBearingDegrees(bearing),
          })}
        </p>
        <p className="hunt-compass__status">{statusMessage}</p>
        {needsPermissionTap && status === "idle" && (
          <button
            type="button"
            className="btn btn-secondary hunt-compass__enable"
            onClick={() => void requestAccess()}
          >
            {t("hunt.compass.enable")}
          </button>
        )}
        {needsPermissionTap && status === "denied" && (
          <button
            type="button"
            className="btn btn-secondary hunt-compass__enable"
            onClick={() => void requestAccess()}
          >
            {t("hunt.compass.retry")}
          </button>
        )}
      </div>
    </div>
  );
}
