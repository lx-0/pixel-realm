/**
 * PixelRealm i18n — lightweight internationalization framework.
 *
 * Usage:
 *   import { t, changeLanguage, getLanguage, initI18n } from '../i18n';
 *   this.add.text(x, y, t('menu.title'), { ... });
 *
 * Keys use dot notation (e.g. 'menu.title', 'tutorial.step').
 * Simple interpolation: t('tutorial.step', { n: 1, total: 10 })
 * Falls back to English if a key is missing in the active locale.
 * Falls back to the raw key if missing in all locales.
 *
 * Language preference is persisted to localStorage and restored on startup.
 * Call initI18n() once before creating Phaser scenes.
 */

import en from './locales/en.json';
import es from './locales/es.json';

export type Locale = 'en' | 'es';

export interface LocaleInfo {
  code: Locale;
  name: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
];

const LOCALE_MAP: Record<Locale, Record<string, string>> = { en, es };
const LS_KEY = 'pixelrealm_lang';

let _lang: Locale = 'en';

/**
 * Initialise i18n — restores saved language preference from localStorage.
 * Call once at startup before creating any Phaser scenes.
 */
export function initI18n(): void {
  try {
    const saved = localStorage.getItem(LS_KEY) as Locale | null;
    if (saved && saved in LOCALE_MAP) _lang = saved;
  } catch {
    // localStorage unavailable — fall back to English
  }
}

/**
 * Translate a key with optional variable interpolation.
 * Variables are substituted using {varName} placeholders.
 * Falls back to English, then to the raw key if the translation is missing.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const msg =
    LOCALE_MAP[_lang]?.[key] ??
    LOCALE_MAP['en']?.[key] ??
    key;
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Return the currently active locale code. */
export function getLanguage(): Locale {
  return _lang;
}

/**
 * Switch the active locale and persist the choice to localStorage.
 * UI will reflect the new locale on the next scene creation.
 */
export function changeLanguage(lang: Locale): void {
  if (!(lang in LOCALE_MAP)) return;
  _lang = lang;
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    // ignore
  }
}
