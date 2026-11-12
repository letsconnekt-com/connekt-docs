import { source } from "@/lib/source";
import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { appName, getPageImageUrl, getPageMarkdownUrl } from "@/lib/shared";
import { isLanguage, LANGUAGE_META, LANGUAGES, type Language } from "@/lib/i18n";
import { isTranslated } from "@/lib/source-i18n";
import { getT } from "@/lib/translations";

export default async function Page(props: PageProps<"/[lang]/[[...slug]]">) {
  const params = await props.params;
  if (!isLanguage(params.lang)) notFound();
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents(
            {
              a: createRelativeLink(source, page),
            },
            params.lang,
          )}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams("slug", "lang");
}

export async function generateMetadata(props: PageProps<"/[lang]/[[...slug]]">): Promise<Metadata> {
  const params = await props.params;
  if (!isLanguage(params.lang)) notFound();
  const lang: Language = params.lang;
  const page = source.getPage(params.slug, lang);
  if (!page) notFound();

  const siteName = getT(lang)(appName, { note: "site name" });
  const image = { url: getPageImageUrl(page).url, width: 1200, height: 630, alt: page.data.title };
  const englishUrl = `/${page.slugs.join("/")}`;

  // hreflang only lists languages with a real translation; an untranslated page (shown in English) points search engines at the English URL
  const languages: Record<string, string> = {};
  if (isTranslated(page, lang)) {
    for (const l of LANGUAGES) {
      const localized = source.getPage(page.slugs, l);
      if (!localized || !isTranslated(localized, l)) continue;
      const { hreflang, extraHreflang = [] } = LANGUAGE_META[l];
      for (const tag of [hreflang, ...extraHreflang]) languages[tag] = localized.url;
    }
    languages["x-default"] = englishUrl;
  }

  return {
    title: page.data.title.startsWith(siteName) ? { absolute: page.data.title } : page.data.title,
    description: page.data.description,
    alternates: {
      canonical: isTranslated(page, lang) ? page.url : englishUrl,
      languages,
    },
    openGraph: {
      type: "article",
      siteName,
      locale: LANGUAGE_META[lang].ogLocale,
      url: page.url,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      images: image,
    },
  };
}
