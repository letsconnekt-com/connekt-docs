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

Match the labels in the Connekt app exactly:

| Use | Not |
|---|---|
| **Deals** (the pipeline page) | Pipeline |
| **Sign** (web) / **eSign** (mobile) | Documents |
| **Projects** | Lists, Talent Pools |
| **Share with Company** | Share with Client |
| **Add …** (Add Candidate, Add Job) | Create … |
| **Settings → Integrations** | Settings → Communication |
| **Settings → Plan** / **Settings → Usage** | Billing |
| **Settings → Data Import/Export** | Data Import |
| **Meetings** / **Meeting Notes**, **Connekt Notetaker**, **Stealth**, **Meeting Bot** | Meeting Intelligence (except as the overview page) |

## Style preferences

{/* Add any project-specific style rules below */}

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

- Verify every label, path, limit and rule against the product code before documenting it. Don't invent features.
- Plans: document **Pro, Team and Business** only. Never mention Enterprise.
- Don't state prices. Explain the per-seat model and link to https://www.letsconnekt.com/pricing
- Free trial: 14 days, one seat (the person who signed up). Inviting teammates requires subscribing with a seat per person.
- Mobile: iOS is live on the App Store; Android is coming soon.
- Removed features, don't document: the Business Development pipeline, LinkedIn message sync, Talent Pools.
- Email integration: synced emails stay in Connekt after an account is disconnected. Outlook can connect but can't send.
- Outreach (email sequences) requires the Team plan.
- Support: only `getting-started/getting-help.mdx` lists contact details (in-app chat and support@letsconnekt.com). Other pages link to it.
- Pages about recording meetings (web Notetaker and mobile) must include the recording-consent warning.
- Security claims: only what the marketing site states (2FA, role permissions, audit log, screenshot blocking on mobile, encryption in transit and at rest, daily backups). No SOC 2, GDPR or ISO claims.
- Don't document staff-only admin tools, internal organisation-only fields, env vars or developer internals.
