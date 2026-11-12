import { llms } from "fumadocs-core/source";
import { getMDXComponents } from "@/components/mdx";
import { source } from "./source";
import { isLanguage } from "./i18n";

// kept out of `source.ts`, which is evaluated at build time and shouldn't import UI components
export const docsLlms = llms(source, {
  renderPage: async (page) => {
    const components = getMDXComponents(undefined, isLanguage(page.locale) ? page.locale : undefined);

    return `# ${page.data.title} (${page.url})

${page.data.description ? `> ${page.data.description}\n\n` : ""}${await page.data.getText("processed", { components })}`;
  },
});
