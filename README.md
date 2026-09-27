# Connekt Help Centre

The Connekt documentation site, built with [Fumadocs](https://fumadocs.dev) and Next.js.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Project structure

| Path                           | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| `content/docs/`                | MDX pages, served from the site root                              |
| `content/docs/meta.json`       | Sidebar groups and order (each folder also has its own `meta.json`) |
| `src/components/mdx.tsx`       | MDX components (Steps, Cards, Callouts, Tabs, Accordions)        |
| `src/components/fa-icons.tsx`  | Font Awesome → Lucide icon mapping for `<Card icon="…">`          |
| `src/lib/source.ts`            | Content source and sidebar configuration                          |
| `src/app/(docs)/`              | Docs layout and page route                                        |
| `src/app/api/chat/route.ts`    | "Ask AI" chat, requires `OPENROUTER_API_KEY`                      |
| `src/app/llms.txt`, `llms-full.txt` | Machine-readable docs for LLMs                              |

## Adding a page

1. Create `content/docs/<section>/<slug>.mdx` with `title`, `description` and optionally `sidebarTitle` frontmatter.
2. Add the slug to `content/docs/<section>/meta.json` in the position it should appear.
