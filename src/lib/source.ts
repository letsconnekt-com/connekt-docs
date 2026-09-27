import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      // shorter label shown in the sidebar, carried over from Mintlify
      sidebarTitle: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: {
        // render MDX components through their `asMarkdown()` form, see `src/lib/llms.ts`
        output: 'function',
        // `## Title [#id]` markers confuse models into writing `[#id]`-style citations
        headingIds: false,
      },
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: ({ typedPlugin }) => [
    lucideIconsPlugin(),
    typedPlugin({
      name: 'sidebar-title',
      transformPageTree: {
        file(node, filePath) {
          // link items from meta.json have no file path
          if (!filePath) return node;
          const file = this.storage.read(filePath);
          if (file?.format === 'page' && file.data.sidebarTitle) node.name = file.data.sidebarTitle;
          return node;
        },
      },
    }),
  ],
});
