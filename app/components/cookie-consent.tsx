"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DENIED_COOKIE_CONSENT,
  GRANTED_COOKIE_CONSENT,
  OPTIONAL_COOKIE_CATEGORIES,
  getConsentSnapshot,
  subscribeConsent,
  writeCookieConsent,
  type CookieConsentSelection,
  type CookieConsentState,
  type OptionalCookieCategory,
} from "@/app/lib/cookie-consent";
import { useIsClient } from "@/app/lib/use-is-client";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

type CookieConsentValue = {
  consent: CookieConsentState | null;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  saveConsent: (selection: CookieConsentSelection) => void;
  acceptAll: () => void;
  rejectOptional: () => void;
};

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

const CATEGORY_KEYS: Record<OptionalCookieCategory, { title: MessageKey; text: MessageKey }> = {
  preferences: { title: "cookie.preferences.title", text: "cookie.preferences.text" },
  analytics: { title: "cookie.analytics.title", text: "cookie.analytics.text" },
  marketing: { title: "cookie.marketing.title", text: "cookie.marketing.text" },
};

export function useCookieConsent(): CookieConsentValue {
  const value = useContext(CookieConsentContext);
  if (!value) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return value;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore<CookieConsentState | null | undefined>(subscribeConsent, getConsentSnapshot, () => undefined);
  const ready = stored !== undefined;
  const consent = stored ?? null;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const saveConsent = useCallback((selection: CookieConsentSelection) => {
    writeCookieConsent(selection);
    setIsSettingsOpen(false);
  }, []);

  const value = useMemo<CookieConsentValue>(
    () => ({
      consent,
      isSettingsOpen,
      openSettings: () => setIsSettingsOpen(true),
      closeSettings: () => setIsSettingsOpen(false),
      saveConsent,
      acceptAll: () => saveConsent(GRANTED_COOKIE_CONSENT),
      rejectOptional: () => saveConsent(DENIED_COOKIE_CONSENT),
    }),
    [consent, isSettingsOpen, saveConsent],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {ready ? <CookieConsentUi /> : null}
    </CookieConsentContext.Provider>
  );
}

function CookieConsentUi() {
  const { consent, isSettingsOpen } = useCookieConsent();
  const mounted = useIsClient();

  if (!mounted) return null;
  if (isSettingsOpen) return createPortal(<CookieSettings />, document.body);
  if (consent) return null;
  return createPortal(<CookieBanner />, document.body);
}

function PolicyLinks() {
  const { t } = useLanguage();
  const className = "font-medium text-ink underline decoration-line underline-offset-2 hover:text-train";
  return (
    <span className="inline-flex flex-wrap gap-x-4 gap-y-1">
      <Link href="/cookies" className={className}>
        {t("legal.cookies")}
      </Link>
      <Link href="/privacy" className={className}>
        {t("legal.privacy")}
      </Link>
    </span>
  );
}

function CookieBanner() {
  const { t } = useLanguage();
  const { acceptAll, rejectOptional, openSettings } = useCookieConsent();
  const pathname = usePathname();
  const aboveAppNav = pathname.startsWith("/dashboard") || pathname.startsWith("/demo");

  return (
    <div role="region" aria-label={t("cookie.banner.title")} className={`fixed inset-x-0 z-50 p-3 sm:p-4 ${aboveAppNav ? "bottom-0 max-[599px]:bottom-20" : "bottom-0"}`}>
      <div className="mx-auto max-w-4xl rounded-2xl bg-paper p-5 ring-1 ring-line shadow-[0_18px_50px_rgba(16,36,51,0.16)] sm:p-6">
        <div className="flex items-start gap-3">
          <CookieMark />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight">{t("cookie.banner.title")}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{t("cookie.banner.text")}</p>
            <p className="mt-2 text-sm">
              <PolicyLinks />
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <OutlineButton onClick={openSettings}>{t("cookie.customize")}</OutlineButton>
          <OutlineButton onClick={rejectOptional}>{t("cookie.reject")}</OutlineButton>
          <button type="button" onClick={acceptAll} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CookieSettings() {
  const { t } = useLanguage();
  const { consent, closeSettings, saveConsent, acceptAll, rejectOptional } = useCookieConsent();
  const titleId = useId();
  const descriptionId = useId();
  const [selection, setSelection] = useState<CookieConsentSelection>(() =>
    consent
      ? { preferences: consent.preferences, analytics: consent.analytics, marketing: consent.marketing }
      : DENIED_COOKIE_CONSENT,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [closeSettings]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={closeSettings} />
      <div className="relative max-h-[calc(100%-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 ring-1 ring-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {t("cookie.settings")}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">
              {t("cookie.settings.lead")}
            </p>
          </div>
          <button type="button" aria-label={t("event.close")} onClick={closeSettings} className="rounded-lg p-2 text-muted hover:bg-ice hover:text-ink">
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-xl bg-ice p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-semibold">{t("cookie.necessary.title")}</p>
              <span className="shrink-0 rounded-full bg-line px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                {t("cookie.always")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{t("cookie.necessary.text")}</p>
          </div>
          {OPTIONAL_COOKIE_CATEGORIES.map((category) => {
            const keys = CATEGORY_KEYS[category];
            const title = t(keys.title);
            return (
              <div key={category} className="rounded-xl bg-paper p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <ConsentSwitch checked={selection[category]} label={title} onChange={(checked) => setSelection((current) => ({ ...current, [category]: checked }))} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{t(keys.text)}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm">
          <PolicyLinks />
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <OutlineButton onClick={rejectOptional}>{t("cookie.reject")}</OutlineButton>
          <OutlineButton onClick={acceptAll}>{t("cookie.accept")}</OutlineButton>
          <button type="button" onClick={() => saveConsent(selection)} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
            {t("cookie.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutlineButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice">
      {children}
    </button>
  );
}

function ConsentSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${checked ? "bg-navy" : "bg-line"}`}
    >
      <span className={`inline-block size-5 rounded-full bg-paper shadow-sm ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function CookieMark() {
  return (
    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ice text-muted" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3a9 9 0 1 0 8.2 12.6 3.2 3.2 0 0 1-3.4-4.4A3.2 3.2 0 0 1 12.6 8 3.2 3.2 0 0 1 12 3z" />
        <circle cx="9" cy="13" r="0.8" fill="currentColor" />
        <circle cx="13" cy="16" r="0.8" fill="currentColor" />
        <circle cx="14" cy="11" r="0.8" fill="currentColor" />
      </svg>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
