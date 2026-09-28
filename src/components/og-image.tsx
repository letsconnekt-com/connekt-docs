import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import rootMeta from '../../content/docs/meta.json';

const brand = '#007aff';

// sidebar group label for each content folder, from the `---Label---` / `...folder` pairs in the root meta.json
const sectionNames = new Map<string, string>();
rootMeta.pages.forEach((item, i) => {
  const next = rootMeta.pages[i + 1];
  const label = /^---(.+)---$/.exec(item)?.[1];
  if (label && next?.startsWith('...')) sectionNames.set(next.slice(3), label);
});

const logo = readFile(join(process.cwd(), 'public/logo.svg')).then(
  (svg) => `data:image/svg+xml;base64,${svg.toString('base64')}`,
);

// Geist, the Connekt app font (Satori only bundles a regular-weight fallback)
const fonts = Promise.all(
  (['Regular', 'SemiBold'] as const).map((weight) => readFile(join(process.cwd(), `src/assets/fonts/Geist-${weight}.ttf`))),
);

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateDocsOGImage({
  title,
  description,
  slugs,
}: {
  title: string;
  description?: string;
  slugs: string[];
}) {
  const section = slugs.length > 0 ? sectionNames.get(slugs[0]) : undefined;
  // long titles get a smaller font so they stay within two lines
  const titleSize = title.length > 40 ? 60 : 72;
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
          fontFamily: 'Geist',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <img src={await logo} width={206} height={50} alt="" />
          <p style={{ margin: 0, fontSize: 28, fontWeight: 600, color: brand }}>Help Centre</p>
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
            {truncate(title, 90)}
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
              {truncate(description, 170)}
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
      ],
    },
  );
}
