"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";

type CertificatePhoto = {
  checkpointIndex: number;
  lat: number;
  lng: number;
  title: string;
  photoUrl: string | null;
};

type CertificateData = {
  dogName: string;
  huntName: string;
  routeName: string;
  frameHeadline: string;
  adventureLabel: string;
  startPhotoUrl: string | null;
  centerPhotoUrl: string | null;
  photos: CertificatePhoto[];
};

type HuntAdventureCollageProps = {
  dogId: string;
  huntSlug: string;
  completionId?: string;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1620;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function projectPoints(
  photos: CertificatePhoto[],
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
) {
  const lats = photos.map((p) => p.lat);
  const lngs = photos.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.0008);
  const lngSpan = Math.max(maxLng - minLng, 0.0008);
  const pad = 0.1;

  return photos.map((photo) => {
    const x =
      mapX +
      pad * mapW +
      ((photo.lng - minLng) / lngSpan) * mapW * (1 - 2 * pad);
    const y =
      mapY +
      pad * mapH +
      (1 - (photo.lat - minLat) / latSpan) * mapH * (1 - 2 * pad);
    return { ...photo, x, y };
  });
}

function drawRoundedRectImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function drawDuneMapBackground(
  ctx: CanvasRenderingContext2D,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
) {
  const terrain = ctx.createLinearGradient(mapX, mapY, mapX + mapW, mapY + mapH);
  terrain.addColorStop(0, "#c9b896");
  terrain.addColorStop(0.35, "#e8dcc4");
  terrain.addColorStop(0.65, "#d4c4a0");
  terrain.addColorStop(1, "#b8a67a");
  ctx.fillStyle = terrain;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 32);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 32);
  ctx.clip();

  for (let i = 0; i < 12; i++) {
    const cx = mapX + (mapW * (0.1 + (i * 0.17) % 0.8));
    const cy = mapY + mapH * (0.15 + ((i * 0.23) % 0.7));
    const rx = 40 + (i % 4) * 18;
    const ry = 24 + (i % 3) * 12;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (i * 0.4) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(74, 124, 89, 0.25)";
  ctx.beginPath();
  ctx.ellipse(mapX + mapW * 0.72, mapY + mapH * 0.55, mapW * 0.12, mapH * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "#8b7355";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 32);
  ctx.stroke();
}

async function renderCollage(
  canvas: HTMLCanvasElement,
  data: CertificateData,
  images: Map<string, HTMLImageElement>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, "#87ceeb");
  bg.addColorStop(0.35, "#fef3e2");
  bg.addColorStop(1, "#f5e6c8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const mapX = 48;
  const mapY = 120;
  const mapW = CANVAS_WIDTH - 96;
  const mapH = 900;

  drawDuneMapBackground(ctx, mapX, mapY, mapW, mapH);

  const projected = projectPoints(data.photos, mapX, mapY, mapW, mapH);
  const centerX = mapX + mapW / 2;
  const centerY = mapY + mapH / 2;

  ctx.strokeStyle = "#ff416e";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  projected.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 65, 110, 0.35)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  projected.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  for (const point of projected) {
    if (!point.photoUrl) continue;
    const img = images.get(point.photoUrl);
    if (!img) continue;
    const size = 140;
    drawRoundedRectImage(
      ctx,
      img,
      point.x - size / 2,
      point.y - size / 2,
      size,
      size,
      18,
    );

    ctx.fillStyle = "#ff416e";
    ctx.beginPath();
    ctx.arc(point.x, point.y + size / 2 + 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(point.checkpointIndex + 1), point.x, point.y + size / 2 + 24);
  }

  const centerUrl = data.centerPhotoUrl ?? data.startPhotoUrl;
  const centerImg = centerUrl ? images.get(centerUrl) : null;
  const trophySize = 200;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, trophySize / 2 + 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff416e";
  ctx.lineWidth = 8;
  ctx.stroke();

  if (centerImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, trophySize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      centerImg,
      centerX - trophySize / 2,
      centerY - trophySize / 2,
      trophySize,
      trophySize,
    );
    ctx.restore();
    ctx.beginPath();
    ctx.arc(centerX, centerY, trophySize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  ctx.font = "64px serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆", centerX, centerY - trophySize / 2 - 20);

  const textY = mapY + mapH + 56;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff416e";
  ctx.font = "bold 44px 'Protest Strike', sans-serif";
  wrapText(ctx, data.frameHeadline, CANVAS_WIDTH / 2, textY, CANVAS_WIDTH - 120, 52);

  ctx.fillStyle = "#5c4f3d";
  ctx.font = "600 36px Montserrat, sans-serif";
  ctx.fillText(data.routeName, CANVAS_WIDTH / 2, textY + 110);

  ctx.fillStyle = "#7a726c";
  ctx.font = "500 30px Montserrat, sans-serif";
  ctx.fillText(data.dogName, CANVAS_WIDTH / 2, textY + 160);

  ctx.fillStyle = "#8b7355";
  ctx.font = "500 24px Montserrat, sans-serif";
  ctx.fillText(data.huntName, CANVAS_WIDTH / 2, textY + 200);

  ctx.font = "40px serif";
  ctx.fillText("🐾", CANVAS_WIDTH / 2, textY + 260);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  ctx.textAlign = "center";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, centerX, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, centerX, currentY);
}

