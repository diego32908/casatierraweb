"use client";

import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { locale, toggle } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={locale === "en" ? "Switch to Spanish" : "Switch to English"}
      className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400 transition-colors hover:text-stone-900"
    >
      {locale === "en" ? "ES" : "EN"}
    </button>
  );
}
