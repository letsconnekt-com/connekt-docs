# Connekt Help Centre

The Connekt documentation site, built with [Fumadocs](https://fumadocs.dev) and Next.js.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Project structure

| Path                           | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| `content/docs/`                | MDX pages, served from the site root                              |
| `content/docs/meta.json`       | Sidebar groups and order (each folder also has its own `meta.json`) |
| `src/components/mdx.tsx`       | MDX components (Steps, Cards, Callouts, Tabs, Accordions)        |
| `src/components/fa-icons.tsx`  | Font Awesome → Lucide icon mapping for `<Card icon="…">`          |
| `src/lib/source.ts`            | Content source and sidebar configuration                          |
| `src/app/[lang]/(docs)/`       | Docs layout and page route, under the language segment           |
| `src/lib/i18n.ts`              | Languages, URL prefixes, hreflang and Open Graph locales          |
| `messages/`                    | UI strings (`en.json` is the source, the rest are translations)   |
| `scripts/translate.mjs`        | `pnpm translate`: machine translation drafts through OpenRouter   |
| `src/app/api/chat/route.ts`    | "Ask AI" chat, requires `OPENROUTER_API_KEY`                      |
| `src/app/llms.txt`, `llms-full.txt` | Machine-readable docs for LLMs                              |

## Adding a page

1. Create `content/docs/<section>/<slug>.mdx` with `title`, `description` and optionally `sidebarTitle` frontmatter.
2. Add the slug to `content/docs/<section>/meta.json` in the position it should appear.
3. Run `pnpm translate`, then `pnpm check:i18n`.

## Languages

The Help Centre is available in English (default) and Japanese, using [Fumadocs i18n](https://www.fumadocs.dev/docs/next/internationalization). Simplified Chinese, Traditional Chinese (Hong Kong) and Korean are set up but switched off for now (see [Enabling another language](#enabling-another-language)). Languages and URLs match the marketing site (www.letsconnekt.com).

| Code    | URL prefix          | `<html lang>` / hreflang                         | Open Graph | Status   |
| ------- | ------------------- | ------------------------------------------------ | ---------- | -------- |
| `en`    | none (`/billing/…`) | `en-GB` / `en`, plus `x-default`                 | `en_GB`    | live     |
| `ja`    | `/ja`               | `ja`                                             | `ja_JP`    | live     |
| `zh`    | `/zh`               | `zh-Hans`                                        | `zh_CN`    | disabled |
| `zh-hk` | `/zh-hk`            | `zh-HK` (also declared as `zh-Hant`)             | `zh_HK`    | disabled |
| `ko`    | `/ko`               | `ko`                                             | `ko_KR`    | disabled |

Here the language code is the URL prefix, so `zh-hk` is what the marketing site and the app call `zh-TW`.

- **Files:** a translation sits next to its English page with the language before the extension (`plans-compared.ja.mdx`), and sidebar labels live in `meta.ja.json` (Fumadocs' `dot` convention). A page without a translation falls back to English at the same URL.
- **Routing:** `src/proxy.ts` serves English unprefixed (internally `app/[lang]` with `lang = en`) and redirects `/en/...` to it. There's no redirect based on `Accept-Language` or cookies, and no cookie is set, so pages stay cacheable. The language switcher sits in the sidebar footer. `/ja/billing/plans-compared.md` (or `Accept: text/markdown`) returns a page's Markdown.
- **SEO:** each page sets its canonical URL, hreflang alternates for the languages it's translated into (plus `x-default`), and the Open Graph locale. An untranslated page shown in English canonicalizes to the English URL. Share images (`/og/docs/<lang>/...`) use a Noto Sans subset from Google Fonts for CJK titles, and fall back to the English image if the font can't load.
- **Anchors:** translated headings keep the English anchor (`## 料金の仕組み [#how-pricing-works]`), so `#anchor` links and shared URLs work in every language.
- **Links:** in translations, internal links point at the same language (`/ja/billing/...`) and links to www.letsconnekt.com go to the same language on the marketing site.
- **UI strings:** Fumadocs UI's and ours (Ask AI panel, callout labels, site name) are in `messages/<lang>.json`, keyed in the Fumadocs format `Label(context)`. Add new strings to `messages/en.json` and register nothing else: `src/lib/translations.ts` picks them up. Read them with `useTranslations()` from `@fuma-translate/react` (client) or `getT(lang)` (server).
- **Search and Ask AI:** search is scoped to the current language. Ask AI answers in the page's language and links to that language's pages. `llms.txt` and `llms-full.txt` stay English.

### Translation (`pnpm translate`)

`scripts/translate.mjs` drafts every enabled language (currently Japanese) through OpenRouter. It needs `OPENROUTER_API_KEY` in `.env.local` (the same key as Ask AI).

- **Prompting:** each request sends product context, help-centre style and MDX rules, a per-language style guide and the recruitment glossary shared with the marketing site and the app (`scripts/translation/guide.mjs`). Bold UI labels follow the app's own translations, read from `../connekt/frontend/messages` (set `CONNEKT_APP_MESSAGES_DIR` if the app lives elsewhere; without it the labels get no hints).
- **Checks:** a translated page must compile as MDX and keep English's components, attributes, links, code, headings, lists and tables. A rejected page is retried with the problems listed, then left in English and reported.
- **Model:** `openai/gpt-6.1-sol` for every language (set in `MODELS`), the same as the marketing site and the app. A page costs about $0.02–0.05 per language. Requests allow providers that log or train on prompts, which is fine for public documentation.
- **Incremental:** `content/.translation-cache.json` and `messages/.translation-cache.json` store a hash of each English source, so reruns only send new or changed pages and strings. Use `--locale ja` for one language, `--page billing/` for some pages, `--strings-only` or `--pages-only`, `--dry-run` to count pending work and `--force` to redo everything.
- **Manual fixes:** edit a translated page directly. The edit is kept on reruns. If its English page changes later, `pnpm translate` reports it instead of overwriting it; update it by hand or rerun with `--force --page <path>`. For UI strings and sidebar labels, use `messages/overrides/<lang>.json` (flat, same keys as the catalogs, meta labels as `meta:<file>#<item>`); overrides always win.
- **Review:** machine output is a draft. Have a native speaker review it, starting with security, consent, billing and plan pages.

### Enabling another language

Simplified Chinese (`zh`), Hong Kong Chinese (`zh-hk`) and Korean (`ko`) are commented out, marked `disabled languages`. Their style guides and glossaries are already in `scripts/translation/guide.mjs`. To switch one on:

1. Uncomment it in `TARGET_LANGUAGES` (`scripts/i18n/shared.mjs`) and `MODELS` (`scripts/translate.mjs`).
2. Run `pnpm translate --locale <code>` (about $2–2.50 per language for all pages), then `pnpm check:i18n`.
3. Uncomment it in `LANGUAGES` and `LANGUAGE_META` (`src/lib/i18n.ts`), the catalog import in `src/lib/translations.ts`, `CJK_FONT` in `src/components/og-image.tsx`, and add it to the redirect pattern in `next.config.mjs`.

Translating before step 3 keeps the language off the site until its pages exist; otherwise its URLs would show English pages.

### Checks

```bash
pnpm check:i18n            # translated pages match English's structure and anchors, strings keep placeholders; warns about untranslated and stale pages
pnpm check:i18n --strict   # also fails on warnings
pnpm types:check
pnpm build
```
