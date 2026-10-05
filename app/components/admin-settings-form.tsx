"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentImage } from "@/app/components/content-image";
import { DisplayPreferencesFields } from "@/app/components/display-preferences";
import { MoneyVotingFields } from "@/app/components/money-voting-fields";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { displaySettingsEqual, type UserDisplayPreferences } from "@/app/lib/display-preferences";
import { isCurrency, votingHours } from "@/app/lib/team-defaults";
import { saveSiteSettings } from "@/app/lib/site-admin/actions";
import type { SiteBrand, SiteLanguage } from "@/app/lib/site-admin/types";
import { useLanguage } from "@/app/lib/language";

function sloganDraft(languages: SiteLanguage[]): Record<string, string> {
  return Object.fromEntries(languages.map((language) => [language.code, language.slogan]));
}

function displayDraft(initial: SiteBrand): UserDisplayPreferences {
  return {
    weekStartDay: initial.display.weekStartDay,
    dateFormat: initial.display.dateFormat,
    dateSeparator: initial.display.dateSeparator,
    timeFormat: initial.display.timeFormat,
    timezone: initial.display.timeZone,
  };
}

export function AdminSettingsForm({ initial, languages }: { initial: SiteBrand; languages: SiteLanguage[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [name, setName] = useState(initial.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [display, setDisplay] = useState(() => displayDraft(initial));
  const [currency, setCurrency] = useState(initial.currency);
  const [trainingHours, setTrainingHours] = useState(String(initial.trainingVotingHours));
  const [gameHours, setGameHours] = useState(String(initial.gameVotingHours));
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [slogans, setSlogans] = useState(() => sloganDraft(languages));
  const [pending, setPending] = useState(false);
  const [seenInitial, setSeenInitial] = useState(initial);
  const [seenLanguages, setSeenLanguages] = useState(languages);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setName(initial.name);
    setLogoFile(null);
    setFaviconFile(null);
    setRemoveLogo(false);
    setRemoveFavicon(false);
    setDisplay(displayDraft(initial));
    setCurrency(initial.currency);
    setTrainingHours(String(initial.trainingVotingHours));
    setGameHours(String(initial.gameVotingHours));
    setContactEmail(initial.contactEmail);
  }
  if (languages !== seenLanguages) {
    setSeenLanguages(languages);
    setSlogans(sloganDraft(languages));
  }

  const displayDirty = !displaySettingsEqual(
    {
      weekStartDay: display.weekStartDay ?? initial.display.weekStartDay,
      dateFormat: display.dateFormat ?? initial.display.dateFormat,
      dateSeparator: display.dateSeparator ?? initial.display.dateSeparator,
      timeFormat: display.timeFormat ?? initial.display.timeFormat,
      timeZone: display.timezone ?? initial.display.timeZone,
    },
    initial.display,
  );
  const trainingValue = votingHours(trainingHours);
  const gameValue = votingHours(gameHours);
  const defaultsDirty = currency !== initial.currency || trainingValue !== initial.trainingVotingHours || gameValue !== initial.gameVotingHours;
  const slogansDirty = languages.some((language) => (slogans[language.code] ?? "") !== language.slogan);
  const dirty = name !== initial.name || contactEmail !== initial.contactEmail || logoFile !== null || faviconFile !== null || removeLogo || removeFavicon || displayDirty || defaultsDirty || slogansDirty;
  const canSave = dirty && name.trim() !== "" && trainingValue != null && gameValue != null && !pending;

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
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("site_settings.form.slogans")}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{t("site_settings.form.slogans_hint")}</p>
        </div>
        {languages.map((language) => (
          <label key={language.code} className="block text-sm font-medium">
            {language.name}
            <input
              name={`slogan:${language.code}`}
              value={slogans[language.code] ?? ""}
              maxLength={200}
              onChange={(event) => setSlogans((current) => ({ ...current, [language.code]: event.target.value }))}
              className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
            />
          </label>
        ))}
      </div>
      <label className="block text-sm font-medium">
        {t("site_settings.form.contact_email")}
        <input
          name="contactEmail"
          type="email"
          value={contactEmail}
          maxLength={200}
          autoComplete="email"
          onChange={(event) => setContactEmail(event.target.value.trim())}
          className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
        />
        <span className="mt-1.5 block text-xs font-normal text-muted">{t("site_settings.form.contact_email_hint")}</span>
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
      <div className="space-y-3 border-t border-line pt-5">
        <h2 className="text-base font-semibold">{t("site_settings.form.display")}</h2>
        <DisplayPreferencesFields idPrefix="site-display" values={display} onChange={setDisplay} system={initial.display} />
      </div>
      <div className="space-y-3 border-t border-line pt-5">
        <h2 className="text-base font-semibold">{t("site_settings.form.defaults")}</h2>
        <MoneyVotingFields
          idPrefix="site-defaults"
          currency={currency}
          trainingHours={trainingHours}
          gameHours={gameHours}
          systemCurrency={initial.currency}
          onCurrency={(value) => {
            if (value && isCurrency(value)) setCurrency(value);
          }}
          onTrainingHours={setTrainingHours}
          onGameHours={setGameHours}
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
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);
  const [over, setOver] = useState(false);

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
        {shown ? <ContentImage src={shown} className="max-h-16 max-w-full object-contain" /> : <span className="text-sm text-muted">{dropHint}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line hover:bg-ice">
          {chooseLabel}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico"
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
