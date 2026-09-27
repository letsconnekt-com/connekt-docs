# Documentation project instructions

## About this project

- This is a documentation site built on [Fumadocs](https://fumadocs.dev) (Next.js App Router)
- Pages are MDX files with YAML frontmatter in `content/docs/`, served from the site root (`content/docs/billing/plans-compared.mdx` → `/billing/plans-compared`)
- Sidebar order and groups live in `meta.json` files: the root `content/docs/meta.json` defines the group separators, each folder's `meta.json` orders its pages
- Frontmatter supports `title`, `description`, and `sidebarTitle` (shorter sidebar label)
- Mintlify-style components (`<Steps>`, `<Step title>`, `<Card icon>`, `<CardGroup cols>`, `<AccordionGroup>`, `<Accordion title>`, `<Tabs>`, `<Tab title>`, `<Note>`, `<Tip>`, `<Info>`, `<Warning>`) are mapped to Fumadocs UI in `src/components/mdx.tsx`
- Card `icon` values are Font Awesome names, mapped to Lucide icons in `src/components/fa-icons.tsx` — add new names there
- Fumadocs reference for AI tools: https://www.fumadocs.dev/llms.txt
- Run `pnpm dev` to preview locally, `pnpm build` to verify

## Terminology

{/* Add product-specific terms and preferred usage */}
{/* Example: Use "workspace" not "project", "member" not "user" */}

## Style preferences

{/* Add any project-specific style rules below */}

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

{/* Define what should and shouldn't be documented */}
{/* Example: Don't document internal admin features */}
