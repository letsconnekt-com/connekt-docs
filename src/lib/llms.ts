import { llms } from 'fumadocs-core/source';
import { getMDXComponents } from '@/components/mdx';
import { source } from './source';

// kept out of `source.ts`, which is evaluated at build time and shouldn't import UI components
export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${page.data.description ? `> ${page.data.description}\n\n` : ''}${await page.data.getText('processed', { components: getMDXComponents() })}`,
});
