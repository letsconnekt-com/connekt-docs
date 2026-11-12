import { DEFAULT_LANGUAGE } from "./i18n";

/**
 * Whether a page has its own file for `lang` (`plans-compared.ja.mdx`), rather than being the English fallback that
 * Fumadocs serves for untranslated pages.
 */
export function isTranslated(page: { absolutePath?: string }, lang: string): boolean {
  if (lang === DEFAULT_LANGUAGE) return true;
  return page.absolutePath?.endsWith(`.${lang}.mdx`) ?? false;
}
