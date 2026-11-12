export const appName = "Connekt Help Centre";
export const docsRoute = "/";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// These routes live outside `app/[lang]`, so the language is always a path segment (`/og/docs/en/...`), English included.

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return { segments, url: `${docsContentRoute}/${page.locale ?? "en"}/${segments.join("/")}` };
}

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "image.png"];

  return { segments, url: `${docsImageRoute}/${page.locale ?? "en"}/${segments.join("/")}` };
}
