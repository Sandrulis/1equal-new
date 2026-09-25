"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Lang, type MessageKey } from "@/app/lib/messages";

const STORAGE_KEY = "1equal-lang";

type LanguageValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "lv";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "lv";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("lv");

  useEffect(() => {
    const stored = readStoredLang();
    setLangState(stored);
    document.documentElement.lang = stored;
  }, []);

  const value = useMemo<LanguageValue>(() => {
    return {
      lang,
      setLang(next) {
        setLangState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
      },
      t(key, params) {
        return translate(lang, key, params);
      },
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
