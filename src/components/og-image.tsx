import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import rootMeta from '../../content/docs/meta.json';
import { DEFAULT_LANGUAGE, type Language } from '@/lib/i18n';
import { getT } from '@/lib/translations';

const brand = '#007aff';

// sidebar group label for each content folder, from the `---Label---` / `...folder` pairs in the root meta.json
function parseSectionNames(pages: string[]) {
  const names = new Map<string, string>();
  pages.forEach((item, i) => {
    const next = pages[i + 1];
    const label = /^---(.+)---$/.exec(item)?.[1];
    if (label && next?.startsWith('...')) names.set(next.slice(3), label);
  });
  return names;
}

const englishSectionNames = parseSectionNames(rootMeta.pages);

/** Section labels from `meta.<lang>.json`, falling back to English per label. */
async function sectionNames(lang: Language) {
  if (lang === DEFAULT_LANGUAGE) return englishSectionNames;
  try {
    const meta = JSON.parse(await readFile(join(process.cwd(), `content/docs/meta.${lang}.json`), 'utf8')) as { pages: string[] };
    return new Map([...englishSectionNames, ...parseSectionNames(meta.pages)]);
  } catch {
    return englishSectionNames;
  }
}

const logo = readFile(join(process.cwd(), 'public/logo.svg')).then(
  (svg) => `data:image/svg+xml;base64,${svg.toString('base64')}`,
);

// Geist, the Connekt app font (Satori only bundles a regular-weight fallback)
const fonts = Promise.all(
  (['Regular', 'SemiBold'] as const).map((weight) => readFile(join(process.cwd(), `src/assets/fonts/Geist-${weight}.ttf`))),
);

/** Noto Sans per CJK language; Hong Kong uses the HK glyph forms. Same choice as the marketing site's share images. */
const CJK_FONT: Partial<Record<Language, string>> = {
  ja: 'Noto Sans JP',
  // disabled languages:
  // zh: 'Noto Sans SC',
  // 'zh-hk': 'Noto Sans HK',
  // ko: 'Noto Sans KR',
};

/**
 * A Google Fonts subset containing only `text`'s glyphs (a few KB instead of several MB).
 * Requested without a browser user agent so Google serves TrueType, which Satori can read (it cannot read WOFF2).
 */
async function loadSubset(family: string, weight: 400 | 600, text: string): Promise<ArrayBuffer> {
  const query = `family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, { signal: AbortSignal.timeout(10_000) }).then((res) => {
    if (!res.ok) throw new Error(`Google Fonts CSS ${res.status}`);
    return res.text();
  });
  const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
  if (!url) throw new Error(`No TrueType source for ${family}`);
  const font = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!font.ok) throw new Error(`Google Fonts file ${font.status}`);
  return font.arrayBuffer();
}

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' };

/** CJK fonts covering `semiBoldText` and `regularText`, [] for Latin languages, or null when they can't be loaded. */
async function loadCjkFonts(lang: Language, semiBoldText: string, regularText: string): Promise<OgFont[] | null> {
  const family = CJK_FONT[lang];
  if (!family) return [];
  try {
    const [semiBold, regular] = await Promise.all([
      loadSubset(family, 600, semiBoldText),
      regularText ? loadSubset(family, 400, regularText) : null,
    ]);
    return [
      { name: 'CJK', data: semiBold, weight: 600, style: 'normal' },
      ...(regular ? [{ name: 'CJK', data: regular, weight: 400 as const, style: 'normal' as const }] : []),
    ];
  } catch (error) {
    console.warn(`OG image: ${family} unavailable, using the English image.`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Display width in Latin characters: CJK and other full-width characters count double. */
function visualLength(text: string) {
  let length = 0;
  for (const char of text) length += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(char) ? 2 : 1;
  return length;
}

function truncate(text: string, max: number) {
  if (visualLength(text) <= max) return text;
  let out = '';
  for (const char of text) {
    if (visualLength(out + char) > max - 1) break;
    out += char;
  }
  return `${out.trimEnd()}…`;
}

/** Returns null when the language needs a CJK font that can't be loaded; the caller then renders the English image. */
export async function generateDocsOGImage({
  lang = DEFAULT_LANGUAGE,
  title: fullTitle,
  description: fullDescription,
  slugs,
}: {
  lang?: Language;
  title: string;
  description?: string;
  slugs: string[];
}) {
  const section = slugs.length > 0 ? (await sectionNames(lang)).get(slugs[0]) : undefined;
  const label = getT(lang)('Help Centre', { note: 'share image label' });
  const title = truncate(fullTitle, 90);
  const description = fullDescription ? truncate(fullDescription, 170) : undefined;

  const cjkFonts = await loadCjkFonts(lang, `${label}${section ?? ''}${title}`, description ?? '');
  if (!cjkFonts) return null;
  const fontFamily = cjkFonts.length > 0 ? 'Geist, CJK' : 'Geist';

  // long titles get a smaller font so they stay within two lines
  const titleSize = visualLength(title) > 40 ? 60 : 72;
  const [regular, semiBold] = await fonts;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '64px 72px',
          backgroundColor: '#ffffff',
          borderTop: `16px solid ${brand}`,
          color: '#121212',
          fontFamily,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <img src={await logo} width={206} height={50} alt="" />
          <p style={{ margin: 0, fontSize: 28, fontWeight: 600, color: brand }}>{label}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', flexShrink: 0 }}>
          {section ? (
            <p style={{ margin: 0, marginBottom: 20, fontSize: 28, fontWeight: 600, color: brand }}>{section}</p>
          ) : null}
          <p
            style={{
              margin: 0,
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </p>
          {description ? (
            <p
              style={{
                margin: 0,
                marginTop: 24,
                fontSize: 30,
                lineHeight: 1.4,
                color: '#52525b',
              }}
            >
              {description}
            </p>
          ) : null}
        </div>

        <p style={{ margin: 0, marginTop: 40, fontSize: 24, color: '#71717a', flexShrink: 0 }}>docs.letsconnekt.com</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: semiBold, weight: 600, style: 'normal' },
        ...cjkFonts,
      ],
    },
  );
}
