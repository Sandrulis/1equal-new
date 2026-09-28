"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ContentImage } from "@/app/components/content-image";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useLanguage } from "@/app/lib/language";

const STAGE = 240;
const OUTPUT = 512;
const SOURCE_MAX = 8 * 1024 * 1024;

export type AvatarCropHandle = {
  result(): Promise<{ file: File | null; remove: boolean; changed: boolean }>;
};

type Loaded = {
  image: HTMLImageElement;
  zoom: number;
  x: number;
  y: number;
};

function covered(image: HTMLImageElement, zoom: number) {
  const base = Math.max(STAGE / image.naturalWidth, STAGE / image.naturalHeight);
  const scale = base * zoom;
  return { scale, width: image.naturalWidth * scale, height: image.naturalHeight * scale };
}

function clamped(image: HTMLImageElement, zoom: number, x: number, y: number) {
  const { width, height } = covered(image, zoom);
  const maxX = Math.max(0, (width - STAGE) / 2);
  const maxY = Math.max(0, (height - STAGE) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
}

async function exportSquare(loaded: Loaded): Promise<File | null> {
  const { image, zoom, x, y } = loaded;
  const { scale, width, height } = covered(image, zoom);
  const left = (STAGE - width) / 2 + x;
  const top = (STAGE - height) / 2 + y;
  const size = STAGE / scale;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, -left / scale, -top / scale, size, size, 0, 0, OUTPUT, OUTPUT);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) return null;
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export const AvatarCropField = forwardRef<AvatarCropHandle, { existingUrl?: string | null; disabled?: boolean; onDirty?: (dirty: boolean) => void }>(
  function AvatarCropField({ existingUrl = null, disabled = false, onDirty }, ref) {
    const { t } = useLanguage();
    const { showFeedback } = useFeedbackToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [removed, setRemoved] = useState(false);
    const [over, setOver] = useState(false);
    const latest = useRef({ loaded, removed });
    const dirtyNotify = useRef(onDirty);
    latest.current = { loaded, removed };
    dirtyNotify.current = onDirty;

    useEffect(() => {
      dirtyNotify.current?.(Boolean(loaded) || removed);
    }, [loaded, removed]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !loaded) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const { scale, width, height } = covered(loaded.image, loaded.zoom);
      const left = (STAGE - width) / 2 + loaded.x;
      const top = (STAGE - height) / 2 + loaded.y;
      const size = STAGE / scale;
      context.clearRect(0, 0, STAGE, STAGE);
      context.drawImage(loaded.image, -left / scale, -top / scale, size, size, 0, 0, STAGE, STAGE);
    }, [loaded]);

    useImperativeHandle(ref, () => ({
      async result() {
        const current = latest.current;
        if (current.removed) return { file: null, remove: true, changed: true };
        if (!current.loaded) return { file: null, remove: false, changed: false };
        const file = await exportSquare(current.loaded);
        return { file, remove: false, changed: true };
      },
    }));

    function fail() {
      showFeedback({ message: t("avatar.error.file"), variant: "error" });
    }

    function take(file: File | undefined) {
      if (!file || disabled) return;
      if (file.size <= 0 || file.size > SOURCE_MAX || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        fail();
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        setLoaded({ image, zoom: 1, x: 0, y: 0 });
        setRemoved(false);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        fail();
      };
      image.src = url;
    }

    function move(zoom: number, x: number, y: number) {
      if (!loaded) return;
      const next = clamped(loaded.image, zoom, x, y);
      setLoaded({ image: loaded.image, zoom, x: next.x, y: next.y });
    }

    const showExisting = !loaded && !removed && existingUrl;

    return (
      <div className={disabled ? "opacity-60" : undefined}>
        <span className="text-sm font-medium">{t("avatar.photo")}</span>
        <p className="mt-1 text-sm text-muted">{t("avatar.hint")}</p>
        {loaded ? (
          <div
            className="relative mt-3 overflow-hidden rounded-2xl bg-ice ring-1 ring-line"
            style={{ width: STAGE, height: STAGE, touchAction: "none", cursor: "grab" }}
            onPointerDown={(event) => {
              if (disabled) return;
              dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: loaded.x, originY: loaded.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.id !== event.pointerId) return;
              move(loaded.zoom, drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y);
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
          >
            <canvas ref={canvasRef} width={STAGE} height={STAGE} className="h-full w-full" />
          </div>
        ) : (
          <label
            className={`mt-3 grid h-28 cursor-pointer place-items-center rounded-2xl bg-ice px-4 text-center text-sm text-muted ring-1 ring-line ${over ? "ring-train" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!disabled) setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              take(event.dataTransfer.files[0]);
            }}
          >
            <span className="grid justify-items-center gap-2">
              {showExisting ? <ContentImage src={existingUrl} className="h-16 w-16 rounded-xl object-cover" /> : null}
              <span>{t("site_settings.form.drop_hint")}</span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              className="sr-only"
              onChange={(event) => {
                take(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {loaded ? (
          <label className="mt-3 block text-sm text-muted">
            {t("avatar.zoom")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={loaded.zoom}
              disabled={disabled}
              onChange={(event) => move(Number(event.target.value), loaded.x, loaded.y)}
              className="mt-1 w-full max-w-[240px]"
            />
          </label>
        ) : null}
        <div className="mt-2 flex gap-2">
          {loaded ? (
            <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="text-sm font-medium text-train">
              {t("site_settings.form.drop")}
            </button>
          ) : null}
          {loaded || showExisting ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setLoaded(null);
                setRemoved(true);
              }}
              className="text-sm font-medium text-muted"
            >
              {t("site_settings.form.remove")}
            </button>
          ) : null}
        </div>
        {loaded ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              take(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        ) : null}
      </div>
    );
  },
);
