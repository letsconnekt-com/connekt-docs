import { defineI18n } from 'fumadocs-core/i18n';

/**
 * Help Centre languages, matching the marketing site (www.letsconnekt.com): English unprefixed, then /ja.
 * Simplified Chinese (/zh), Hong Kong Chinese (/zh-hk) and Korean (/ko) are ready but switched off for now; to enable one,
 * uncomment it here and everywhere marked "disabled languages" (see README → Languages).
 * The locale code is the URL prefix, so `zh-hk` is the site's and app's `zh-TW` (Hong Kong Traditional Chinese).
 */
export const LANGUAGES = [
  'en',
  'ja',
  // disabled languages:
  // 'zh',
  // 'zh-hk',
  // 'ko',
] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export const i18n = defineI18n({
  languages: [...LANGUAGES],
  defaultLanguage: DEFAULT_LANGUAGE,
  // English stays at `/billing/...`, other languages get a prefix (`/ja/billing/...`)
  hideLocale: 'default-locale',
  // translations sit next to the English file: `plans-compared.ja.mdx`, `meta.ja.json`
  parser: 'dot',
  // untranslated pages fall back to English, so every URL exists in every language
});

interface LanguageMeta {
  /** `<html lang>`, so browsers pick the right Han glyph variant. */
  htmlLang: string;
  /** Primary hreflang value. */
  hreflang: string;
  /** More hreflang values served by the same URL (Traditional Chinese readers outside Hong Kong get the HK pages). */
  extraHreflang?: readonly string[];
  /** Open Graph locale. */
  ogLocale: string;
  /** Language name in its own language, for the switcher. */
  endonym: string;
  /** Plain English name, for prompts and logs. */
  englishName: string;
}

export const LANGUAGE_META: Record<Language, LanguageMeta> = {
  en: { htmlLang: 'en-GB', hreflang: 'en', ogLocale: 'en_GB', endonym: 'English', englishName: 'English' },
  ja: { htmlLang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP', endonym: '日本語', englishName: 'Japanese' },
  // disabled languages:
  // zh: { htmlLang: 'zh-Hans', hreflang: 'zh-Hans', ogLocale: 'zh_CN', endonym: '简体中文', englishName: 'Simplified Chinese' },
  // 'zh-hk': {
  //   htmlLang: 'zh-HK',
  //   hreflang: 'zh-HK',
  //   extraHreflang: ['zh-Hant'],
  //   ogLocale: 'zh_HK',
  //   endonym: '繁體中文',
  //   englishName: 'Traditional Chinese (Hong Kong)',
  // },
  // ko: { htmlLang: 'ko', hreflang: 'ko', ogLocale: 'ko_KR', endonym: '한국어', englishName: 'Korean' },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Public path for a language: `/billing/x` in English, `/ja/billing/x` in Japanese, `/ja` for the Japanese home page. */
export function localizedPath(path: string, lang: Language): string {
  if (lang === DEFAULT_LANGUAGE) return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

/** Strips a language prefix from a pathname, returning the language and the English path. */
export function splitLanguagePath(pathname: string): { lang: Language; path: string; prefixed: boolean } {
  const first = pathname.split('/')[1];
  if (isLanguage(first)) return { lang: first, path: pathname.slice(first.length + 1) || '/', prefixed: true };
  return { lang: DEFAULT_LANGUAGE, path: pathname, prefixed: false };
}
