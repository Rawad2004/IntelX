"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LOCALE_LABELS } from "@/lib/i18n/dictionaries";

export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggle, t } = useLanguage();
  const other = locale === "en" ? "es" : "en";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("languageToggle.switchTo", { language: LOCALE_LABELS[other] })}
      title={t("languageToggle.switchTo", { language: LOCALE_LABELS[other] })}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white ${className}`}
    >
      <span aria-hidden="true">{locale === "en" ? "🇬🇧" : "🇪🇸"}</span>
      <span className="uppercase tracking-wide">{locale}</span>
    </button>
  );
}
