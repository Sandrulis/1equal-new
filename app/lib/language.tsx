"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Lang, MessageKey } from "@/app/lib/messages";
import { applyBrandName } from "@/app/lib/site-brand";
import type { PublicI18n } from "@/app/lib/site-admin/types";

const STORAGE_KEY = "1equal-lang";
const langListeners = new Set<() => void>();

function subscribeStoredLang(onChange: () => void) {
  langListeners.add(onChange);
  return () => langListeners.delete(onChange);
}

function emitStoredLang() {
  for (const listener of langListeners) listener();
}

const FALLBACK_I18N: PublicI18n = {
  languages: [
    { code: "lv", name: "Latviešu", isDefault: true },
    { code: "en", name: "English", isDefault: false },
    { code: "ru", name: "Русский", isDefault: false },
  ],
  defaultCode: "lv",
  overrides: {},
};

type LanguageValue = {
  lang: string;
  formatLang: Lang;
  languages: PublicI18n["languages"];
  setLang: (lang: string) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function builtinLang(lang: string, defaultCode: string): Lang {
  if (lang === "en" || lang === "lv" || lang === "ru") return lang;
  if (defaultCode === "en" || defaultCode === "ru") return defaultCode;
  return "lv";
}

function readStoredLang(languages: PublicI18n["languages"], defaultCode: string): string {
  if (typeof window === "undefined") return defaultCode;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && languages.some((language) => language.code === stored)) return stored;
  return defaultCode;
}

const packCache = new Map<Lang, Record<string, string>>();

function rememberPack(lang: Lang, pack: Record<string, string>) {
  packCache.set(lang, pack);
  return pack;
}

async function loadPack(lang: Lang): Promise<Record<string, string>> {
  const cached = packCache.get(lang);
  if (cached) return cached;
  const response = await fetch(`/api/i18n/${lang}`);
  if (!response.ok) return {};
  const pack = (await response.json()) as Record<string, string>;
  return rememberPack(lang, pack);
}

export function LanguageProvider({
  children,
  i18n = FALLBACK_I18N,
  brandName,
  initialLang,
  initialPack,
}: {
  children: ReactNode;
  i18n?: PublicI18n;
  brandName: string;
  initialLang: Lang;
  initialPack: Record<string, string>;
}) {
  const lang = useSyncExternalStore(
    subscribeStoredLang,
    () => readStoredLang(i18n.languages, i18n.defaultCode),
    () => i18n.defaultCode,
  );
  const [packs, setPacks] = useState<Partial<Record<Lang, Record<string, string>>>>(() => ({ [initialLang]: initialPack }));
  const [extraOverrides, setExtraOverrides] = useState<PublicI18n["overrides"]>({});

  useEffect(() => {
    let active = true;
    void fetch("/api/i18n/overrides")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PublicI18n["overrides"];
      })
      .then((body) => {
        if (!active || !body || typeof body !== "object") return;
        setExtraOverrides(body);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const code = builtinLang(lang, i18n.defaultCode);
    if (packs[code]) return;
    let active = true;
    void loadPack(code).then((pack) => {
      if (!active) return;
      setPacks((current) => (current[code] ? current : { ...current, [code]: pack }));
    });
    return () => {
      active = false;
    };
  }, [i18n.defaultCode, lang, packs]);

  const value = useMemo<LanguageValue>(() => {
    const formatLang = builtinLang(lang, i18n.defaultCode);
    const pack = packs[formatLang] ?? packs[initialLang] ?? initialPack;
    return {
      lang,
      formatLang,
      languages: i18n.languages,
      setLang(next) {
        if (!i18n.languages.some((language) => language.code === next)) return;
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
        emitStoredLang();
      },
      t(key, params) {
        let value = extraOverrides[key]?.[lang] || i18n.overrides[key]?.[lang] || pack[key] || extraOverrides[key]?.[i18n.defaultCode] || i18n.overrides[key]?.[i18n.defaultCode] || initialPack[key] || key;
        if (params) {
          for (const [name, param] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(param));
        }
        return applyBrandName(value, brandName);
      },
    };
  }, [brandName, extraOverrides, i18n.defaultCode, i18n.languages, i18n.overrides, initialLang, initialPack, lang, packs]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
