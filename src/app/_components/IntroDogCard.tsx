"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DogPhotoSourcePicker } from "@/app/dogs/_components/DogPhotoSourcePicker";
import { uploadDogPhotoAction } from "@/app/dogs/actions";
import { useI18n } from "@/i18n/client";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";

type IntroDogCardProps = {
  dog: {
    id: string;
    name: string;
    woofCoins: number;
    photoUrl: string | null;
    updatedAt: Date | string;
  };
};

export function IntroDogCard({ dog }: IntroDogCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState<number | null>(null);
  const previewRef = useRef<string | null>(null);
  const photoLabel = t("dogs.photo.addProfilePhoto");
  const hasPhoto = Boolean(dog.photoUrl || previewUrl);
  const displaySrc =
    previewUrl ??
    (dog.photoUrl
      ? dogPhotoApiSrc(dog.id, photoVersion ?? dog.updatedAt)
      : null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  function handleFileSelect(file: File) {
    clearPreview();
    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.set("dogId", dog.id);
    formData.set("photo", file);

    startTransition(async () => {
      const result = await uploadDogPhotoAction(formData);
      if (result.error) {
        window.alert(result.error);
        clearPreview();
        return;
      }
      setPhotoVersion(Date.now());
      clearPreview();
      router.refresh();
    });
  }

  return (
    <article className="intro-dog-card">
      <DogPhotoSourcePicker
        disabled={isPending}
        onFileSelect={handleFileSelect}
      >
        {({ open, disabled }) => (
          <button
            type="button"
            className={`intro-dog-card__photo intro-dog-card__photo-btn${hasPhoto ? "" : " intro-dog-card__photo-btn--empty"}`}
            onClick={open}
            disabled={disabled}
            aria-label={photoLabel}
            aria-busy={isPending}
          >
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="intro-dog-card__placeholder" aria-hidden>
                🐕
              </span>
            )}
            <span className="intro-dog-card__photo-overlay" aria-hidden>
              {isPending ? "…" : photoLabel}
            </span>
          </button>
        )}
      </DogPhotoSourcePicker>
      <Link href={`/dogs/${dog.id}`} className="intro-dog-card__body">
        <p className="intro-dog-card__name">{dog.name}</p>
        <span className="coin-badge text-sm">🪙 {dog.woofCoins}</span>
      </Link>
    </article>
  );
}
