"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { messages, translate, type Lang, type MessageKey } from "@/app/lib/messages";
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

export function LanguageProvider({
  children,
  i18n = FALLBACK_I18N,
  brandName,
}: {
  children: ReactNode;
  i18n?: PublicI18n;
  brandName: string;
}) {
  const lang = useSyncExternalStore(
    subscribeStoredLang,
    () => readStoredLang(i18n.languages, i18n.defaultCode),
    () => i18n.defaultCode,
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageValue>(() => {
    const formatLang = builtinLang(lang, i18n.defaultCode);
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
        const builtIn = messages[key];
        if (!builtIn) {
          let missing = i18n.overrides[key]?.[lang] || i18n.overrides[key]?.[i18n.defaultCode] || key;
          if (params) {
            for (const [name, param] of Object.entries(params)) missing = missing.replaceAll(`{${name}}`, String(param));
          }
          return applyBrandName(missing, brandName);
        }
        const built = lang === "en" || lang === "lv" || lang === "ru" ? builtIn[lang] : undefined;
        const fallback = i18n.defaultCode === "en" ? builtIn.en : i18n.defaultCode === "ru" ? builtIn.ru : builtIn.lv;
        let value = i18n.overrides[key]?.[lang] || built || i18n.overrides[key]?.[i18n.defaultCode] || fallback || builtIn.lv;
        if (!value) value = translate(formatLang, key, params);
        else if (params) {
          for (const [name, param] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(param));
        }
        return applyBrandName(value, brandName);
      },
    };
  }, [brandName, i18n.defaultCode, i18n.languages, i18n.overrides, lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
