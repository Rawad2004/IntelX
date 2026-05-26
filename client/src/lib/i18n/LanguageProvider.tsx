"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  DICTIONARIES,
  Dictionary,
  Locale,
  LOCALES,
} from "./dictionaries";

const STORAGE_KEY = "intelx-locale";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

export function LanguageProvider({
  children,
  defaultLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved) && saved !== locale) {
        setLocaleState(saved);
      }
    } catch {
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
    }
  }, []);

  const toggle = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "en" ? "es" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
      }
      return next;
    });
  }, []);

  const dict = DICTIONARIES[locale];

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const value = resolveByPath(dict, path);
      if (typeof value !== "string") {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] missing key "${path}" for locale "${locale}"`);
        }
        return path;
      }
      return interpolate(value, vars);
    },
    [dict, locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, toggle, t, dict }),
    [locale, setLocale, toggle, t, dict],
  );

  return (
    <LanguageContext.Provider value={value}>
      <span data-i18n-hydrated={hydrated} hidden />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
