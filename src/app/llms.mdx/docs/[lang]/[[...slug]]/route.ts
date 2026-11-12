import { docsLlms } from '@/lib/llms';
import { source } from '@/lib/source';
import { getPageMarkdownUrl } from '@/lib/shared';
import { isLanguage } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/docs/[lang]/[[...slug]]'>) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  // remove the appended "content.md", `/index.md` is rewritten to the root page
  const slugs = slug?.slice(0, -1) ?? [];
  if (slugs.at(-1) === 'index') slugs.pop();
  const page = source.getPage(slugs, lang);
  if (!page) notFound();

  return new Response(await docsLlms.page(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageMarkdownUrl(page).segments,
  }));
}
