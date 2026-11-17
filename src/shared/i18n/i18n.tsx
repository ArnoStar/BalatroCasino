// The casino in the player's language: English and Russian (the game has more;
// its other languages fall back to the browser's, then English). The choice is
// the site's: the game's settings keep it (language.ts), so the portal, the
// casino and the game speak the same one.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ProblemError } from '@/shared/api';
import { browser_languages, on_language_change, store_language, stored_language } from './language';
import { en, type Messages } from './messages/en';
import { ru } from './messages/ru';

export type Lang = 'en' | 'ru';

export interface Language {
  code: Lang;
  /** its own name */
  name: string;
  /** the game's key for it (its settings) */
  game: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', game: 'en-us' },
  { code: 'ru', name: 'Русский', game: 'ru' },
];

const MESSAGES: Record<Lang, Messages> = { en, ru };

/** one of ours for a language key or tag (the game's "en-us", the browser's "ru-RU"), or null */
function ours(key: string | null): Lang | null {
  if (!key) return null;
  const k = key.toLowerCase();
  const found = LANGUAGES.find((l) => l.game === k || l.code === k || l.code === k.split(/[-_]/)[0]);
  return found?.code ?? null;
}

function initial(): Lang {
  const chosen = ours(stored_language());
  if (chosen) return chosen;
  for (const tag of browser_languages()) {
    const l = ours(tag);
    if (l) return l;
  }
  return 'en';
}

export interface Formats {
  /** 12,400 (12 400 in Russian) */
  number(x: number): string;
  /** 12.4K */
  compact(x: number): string;
  /** a percent given as 0..100: 23%, 4.5%, 0.25% */
  percent(x: number): string;
  /** a multiplier: 4.25 */
  times(x: number): string;
  /** 5 minutes ago */
  ago(iso: string, now?: number): string;
  /** 17 Nov 2026, 14:05 */
  datetime(iso: string): string;
  /** a countdown: 0:42 */
  clock(ms: number): string;
  /** 2 seconds, 60 seconds */
  seconds(s: number): string;
  /** 7 */
  days(d: number): string;
}

function formats(locale: string): Formats {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const times = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const datetime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const seconds = new Intl.NumberFormat(locale, { style: 'unit', unit: 'second', unitDisplay: 'long', maximumFractionDigits: 0 });
  const days = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return {
    number: (x) => number.format(x),
    compact: (x) => (Math.abs(x) < 10_000 ? number.format(x) : compact.format(x)),
    percent: (x) =>
      new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: x >= 10 || x === 0 ? 0 : x >= 1 ? 1 : 2 }).format(x / 100),
    times: (x) => times.format(x),
    ago(iso, now = Date.now()) {
      const s = (Date.parse(iso) - now) / 1000;
      const a = Math.abs(s);
      if (a < 45) return relative.format(0, 'second');
      if (a < 3600) return relative.format(Math.round(s / 60), 'minute');
      if (a < 86400) return relative.format(Math.round(s / 3600), 'hour');
      if (a < 86400 * 7) return relative.format(Math.round(s / 86400), 'day');
      return date.format(new Date(iso));
    },
    datetime: (iso) => datetime.format(new Date(iso)),
    clock(ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },
    seconds: (s) => seconds.format(s),
    days: (d) => days.format(d),
  };
}

export interface I18n {
  lang: Lang;
  t: Messages;
  f: Formats;
  set_lang(lang: Lang): void;
  /** a service's error, for the player (its stable code, in their language) */
  describe(error: unknown): string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // (the portal, the game or another tab changed it)
  useEffect(() => on_language_change(() => setLang(initial())), []);

  const set_lang = useCallback((l: Lang) => {
    store_language(LANGUAGES.find((x) => x.code === l)?.game ?? l);
    setLang(l);
  }, []);

  const value = useMemo<I18n>(() => {
    const t = MESSAGES[lang];
    return {
      lang,
      t,
      f: formats(lang),
      set_lang,
      describe(error) {
        if (error instanceof ProblemError) {
          const known = t.errors.codes[error.code];
          if (known) return known;
          return error.message ? error.message.charAt(0).toUpperCase() + error.message.slice(1) + '.' : t.errors.unknown;
        }
        if (error instanceof TypeError) return t.errors.network;
        return t.errors.unknown;
      },
    };
  }, [lang, set_lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}
