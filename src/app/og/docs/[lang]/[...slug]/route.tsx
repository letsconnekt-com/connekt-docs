import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { getPageImageUrl } from '@/lib/shared';
import { isLanguage } from '@/lib/i18n';
import { generateDocsOGImage } from '@/components/og-image';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[lang]/[...slug]'>) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const page = source.getPage(slug.slice(0, -1), lang);
  if (!page) notFound();

  const image = await generateDocsOGImage({
    lang,
    title: page.data.title,
    description: page.data.description,
    slugs: page.slugs,
  });
  if (image) return image;

  // the CJK font couldn't be loaded, so share the English image rather than one with missing glyphs
  const english = source.getPage(page.slugs, 'en') ?? page;
  return (await generateDocsOGImage({
    title: english.data.title,
    description: english.data.description,
    slugs: english.slugs,
  }))!;
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}
