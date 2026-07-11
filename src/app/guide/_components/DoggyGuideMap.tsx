"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { useI18n } from "@/i18n/client";
import {
  HOTSPOTS,
  MAP_FOCUS_REGION,
  MAP_HEIGHT,
  MAP_IMAGE_URL,
  MAP_WIDTH,
  getHotspotContent,
  type HotspotId,
} from "@/lib/doggyGuide/hotspots";

const INTRO_STORAGE_KEY = "woof-guide-intro-seen";
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;
/** Extra zoom on top of fitting the Zandvoort focus region. */
const INITIAL_ZOOM_BOOST = 1.2;

type Offset = { x: number; y: number };

function getDistance(touches: { clientX: number; clientY: number }[]) {
  const [a, b] = touches;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

export function DoggyGuideMap() {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    offset: Offset;
    center: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(INTRO_STORAGE_KEY);
    if (!seen) setShowIntro(true);
  }, []);

  const clampOffset = useCallback((x: number, y: number, currentScale: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const { width, height } = container.getBoundingClientRect();
    const mapW = MAP_WIDTH * currentScale;
    const mapH = MAP_HEIGHT * currentScale;
    const minX = Math.min(0, width - mapW);
    const minY = Math.min(0, height - mapH);
    const maxX = Math.max(0, width - mapW);
    const maxY = Math.max(0, height - mapH);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }, []);

  const fitMapToViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const { left, top, width: focusWidth, height: focusHeight } = MAP_FOCUS_REGION;
    const fitScale = Math.min(width / focusWidth, height / focusHeight);
    const initialScale = Math.min(
      MAX_SCALE,
      Math.max(fitScale * INITIAL_ZOOM_BOOST, MIN_SCALE),
    );
    const focusCenterX = left + focusWidth / 2;
    const focusCenterY = top + focusHeight / 2;
    setScale(initialScale);
    setOffset(
      clampOffset(
        width / 2 - focusCenterX * initialScale,
        height / 2 - focusCenterY * initialScale,
        initialScale,
      ),
    );
  }, [clampOffset]);

  useEffect(() => {
    const runFit = () => requestAnimationFrame(() => fitMapToViewport());
    runFit();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => runFit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitMapToViewport]);

  const zoomAt = useCallback(
    (newScale: number, centerX: number, centerY: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      const ratio = clamped / scale;
      const nx = centerX - (centerX - offset.x) * ratio;
      const ny = centerY - (centerY - offset.y) * ratio;
      setScale(clamped);
      setOffset(clampOffset(nx, ny, clamped));
    },
    [clampOffset, offset.x, offset.y, scale],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".doggy-guide__hotspot")) return;
    if (pinchRef.current) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset(
      clampOffset(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
        scale,
      ),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const delta = -event.deltaY * 0.0015;
    zoomAt(scale * (1 + delta), cx, cy);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      dragRef.current = null;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const center = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top,
      };
      pinchRef.current = {
        distance: getDistance([event.touches[0], event.touches[1]]),
        scale,
        offset,
        center,
      };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const distance = getDistance([event.touches[0], event.touches[1]]);
    const ratio = distance / pinchRef.current.distance;
    const newScale = pinchRef.current.scale * ratio;
    const { center } = pinchRef.current;
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const scaleRatio = clamped / pinchRef.current.scale;
    const origin = pinchRef.current.offset;
    const nx = center.x - (center.x - origin.x) * scaleRatio;
    const ny = center.y - (center.y - origin.y) * scaleRatio;
    setScale(clamped);
    setOffset(clampOffset(nx, ny, clamped));
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
  };

  const dismissIntro = () => {
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
    setShowIntro(false);
  };

  const activeMeta = activeHotspot
    ? HOTSPOTS.find((hotspot) => hotspot.id === activeHotspot)
    : null;
  const content = activeHotspot
    ? getHotspotContent(locale, activeHotspot)
    : null;

  return (
    <div className="doggy-guide">
      <header className="doggy-guide__header">
        <h1 className="doggy-guide__title font-display">{t("guide.title")}</h1>
        <p className="doggy-guide__hint">{t("guide.hint.pan")}</p>
      </header>

      <div
        ref={containerRef}
        className="doggy-guide__viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="doggy-guide__map"
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_IMAGE_URL}
            alt={t("guide.mapAlt")}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            className="doggy-guide__map-image"
            draggable={false}
            decoding="async"
          />
          {HOTSPOTS.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              className={`doggy-guide__hotspot${hotspot.isDbh ? " doggy-guide__hotspot--dbh" : ""}${activeHotspot === hotspot.id ? " doggy-guide__hotspot--active" : ""}`}
              style={{ top: hotspot.top, left: hotspot.left }}
              aria-label={getHotspotContent(locale, hotspot.id).name}
              onClick={() => setActiveHotspot(hotspot.id)}
            >
              <span className="doggy-guide__hotspot-pulse" aria-hidden />
              <span className="doggy-guide__hotspot-dot" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      {showIntro && (
        <div className="doggy-guide__overlay" role="presentation">
          <div
            className="doggy-guide__intro card-luxe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-intro-title"
          >
            <h2 id="guide-intro-title" className="font-display text-xl text-[var(--accent-primary)]">
              {t("guide.intro.title")}
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
              {t("guide.intro.body")}
            </p>
            <button type="button" className="btn btn-primary w-full" onClick={dismissIntro}>
              {t("guide.intro.dismiss")}
            </button>
          </div>
        </div>
      )}

      {content && activeMeta && (
        <div className="doggy-guide__overlay doggy-guide__overlay--sheet" role="presentation">
          <button
            type="button"
            className="doggy-guide__sheet-backdrop"
            aria-label={t("guide.popup.close")}
            onClick={() => setActiveHotspot(null)}
          />
          <div
            className="doggy-guide__sheet card-luxe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-hotspot-title"
          >
            <button
              type="button"
              className="doggy-guide__sheet-close"
              aria-label={t("guide.popup.close")}
              onClick={() => setActiveHotspot(null)}
            >
              ×
            </button>
            <div className="doggy-guide__sheet-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.photo}
                alt={content.name}
                width={800}
                height={450}
                loading="lazy"
                decoding="async"
                className="doggy-guide__sheet-image"
              />
            </div>
            <h2 id="guide-hotspot-title" className="font-display text-lg text-[var(--accent-primary)]">
              {content.name}
            </h2>
            <div
              className="doggy-guide__sheet-body prose-guide"
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
            <div className="doggy-guide__sheet-actions">
              <a
                href={content.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex-1"
              >
                {t("guide.popup.maps")}
              </a>
              <a
                href={content.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex-1"
              >
                {t("guide.popup.website")}
              </a>
            </div>
            {activeMeta.isDbh && (
              <Link href="/check-in" className="btn btn-ghost w-full text-center">
                {t("guide.popup.dbhCta")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
