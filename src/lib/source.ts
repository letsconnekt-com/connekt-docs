import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docsRoute } from "./shared";
import { i18n } from "./i18n";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import remarkCjkFriendly from "remark-cjk-friendly/parseOnly";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { z } from "zod";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema.extend({
      // shorter label shown in the sidebar, carried over from Mintlify
      sidebarTitle: z.string().optional(),
    }),
    // Fumadocs' default plugins, plus CJK-friendly emphasis: CommonMark doesn't render `の**⋯**メニュー` as bold
    // (a `**` between a CJK character and punctuation), which is common in the translated pages
    mdxOptions: applyMdxPreset({ remarkPlugins: (plugins) => [remarkCjkFriendly, ...plugins] }),
    postprocess: {
      includeProcessedMarkdown: {
        // render MDX components through their `asMarkdown()` form, see `src/lib/llms.ts`
        output: "function",
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
  i18n,
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: ({ typedPlugin }) => [
    lucideIconsPlugin(),
    typedPlugin({
      name: "sidebar-title",
      transformPageTree: {
        file(node, filePath) {
          // link items from meta.json have no file path
          if (!filePath) return node;
          const file = this.storage.read(filePath);
          if (file?.format === "page" && file.data.sidebarTitle) node.name = file.data.sidebarTitle;
          return node;
        },
      },
    }),
  ],
});
