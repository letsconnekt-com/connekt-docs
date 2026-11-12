import type { TranslationExtension } from "fumadocs-core/i18n";
import { uiTranslations } from "fumadocs-ui/i18n";
import { i18n, LANGUAGE_META, type Language } from "./i18n";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
// disabled languages (run `pnpm translate --locale <code>` first to create the catalog):
// import ko from "../../messages/ko.json";
// import zh from "../../messages/zh.json";
// import zhHK from "../../messages/zh-hk.json";

/**
 * UI strings. Keys follow the Fumadocs format, "Label(context)(more context)"; the English text is the label.
 * `messages/en.json` lists every key (Fumadocs UI's plus ours), `pnpm translate` writes the other catalogs.
 */
type Catalog = Partial<Record<string, string>>;

const catalogs: Record<Language, Catalog> = {
  en: {},
  ja,
  // disabled languages:
  // zh,
  // "zh-hk": zhHK,
  // ko,
};

/** Our own keys (everything in en.json that Fumadocs UI doesn't define), registered so they reach the client payload. */
function docsTranslations(): TranslationExtension<string> {
  const builtIn = new Set<string>(uiTranslations().keys);
  return { keys: Object.keys(en).filter((key) => !builtIn.has(key)) };
}

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .extend(docsTranslations())
  .add(Object.fromEntries(Object.entries(catalogs).map(([lang, catalog]) => [lang, { ...catalog, displayName: LANGUAGE_META[lang as Language].endonym }])));

/** Server-side lookup, same semantics as `useTranslations()` from `@fuma-translate/react` (which is client-only). */
export function getT(lang: Language) {
  const catalog = catalogs[lang];
  return function t(text: string, opts: { note?: string; variables?: Record<string, string | number> } = {}) {
    const key = opts.note ? `${text}(${opts.note})` : text;
    let value = catalog[key] ?? text;
    for (const [name, replacement] of Object.entries(opts.variables ?? {})) value = value.replaceAll(`{${name}}`, String(replacement));
    return value;
  };
}

export const SITE_DESCRIPTION = "Step-by-step guides for every part of Connekt — from setting up your workspace to managing pipelines, placements, and your whole team.";