export function HuntAdventureCollage({ dogId, huntSlug, completionId }: HuntAdventureCollageProps) {
  const { locale, t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const buildCollage = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams({
        dogId,
        huntSlug,
        locale,
      });
      if (completionId) params.set("completionId", completionId);
      const res = await fetch(`/api/hunt/certificate?${params}`);
      if (!res.ok) throw new Error("certificate fetch failed");
      const data = (await res.json()) as CertificateData;

      const urls = data.photos
        .map((p) => p.photoUrl)
        .filter((url): url is string => Boolean(url));
      if (data.centerPhotoUrl) urls.push(data.centerPhotoUrl);
      if (data.startPhotoUrl) urls.push(data.startPhotoUrl);

      const uniqueUrls = [...new Set(urls)];
      const images = new Map<string, HTMLImageElement>();
      await Promise.all(
        uniqueUrls.map(async (url) => {
          try {
            const img = await loadImage(url);
            images.set(url, img);
          } catch {
            /* skip broken images */
          }
        }),
      );

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("canvas missing");
      await renderCollage(canvas, data, images);
      setDataUrl(canvas.toDataURL("image/jpeg", 0.92));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [dogId, huntSlug, locale, completionId]);

  useEffect(() => {
    void buildCollage();
  }, [buildCollage]);

  async function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `woof-hunt-${huntSlug}.jpg`;
    link.click();
  }

  async function handleShare() {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `woof-hunt-${huntSlug}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t("hunt.collage.shareTitle"),
          text: t("hunt.collage.shareText"),
        });
        return;
      }
    } catch {
      /* fall through to download */
    }
    void handleDownload();
  }

  return (
    <div className="hunt-collage">
      <canvas ref={canvasRef} className="hunt-collage__canvas" aria-hidden />

      {status === "loading" && (
        <p className="hunt-collage__status">{t("hunt.collage.generating")}</p>
      )}
      {status === "error" && (
        <div className="hunt-collage__status hunt-collage__status--error">
          <p>{t("hunt.collage.error")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void buildCollage()}>
            {t("hunt.collage.retry")}
          </button>
        </div>
      )}
      {status === "ready" && dataUrl && (
        <>
          <img
            src={dataUrl}
            alt={t("hunt.collage.previewAlt")}
            className="hunt-collage__preview"
          />
          <div className="hunt-collage__actions">
            <button type="button" className="btn btn-primary" onClick={() => void handleDownload()}>
              {t("hunt.collage.download")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void handleShare()}>
              {t("hunt.collage.share")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
