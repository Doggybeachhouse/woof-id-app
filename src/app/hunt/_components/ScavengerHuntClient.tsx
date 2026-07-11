"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { DogPhotoSourcePicker } from "@/app/dogs/_components/DogPhotoSourcePicker";
import { PawDecor } from "@/app/_components/ui/PawDecor";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { HuntCheckpoint } from "@/lib/scavengerHunt/checkpoints";
import { haversineDistanceMeters } from "@/lib/scavengerHunt/distance";
import {
  getDurationMinutes,
  type HuntRouteVariant,
} from "@/lib/scavengerHunt/hunts";
import { formatDuration } from "@/lib/scavengerHunt/leaderboard";
import {
  getActiveCheckpointIndices,
  getQuestPosition,
} from "@/lib/scavengerHunt/route";

import { HuntAdventureCollage } from "./HuntAdventureCollage";
import { HuntCompassArrow } from "./HuntCompassArrow";
import { HuntDuneFactCard } from "./HuntDuneFactCard";
import { HuntHintPanel } from "./HuntHintPanel";
import { HuntLeaderboard } from "./HuntLeaderboard";
import { HuntRouteChoiceWithSave } from "./HuntRouteChoice";

type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

type ScavengerHuntClientProps = {
  dogId: string;
  dogName: string;
  dogPhotoSrc: string | null;
  huntSlug: string;
  huntName: string;
  checkpoints: HuntCheckpoint[];
  initialStep: number;
  initialCompleted: boolean;
  initialRouteVariant: HuntRouteVariant;
  initialDurationSeconds: number | null;
  initialUserRank: number | null;
  hasSubmissions: boolean;
  canChangeRoute: boolean;
  routeChangeCheckpointIndex: number | null;
  durationMinutes: number;
  dogs: { id: string; name: string }[];
  canUseTestMode: boolean;
};

function formatDistance(meters: number, locale: Locale): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}

