import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { DEFAULT_LANGUAGE, splitLanguagePath } from '@/lib/i18n';
import { docsContentRoute } from '@/lib/shared';

/**
 * Language routing, the same scheme as the marketing site: English is unprefixed (`/billing/x` is served by `app/[lang]` with
 * `lang = en`), other languages use their code as a prefix (`/ja`), and `/en/...` redirects to the unprefixed URL.
 * No Accept-Language or cookie detection and no cookies set, so pages stay cacheable and crawlable.
 *
 * Markdown: `/ja/billing/x.md`, or any docs URL requested with `Accept: text/markdown`, is served from the Markdown route.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { lang, path, prefixed } = splitLanguagePath(pathname);

  if (prefixed && lang === DEFAULT_LANGUAGE) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url, 308);
  }

  // `/billing/x.md` → `/llms.mdx/docs/en/billing/x/content.md`
  if (path.endsWith('.md')) {
    return NextResponse.rewrite(new URL(markdownPath(lang, path.slice(0, -'.md'.length)), request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    return NextResponse.rewrite(new URL(markdownPath(lang, path), request.nextUrl), {
      // this URL has two representations, selected by `Accept`
      headers: { Vary: 'Accept' },
    });
  }

  if (!prefixed) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LANGUAGE}${path === '/' ? '' : path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function markdownPath(lang: string, path: string) {
  const slugs = path.split('/').filter(Boolean);
  return `${docsContentRoute}/${lang}/${[...slugs, 'content.md'].join('/')}`;
}

export const config = {
  // skip internals, API/OG/llms routes and static files (except `.md`)
  matcher: [
    '/((?!_next/|api/|og/|llms\\.mdx/|llms\\.txt$|llms-full\\.txt$|favicon\\.ico$|.*\\.(?!md$)[a-z0-9]+$).*)',
  ],
};
