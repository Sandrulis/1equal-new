"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { saveSiteSettings } from "@/app/lib/site-admin/actions";
import type { SiteBrand } from "@/app/lib/site-admin/types";
import { useLanguage } from "@/app/lib/language";

export function AdminSettingsForm({ initial }: { initial: SiteBrand }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [name, setName] = useState(initial.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setLogoFile(null);
    setFaviconFile(null);
    setRemoveLogo(false);
    setRemoveFavicon(false);
  }, [initial]);

  const dirty = name !== initial.name || logoFile !== null || faviconFile !== null || removeLogo || removeFavicon;
  const canSave = dirty && name.trim() !== "" && !pending;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setPending(true);
    const formData = new FormData(event.currentTarget);
    if (logoFile) formData.set("logo", logoFile);
    if (faviconFile) formData.set("favicon", faviconFile);
    formData.set("removeLogo", removeLogo ? "1" : "0");
    formData.set("removeFavicon", removeFavicon ? "1" : "0");
    const result = await saveSiteSettings(formData);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("site_settings.saved"), variant: "success" });
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="max-w-3xl space-y-6 rounded-2xl bg-paper p-5 ring-1 ring-line">
      <p className="text-sm leading-6 text-muted">{t("site_settings.lead")}</p>
      <label className="block text-sm font-medium">
        {t("catalog.name")}
        <input
          name="name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField
          label={t("site_settings.form.logo")}
          chooseLabel={t("site_settings.form.drop")}
          dropHint={t("site_settings.form.drop_hint")}
          removeLabel={t("site_settings.form.remove")}
          file={logoFile}
          currentUrl={removeLogo ? null : initial.logoUrl}
          onFile={(file) => {
            setLogoFile(file);
            setRemoveLogo(false);
          }}
          onRemove={() => {
            setLogoFile(null);
            setRemoveLogo(true);
          }}
        />
        <ImageField
          label={t("site_settings.form.favicon")}
          chooseLabel={t("site_settings.form.drop")}
          dropHint={t("site_settings.form.drop_hint")}
          removeLabel={t("site_settings.form.remove")}
          file={faviconFile}
          currentUrl={removeFavicon ? null : initial.faviconUrl}
          onFile={(file) => {
            setFaviconFile(file);
            setRemoveFavicon(false);
          }}
          onRemove={() => {
            setFaviconFile(null);
            setRemoveFavicon(true);
          }}
        />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={!canSave} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
          {t("actions.save")}
        </button>
      </div>
    </form>
  );
}

const IMAGE_NAME = /\.(png|jpe?g|webp|gif|svg|ico)$/i;

function ImageField({
  label,
  chooseLabel,
  dropHint,
  removeLabel,
  file,
  currentUrl,
  onFile,
  onRemove,
}: {
  label: string;
  chooseLabel: string;
  dropHint: string;
  removeLabel: string;
  file: File | null;
  currentUrl: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl;

  function takeFile(next: File | undefined) {
    if (!next) return;
    const image = next.type.startsWith("image/") || IMAGE_NAME.test(next.name);
    if (!image) {
      showFeedback({ message: t("site_settings.error.file"), variant: "error" });
      return;
    }
    onFile(next);
  }

  return (
    <div className="rounded-xl bg-ice p-4 ring-1 ring-line">
      <p className="text-sm font-medium">{label}</p>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          takeFile(event.dataTransfer.files[0]);
        }}
        className={`mt-3 flex h-24 items-center justify-center rounded-lg px-3 text-center ${over ? "bg-train-soft ring-2 ring-train" : "bg-paper ring-1 ring-line"}`}
      >
        {shown ? <img src={shown} alt="" className="max-h-16 max-w-full object-contain" /> : <span className="text-sm text-muted">{dropHint}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line hover:bg-ice">
          {chooseLabel}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,.ico"
            className="sr-only"
            onChange={(event) => {
              takeFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {shown ? (
          <button type="button" onClick={onRemove} className="rounded-lg px-3 py-2 text-sm text-game hover:bg-game-soft">
            {removeLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
