"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import { compressDogPhoto } from "@/lib/dogs/compressPhoto";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

type DogPhotoSourcePickerProps = {
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  children?: (props: { open: () => void; disabled: boolean }) => ReactNode;
};

function assignFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

export function DogPhotoSourcePicker({
  onFileSelect,
  disabled = false,
  name,
  id,
  className,
  children,
}: DogPhotoSourcePickerProps) {
  const { t } = useI18n();
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const closeSheet = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCompressing(true);
    let uploadFile = file;
    try {
      uploadFile = await compressDogPhoto(file);
    } catch (error) {
      console.error("[DogPhotoSourcePicker] compression failed, using original", error);
    } finally {
      setCompressing(false);
    }

    if (name) {
      assignFileToInput(formInputRef.current, uploadFile);
    }

    onFileSelect?.(uploadFile);
    closeSheet();
  }

  function openCamera() {
    closeSheet();
    cameraInputRef.current?.click();
  }

  function openGallery() {
    closeSheet();
    galleryInputRef.current?.click();
  }

  const isBusy = disabled || compressing;

  const trigger = children?.({
    open: () => {
      if (!isBusy) setOpen(true);
    },
    disabled: isBusy,
  });

  return (
    <>
      {trigger}

      {!children && (
        <div className={className ?? "flex flex-wrap gap-2"}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(true)}
            disabled={isBusy}
          >
            {compressing ? "…" : t("dogs.photo.addProfilePhoto")}
          </button>
        </div>
      )}

      {name && (
        <input
          ref={formInputRef}
          type="file"
          id={inputId}
          name={name}
          accept={ACCEPT}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden
        />
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="user"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPT}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileChange}
      />

      {open && (
        <div className="photo-source-sheet" role="presentation">
          <button
            type="button"
            className="photo-source-sheet__backdrop"
            aria-label={t("common.cancel")}
            onClick={closeSheet}
          />
          <div
            className="photo-source-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-photo-source-title`}
          >
            <p id={`${inputId}-photo-source-title`} className="photo-source-sheet__title">
              {compressing ? "…" : t("dogs.photo.choosePhoto")}
            </p>
            <button type="button" className="photo-source-sheet__action" onClick={openCamera}>
              {t("dogs.photo.takePhoto")}
            </button>
            <button type="button" className="photo-source-sheet__action" onClick={openGallery}>
              {t("dogs.photo.chooseFromGallery")}
            </button>
            <button
              type="button"
              className="photo-source-sheet__action photo-source-sheet__action--ghost"
              onClick={closeSheet}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