export function ScavengerHuntClient({
  dogId,
  dogName,
  dogPhotoSrc,
  huntSlug,
  huntName,
  checkpoints,
  initialStep,
  initialCompleted,
  initialRouteVariant,
  initialDurationSeconds,
  initialUserRank,
  hasSubmissions,
  canChangeRoute,
  routeChangeCheckpointIndex,
  durationMinutes: initialDurationMinutes,
  dogs,
  canUseTestMode,
}: ScavengerHuntClientProps) {
  const { locale, t } = useI18n();
  const [testMode, setTestMode] = useState(false);
  const [testProgress, setTestProgress] = useState<{
    step: number;
    started: boolean;
    completed: boolean;
    startedAt: number | null;
    durationSeconds: number | null;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completed, setCompleted] = useState(initialCompleted);
  const [routeVariant, setRouteVariant] = useState(initialRouteVariant);
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [started, setStarted] = useState(hasSubmissions || initialStep > 0);
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    initialDurationSeconds,
  );
  const [userRank, setUserRank] = useState<number | null>(initialUserRank);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const wasNearRef = useRef(false);

  const step = testMode && testProgress ? testProgress.step : currentStep;
  const huntStarted = testMode && testProgress ? testProgress.started : started;
  const huntCompleted = testMode && testProgress ? testProgress.completed : completed;
  const huntDurationSeconds =
    testMode && testProgress ? testProgress.durationSeconds : durationSeconds;

  const activeIndices = useMemo(
    () => getActiveCheckpointIndices(huntSlug, routeVariant),
    [huntSlug, routeVariant],
  );

  const activeCheckpoint =
    huntCompleted || !activeIndices.includes(step)
      ? null
      : checkpoints[step] ?? null;

  const questPosition = getQuestPosition(step, activeIndices);

  const distanceMeters = useMemo(() => {
    if (!position || !activeCheckpoint) return null;
    return haversineDistanceMeters(
      position.lat,
      position.lng,
      activeCheckpoint.lat,
      activeCheckpoint.lng,
    );
  }, [position, activeCheckpoint]);

  const isNear =
    testMode ||
    (activeCheckpoint != null &&
      distanceMeters != null &&
      distanceMeters <= activeCheckpoint.radiusMeters);

  const navPosition =
    testMode && activeCheckpoint
      ? {
          lat: activeCheckpoint.lat,
          lng: activeCheckpoint.lng,
          accuracy: 1,
        }
      : position;

  const [submitting, setSubmitting] = useState(false);

  const showIntro = !huntStarted && !huntCompleted;
  const showRouteChange =
    huntStarted &&
    !huntCompleted &&
    canChangeRoute &&
    routeChangeCheckpointIndex != null &&
    step === routeChangeCheckpointIndex;

  useEffect(() => {
    if (testMode) return;
    if (!navigator.geolocation) {
      setGeoError("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("denied");
        } else {
          setGeoError("unavailable");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [testMode]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(selectedPhoto);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPhoto]);

  useEffect(() => {
    if (testMode) return;
    if (isNear && !wasNearRef.current && started && !completed) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([120, 60, 120]);
      }
    }
    wasNearRef.current = isNear;
  }, [isNear, started, completed, testMode]);

  function handleTestModeChange(enabled: boolean) {
    setTestMode(enabled);
    setSubmitError(null);
    if (enabled) {
      setTestProgress({
        step: currentStep,
        started: started,
        completed: false,
        startedAt: null,
        durationSeconds: null,
      });
    } else {
      setTestProgress(null);
      wasNearRef.current = false;
    }
  }

  function handleRouteSaved(variant: HuntRouteVariant) {
    setRouteVariant(variant);
    setDurationMinutes(getDurationMinutes(huntSlug, variant));
  }

  async function handleStartHunt() {
    if (testMode) {
      setTestProgress((prev) =>
        prev
          ? { ...prev, started: true, startedAt: Date.now() }
          : {
              step: currentStep,
              started: true,
              completed: false,
              startedAt: Date.now(),
              durationSeconds: null,
            },
      );
      return;
    }
    setStarted(true);
    try {
      await fetch("/api/hunt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogId, huntSlug }),
      });
    } catch {
      /* non-blocking */
    }
  }

  async function handleReplay() {
    setReplaying(true);
    try {
      if (!testMode) {
        const res = await fetch("/api/hunt/replay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dogId, huntSlug }),
        });
        if (!res.ok) return;
        setCompleted(false);
        setStarted(false);
        setCurrentStep(0);
        setCoinsAwarded(null);
        setDurationSeconds(null);
        setUserRank(null);
      } else {
        setTestProgress({
          step: 0,
          started: false,
          completed: false,
          startedAt: null,
          durationSeconds: null,
        });
      }
      setSelectedPhoto(null);
      wasNearRef.current = false;
    } finally {
      setReplaying(false);
    }
  }

  async function handleSubmit() {
    if (!activeCheckpoint || submitting) return;
    if (!testMode && (!position || !selectedPhoto)) return;

    setSubmitError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("dogId", dogId);
    formData.set("huntSlug", huntSlug);
    formData.set("checkpointIndex", String(step));
    formData.set("routeVariant", routeVariant);

    if (testMode) {
      formData.set("testMode", "true");
      formData.set("lat", String(activeCheckpoint.lat));
      formData.set("lng", String(activeCheckpoint.lng));
      if (selectedPhoto) {
        formData.set("photo", selectedPhoto);
      }
    } else {
      formData.set("lat", String(position!.lat));
      formData.set("lng", String(position!.lng));
      if (position!.accuracy != null) {
        formData.set("accuracy", String(position!.accuracy));
      }
      formData.set("photo", selectedPhoto!);
    }

    try {
      const res = await fetch("/api/hunt/submit", { method: "POST", body: formData });
      const data = (await res.json()) as {
        error?: string;
        currentStep?: number;
        completed?: boolean;
        coinsAwarded?: number;
        durationSeconds?: number;
        userRank?: number | null;
      };

      if (!res.ok) {
        setSubmitError(data.error ?? "unknown");
        return;
      }

      setSelectedPhoto(null);
      if (testMode) {
        if (data.completed) {
          const elapsed =
            testProgress?.startedAt != null
              ? Math.max(1, Math.round((Date.now() - testProgress.startedAt) / 1000))
              : null;
          setTestProgress((prev) =>
            prev
              ? { ...prev, completed: true, durationSeconds: elapsed }
              : prev,
          );
        } else if (typeof data.currentStep === "number") {
          setTestProgress((prev) =>
            prev ? { ...prev, step: data.currentStep! } : prev,
          );
          wasNearRef.current = false;
        }
      } else {
        setStarted(true);
        if (data.completed) {
          setCompleted(true);
          setCoinsAwarded(data.coinsAwarded ?? 0);
          if (data.durationSeconds != null) setDurationSeconds(data.durationSeconds);
          if (data.userRank != null) setUserRank(data.userRank);
        } else if (typeof data.currentStep === "number") {
          setCurrentStep(data.currentStep);
          wasNearRef.current = false;
        }
      }
    } catch {
      setSubmitError("network");
    } finally {
      setSubmitting(false);
    }
  }

  const geoErrorMessage =
    geoError === "denied"
      ? t("hunt.geo.denied")
      : geoError === "unsupported"
        ? t("hunt.geo.unsupported")
        : geoError
          ? t("hunt.geo.unavailable")
          : null;

  const submitErrorMessage =
    submitError === "too_far"
      ? t("hunt.errors.tooFar")
      : submitError === "gps_accuracy"
        ? t("hunt.errors.gpsAccuracy")
        : submitError === "photo_required" || submitError === "invalid_photo_type"
          ? t("hunt.errors.photo")
          : submitError === "photo_too_large"
            ? t("hunt.errors.photoTooLarge")
            : submitError === "upload_failed"
              ? t("hunt.errors.uploadFailed")
              : submitError === "wrong_checkpoint"
                ? t("hunt.errors.wrongCheckpoint")
                : submitError
                  ? t("hunt.errors.generic")
                  : null;

  return (
    <div className="hunt-game">
      {canUseTestMode && (
        <div className="hunt-mode-toggle" role="group" aria-label={t("hunt.testMode.toggleLabel")}>
          <button
            type="button"
            className={`hunt-mode-toggle__btn${!testMode ? " hunt-mode-toggle__btn--active" : ""}`}
            onClick={() => handleTestModeChange(false)}
            disabled={submitting}
          >
            {t("hunt.testMode.walkMode")}
          </button>
          <button
            type="button"
            className={`hunt-mode-toggle__btn${testMode ? " hunt-mode-toggle__btn--active" : ""}`}
            onClick={() => handleTestModeChange(true)}
            disabled={submitting}
          >
            {t("hunt.testMode.testMode")}
          </button>
        </div>
      )}

      {testMode && (
        <div className="hunt-test-banner" role="status">
          {t("hunt.testMode.banner")}
        </div>
      )}

      {isNear && huntStarted && !huntCompleted && !testMode && (
        <div className="hunt-here-banner" role="status">
          <span className="hunt-here-banner__pulse" aria-hidden />
          <p className="hunt-here-banner__text">{t("hunt.hereBanner")}</p>
        </div>
      )}

      <div className="hunt-game__hero">
        <PawDecor className="hunt-game__paw hunt-game__paw--left" size={28} />
        <PawDecor className="hunt-game__paw hunt-game__paw--right" size={22} />
        <p className="hunt-game__badge">{t("hunt.questBadge")}</p>
        <h1 className="hunt-game__title">{huntName}</h1>
        <p className="hunt-game__subtitle">{t("hunt.subtitle")}</p>
        <p className="hunt-game__duration">
          {t("hunt.route.duration", { minutes: durationMinutes })}
        </p>
        <p className="hunt-game__dog">{t("hunt.withDog", { name: dogName })}</p>
        {dogPhotoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dogPhotoSrc}
            alt={dogName}
            className="hunt-game__avatar"
          />
        ) : (
          <div className="hunt-game__avatar hunt-game__avatar--placeholder" aria-hidden>
            <PawDecor size={32} />
          </div>
        )}
      </div>

      {dogs.length > 1 && (
        <div className="hunt-game__card hunt-game__card--compact">
          <label htmlFor="hunt-dog-select" className="text-sm font-medium">
            {t("hunt.selectDog")}
          </label>
          <select
            id="hunt-dog-select"
            className="input w-full"
            value={dogId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set("dogId", e.target.value);
              window.location.search = params.toString();
            }}
          >
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showIntro ? (
        <div className="hunt-game__card space-y-4">
          <p className="text-sm text-[var(--foreground-muted)]">{t("hunt.intro.body")}</p>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {t("hunts.wheelchairNotice")}
          </p>
          <HuntRouteChoiceWithSave
            dogId={dogId}
            huntSlug={huntSlug}
            value={routeVariant}
            onChange={setRouteVariant}
            onSaved={handleRouteSaved}
          />
          <button type="button" className="btn btn-primary w-full" onClick={() => void handleStartHunt()}>
            {t("hunt.intro.start")}
          </button>
          <Link href="/hunts" className="btn btn-secondary w-full text-center">
            {t("hunt.intro.backToList")}
          </Link>
        </div>
      ) : huntCompleted ? (
        <div className="hunt-game__complete">
          {testMode && (
            <p className="hunt-test-complete-note">{t("hunt.testMode.completeNote")}</p>
          )}
          <div className="hunt-game__complete-icon" aria-hidden>
            🏆
          </div>
          <p className="hunt-game__complete-title">{t("hunt.completed.title")}</p>
          <p className="hunt-game__complete-body">{t("hunt.completed.body")}</p>
          {huntDurationSeconds != null && (
            <p className="hunt-game__time">
              {t("hunt.completed.time", { time: formatDuration(huntDurationSeconds) })}
            </p>
          )}
          {userRank != null && !testMode && (
            <p className="hunt-game__rank">
              {t("hunt.completed.rank", { rank: userRank })}
            </p>
          )}
          {coinsAwarded != null && coinsAwarded > 0 && !testMode && (
            <p className="hunt-game__coins">{t("hunt.completed.coins", { count: coinsAwarded })}</p>
          )}

          {!testMode && <HuntAdventureCollage dogId={dogId} huntSlug={huntSlug} />}

          <div className="hunt-game__card space-y-3">
            <h3 className="font-medium text-sm">{t("hunt.leaderboard.title")}</h3>
            <HuntLeaderboard
              huntSlug={huntSlug}
              routeVariant={routeVariant}
              dogId={dogId}
              userRank={testMode ? null : userRank}
              userDurationSeconds={testMode ? null : durationSeconds}
              compact
            />
            <Link
              href={`/hunts/${encodeURIComponent(huntSlug)}/leaderboard?route=${routeVariant}`}
              className="text-sm text-[var(--accent)] underline"
            >
              {t("hunt.leaderboard.viewAll")}
            </Link>
          </div>

          <div className="hunt-game__actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={replaying}
              onClick={() => void handleReplay()}
            >
              {replaying ? t("hunt.replay.loading") : t("hunt.replay.button")}
            </button>
            <Link href="/hunts/history" className="btn btn-secondary">
              {t("hunts.historyLink")}
            </Link>
            <Link href="/hunts" className="btn btn-secondary">
              {t("hunt.completed.hunts")}
            </Link>
            <Link href={`/dogs/${dogId}`} className="btn btn-secondary">
              {t("hunt.completed.dogProfile")}
            </Link>
          </div>
          <p className="text-xs text-center text-[var(--foreground-muted)]">
            {t("hunt.replay.note")}
          </p>
        </div>
      ) : (
        <>
          {showRouteChange && (
            <div className="hunt-game__card space-y-3">
              <p className="text-sm font-medium">{t("hunt.route.changePrompt")}</p>
              <HuntRouteChoiceWithSave
                dogId={dogId}
                huntSlug={huntSlug}
                value={routeVariant}
                onChange={setRouteVariant}
                onSaved={handleRouteSaved}
                compact
              />
            </div>
          )}

          <div className="hunt-stage" aria-label={t("hunt.progressLabel")}>
            <div className="hunt-stage__header">
              <span className="hunt-stage__label">{t("hunt.questStage")}</span>
              <span className="hunt-stage__count">
                {t("hunt.stepOf", {
                  current: questPosition.current,
                  total: questPosition.total,
                })}
              </span>
            </div>
            <div className="hunt-stage__track">
              {activeIndices.map((index, segmentIndex) => {
                const cp = checkpoints[index]!;
                const done = index < step;
                const active = index === step;
                return (
                  <div
                    key={cp.id}
                    className={`hunt-stage__segment${done ? " hunt-stage__segment--done" : ""}${active ? " hunt-stage__segment--active" : ""}`}
                    title={cp.title[locale]}
                  >
                    <span className="hunt-stage__num">{segmentIndex + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {activeCheckpoint && (
            <div className="hunt-game__card hunt-quest-card">
              <div className="hunt-quest-card__header">
                <p className="hunt-quest-card__eyebrow">
                  {t("hunt.checkpointLabel", { step: questPosition.current })}
                </p>
                <h2 className="hunt-quest-card__title">{activeCheckpoint.title[locale]}</h2>
              </div>

              {isNear ? (
                <div
                  className="hunt-quest-card__story hunt-checkpoint-story"
                  dangerouslySetInnerHTML={{ __html: activeCheckpoint.instruction[locale] }}
                />
              ) : (
                <HuntDuneFactCard checkpointStep={step} huntSlug={huntSlug} />
              )}

              {testMode && (
                <HuntDuneFactCard checkpointStep={step} huntSlug={huntSlug} />
              )}

              <div className="hunt-nav-panel">
                {testMode ? (
                  <p className="hunt-nav-panel__hint hunt-nav-panel__hint--test">
                    {t("hunt.testMode.compassDisabled")}
                  </p>
                ) : geoErrorMessage ? (
                  <p className="hunt-nav-panel__error">{geoErrorMessage}</p>
                ) : distanceMeters == null || !navPosition ? (
                  <p className="hunt-nav-panel__hint">{t("hunt.geo.locating")}</p>
                ) : (
                  <>
                    <HuntCompassArrow
                      userLat={navPosition.lat}
                      userLng={navPosition.lng}
                      targetLat={activeCheckpoint.lat}
                      targetLng={activeCheckpoint.lng}
                    />
                    <div className="hunt-distance-card">
                      <p className="hunt-distance-card__value">
                        {formatDistance(distanceMeters!, locale)}
                        {navPosition.accuracy != null && (
                          <span className="hunt-distance-card__accuracy">
                            {" "}
                            · ±{Math.round(navPosition.accuracy)} m
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Suspense fallback={null}>
                <HuntHintPanel
                  dogId={dogId}
                  huntSlug={huntSlug}
                  checkpointIndex={step}
                />
              </Suspense>

              {isNear && (
                <div className="hunt-upload-zone">
                  {!testMode && (
                    <p className="hunt-upload-zone__prompt">{t("hunt.uploadPrompt")}</p>
                  )}

                  {photoPreview && (
                    <img src={photoPreview} alt="" className="hunt-photo-preview" />
                  )}

                  <DogPhotoSourcePicker onFileSelect={setSelectedPhoto}>
                    {({ open, disabled }) => (
                      <button
                        type="button"
                        className="btn btn-secondary w-full"
                        onClick={open}
                        disabled={disabled || submitting}
                      >
                        {selectedPhoto ? t("hunt.changePhoto") : t("hunt.addPhoto")}
                      </button>
                    )}
                  </DogPhotoSourcePicker>

                  {testMode ? (
                    <button
                      type="button"
                      className="btn btn-primary w-full hunt-upload-zone__submit"
                      disabled={submitting}
                      onClick={() => void handleSubmit()}
                    >
                      {submitting ? t("hunt.submitting") : t("hunt.testMode.nextCheckpoint")}
                    </button>
                  ) : (
                    selectedPhoto && (
                      <button
                        type="button"
                        className="btn btn-primary w-full hunt-upload-zone__submit"
                        disabled={submitting}
                        onClick={() => void handleSubmit()}
                      >
                        {submitting ? t("hunt.submitting") : t("hunt.submit")}
                      </button>
                    )
                  )}
                </div>
              )}

              {!isNear && distanceMeters != null && !testMode && (
                <p className="hunt-quest-card__hint">
                  {t("hunt.walkCloser", { radius: activeCheckpoint.radiusMeters })}
                </p>
              )}
            </div>
          )}

          {submitErrorMessage && (
            <div className="hunt-game__error">{submitErrorMessage}</div>
          )}
        </>
      )}
    </div>
  );
}
