"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "es";

const STORAGE_KEY = "locale";

interface LanguageContextValue {
  locale: Locale;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") setLocale(saved);
  }, []);

  function toggle() {
    setLocale((prev) => {
      const next: Locale = prev === "en" ? "es" : "en";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <LanguageContext.Provider value={{ locale, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Pick the localized string, falling back to English when Spanish is absent. */
export function localize(en: string, es: string | null | undefined, locale: Locale): string {
  return locale === "es" && es ? es : en;
}
