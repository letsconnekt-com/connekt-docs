/**
 * Helpers shared by `pnpm translate` and `pnpm check:i18n`: paths, catalogs, MDX structure checks, stable heading anchors,
 * link localization and UI-label hints from the product app's catalogs.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkCjkFriendly from "remark-cjk-friendly/parseOnly";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import YAML from "yaml";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const CONTENT_DIR = path.join(ROOT, "content", "docs");
export const MESSAGES_DIR = path.join(ROOT, "messages");
export const STRINGS_CACHE_PATH = path.join(MESSAGES_DIR, ".translation-cache.json");
export const PAGES_CACHE_PATH = path.join(ROOT, "content", ".translation-cache.json");
export const OVERRIDES_DIR = path.join(MESSAGES_DIR, "overrides");

/** Keep in sync with `LANGUAGES` in src/lib/i18n.ts. */
export const TARGET_LANGUAGES = [
  "ja",
  // disabled languages:
  // "zh",
  // "zh-hk",
  // "ko",
];

/** The product app (and marketing site) call Hong Kong Chinese `zh-TW`. */
export const APP_LOCALE = { zh: "zh", "zh-hk": "zh-TW", ja: "ja", ko: "ko" };

/** Frontmatter values that are translated; every other key must stay as in English. */
export const TRANSLATED_FRONTMATTER = ["title", "description", "sidebarTitle"];

/** The marketing site, which has the same language prefixes as the Help Centre. */
const SITE_HOSTS = ["https://www.letsconnekt.com", "https://letsconnekt.com"];

export function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function readApiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  for (const name of [".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, "utf8").match(/^\s*OPENROUTER_API_KEY\s*=\s*(.*)\s*$/m);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

// ---------------------------------------------------------------------------------------------------------------------
// Content files

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** `foo.ja.mdx` → "ja", `foo.mdx` → null. */
function fileLanguage(file) {
  const parts = path.basename(file).split(".");
  return parts.length >= 3 && [...TARGET_LANGUAGES, "en"].includes(parts.at(-2)) ? parts.at(-2) : null;
}

/** English pages, relative to content/docs (`billing/plans-compared.mdx`). */
export function listEnglishPages() {
  return walk(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx") && fileLanguage(file) === null)
    .map((file) => path.relative(CONTENT_DIR, file))
    .sort();
}

/** English meta files, relative to content/docs (`meta.json`, `billing/meta.json`). */
export function listEnglishMeta() {
  return walk(CONTENT_DIR)
    .filter((file) => path.basename(file) === "meta.json")
    .map((file) => path.relative(CONTENT_DIR, file))
    .sort();
}

/** `billing/plans-compared.mdx` → `billing/plans-compared.ja.mdx` (Fumadocs' `dot` parser). */
export function localizedFile(rel, lang) {
  return rel.replace(/\.(mdx|json)$/, `.${lang}.$1`);
}

// ---------------------------------------------------------------------------------------------------------------------
// UI strings (messages/*.json) and sidebar labels (meta.json)

const PLACEHOLDER = /\{([^{}]+)\}/g;

/** A translated string must keep English's placeholders. Returns a problem or null. */
export function validateString(source, translated) {
  if (typeof translated !== "string" || !translated.trim()) return "empty";
  const names = (text) => [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).sort().join(",");
  if (names(source) !== names(translated)) return `placeholders ${names(source) || "none"} → ${names(translated) || "none"}`;
  return null;
}

const SEPARATOR = /^---(.+)---$/;
const LINK_ITEM = /^\[([^\]]+)\]\((.+)\)$/;

/** Translatable strings of a meta file: [{ key, text }]. */
export function metaStrings(rel, meta) {
  const out = [];
  if (meta.title) out.push({ key: `meta:${rel}#title`, text: meta.title });
  if (meta.description) out.push({ key: `meta:${rel}#description`, text: meta.description });
  for (const item of meta.pages ?? []) {
    const label = SEPARATOR.exec(item)?.[1] ?? LINK_ITEM.exec(item)?.[1];
    if (label) out.push({ key: `meta:${rel}#${item}`, text: label });
  }
  return out;
}

/** The English meta file with every label replaced by `pick(key, english)`. */
export function localizeMeta(rel, meta, pick) {
  const out = { ...meta };
  if (meta.title) out.title = pick(`meta:${rel}#title`, meta.title);
  if (meta.description) out.description = pick(`meta:${rel}#description`, meta.description);
  if (meta.pages) {
    out.pages = meta.pages.map((item) => {
      const separator = SEPARATOR.exec(item);
      if (separator) return `---${pick(`meta:${rel}#${item}`, separator[1])}---`;
      const link = LINK_ITEM.exec(item);
      if (link) return `[${pick(`meta:${rel}#${item}`, link[1])}](${link[2]})`;
      return item;
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// MDX

// same emphasis rules as the site (src/lib/source.ts), so bold next to CJK punctuation counts
const processor = remark().use(remarkMdx).use(remarkGfm).use(remarkCjkFriendly);

/** Splits `---\nyaml\n---\nbody`. */
export function splitFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: null, raw: "", body: source };
  let data = null;
  try {
    data = YAML.parse(match[1]);
  } catch {
    data = null;
  }
  return { data, raw: match[0], body: source.slice(match[0].length) };
}

/** Checks that the body compiles as MDX. Returns a problem or null. */
export async function compileProblem(body) {
  try {
    await compile(body, { remarkPlugins: [remarkGfm, remarkCjkFriendly] });
    return null;
  } catch (error) {
    const place = error?.place?.line ?? error?.line;
    return `MDX does not compile${place ? ` (line ${place})` : ""}: ${String(error?.reason ?? error?.message ?? error).slice(0, 160)}`;
  }
}

function attributeValue(attribute) {
  if (attribute.type === "mdxJsxExpressionAttribute") return `{...${attribute.value}}`;
  if (attribute.value === null || attribute.value === undefined) return "true";
  if (typeof attribute.value === "string") return JSON.stringify(attribute.value);
  return `{${attribute.value.value}}`;
}

/** `/ja/billing/x` → `/billing/x`, `https://www.letsconnekt.com/ja/pricing` → `https://www.letsconnekt.com/pricing`. */
export function unlocalizeUrl(url, lang) {
  if (!lang) return url;
  if (url === `/${lang}`) return "/";
  if (url.startsWith(`/${lang}/`) || url.startsWith(`/${lang}#`)) return url.slice(lang.length + 1);
  for (const host of SITE_HOSTS) {
    if (url.startsWith(`${host}/${lang}/`) || url === `${host}/${lang}`) return host + (url.slice(host.length + lang.length + 1) || "/");
  }
  return url;
}

/** The URL a translated page links to: docs pages and marketing-site pages in the same language, anything else unchanged. */
export function localizeUrl(url, lang) {
  if (url.startsWith("/") && !url.startsWith("//")) return url === "/" ? `/${lang}` : `/${lang}${url}`;
  for (const host of SITE_HOSTS) {
    if (url === host || url === `${host}/`) return `${host}/${lang}`;
    if (url.startsWith(`${host}/`)) return `${host}/${lang}${url.slice(host.length)}`;
  }
  return url;
}

const HEADING_ID = /\s*\[#([^\]]+?)]\s*$/;

/**
 * Structural fingerprint of an MDX body: everything that must survive translation unchanged.
 * `lang` undoes link localization, so a final translated file can be compared with English.
 */
export function analyze(body, lang) {
  const tree = processor.parse(body);
  const out = { jsx: [], links: [], code: [], expressions: [], headings: [], headingIds: [], lists: [], tables: [], strong: [] };
  visit(tree, (node) => {
    switch (node.type) {
      case "mdxJsxFlowElement":
      case "mdxJsxTextElement": {
        const attrs = (node.attributes ?? [])
          .filter((a) => a.type !== "mdxJsxAttribute" || a.name !== "title")
          .map((a) => (a.name === "href" && typeof a.value === "string" ? `href=${JSON.stringify(unlocalizeUrl(a.value, lang))}` : `${a.name ?? ""}=${attributeValue(a)}`))
          .sort();
        const hasTitle = (node.attributes ?? []).some((a) => a.name === "title");
        out.jsx.push(`${node.name ?? "<>"}(${attrs.join(" ")}${hasTitle ? " title" : ""})`);
        break;
      }
      case "link":
      case "definition":
        out.links.push(unlocalizeUrl(node.url, lang));
        break;
      case "inlineCode":
        out.code.push(`\`${node.value}\``);
        break;
      case "code":
        out.code.push(`\`\`\`${node.lang ?? ""}\n${node.value}`);
        break;
      case "mdxFlowExpression":
      case "mdxTextExpression":
      case "mdxjsEsm":
        out.expressions.push(node.value);
        break;
      case "heading": {
        out.headings.push(node.depth);
        const last = node.children.at(-1);
        const id = last?.type === "text" ? HEADING_ID.exec(last.value)?.[1] : undefined;
        out.headingIds.push(id ?? null);
        break;
      }
      case "list":
        out.lists.push(node.children.length);
        break;
      case "table":
        out.tables.push(`${node.children.length}x${node.children[0]?.children.length ?? 0}`);
        break;
      case "strong":
        out.strong.push(toString(node));
        break;
    }
  });
  return out;
}

function sameList(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function sameMultiset(a, b) {
  return sameList([...a].sort(), [...b].sort());
}

/** Structural differences between an English body and its translation. */
export function structureProblems(enBody, trBody, lang) {
  const en = analyze(enBody);
  const tr = analyze(trBody, lang);
  const problems = [];
  if (!sameList(en.jsx, tr.jsx)) problems.push(`components differ (English ${en.jsx.length}, translation ${tr.jsx.length}); first difference: ${firstDifference(en.jsx, tr.jsx)}`);
  if (!sameMultiset(en.links, tr.links)) problems.push(`links differ: ${firstDifference([...en.links].sort(), [...tr.links].sort())}`);
  if (!sameMultiset(en.code, tr.code)) problems.push(`code differs: ${firstDifference([...en.code].sort(), [...tr.code].sort())}`);
  if (!sameList(en.expressions, tr.expressions)) problems.push("MDX expressions or comments differ");
  if (!sameList(en.headings, tr.headings)) problems.push(`headings differ (English ${en.headings.join(",")}; translation ${tr.headings.join(",")})`);
  if (!sameList(en.lists, tr.lists)) problems.push(`lists differ (items per list: English ${en.lists.join(",")}; translation ${tr.lists.join(",")})`);
  if (en.strong.length !== tr.strong.length) {
    const touching = /\*\*\*\*/.test(trBody) ? "; two bold spans touch (****): put a space or a word between them" : "";
    problems.push(`bold text differs (English ${en.strong.length} bold spans, translation ${tr.strong.length}); keep every **bold** span and its ** markers${touching}`);
  }
  if (!sameList(en.tables, tr.tables)) problems.push(`tables differ (English ${en.tables.join(",")}; translation ${tr.tables.join(",")})`);
  return problems;
}

function firstDifference(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) return `English ${JSON.stringify(a[i] ?? "(nothing)").slice(0, 120)} vs translation ${JSON.stringify(b[i] ?? "(nothing)").slice(0, 120)}`;
  }
  return "order";
}

/** Frontmatter differences: same keys, untranslated values unchanged, translated values non-empty. */
export function frontmatterProblems(enData, trData) {
  if (!trData || typeof trData !== "object") return ["frontmatter missing or not valid YAML"];
  const problems = [];
  const enKeys = Object.keys(enData ?? {}).sort();
  const trKeys = Object.keys(trData).sort();
  if (!sameList(enKeys, trKeys)) problems.push(`frontmatter keys differ (${enKeys.join(",")} vs ${trKeys.join(",")})`);
  for (const key of enKeys) {
    if (TRANSLATED_FRONTMATTER.includes(key)) {
      if (typeof trData[key] !== "string" || !trData[key].trim()) problems.push(`frontmatter ${key} is empty`);
    } else if (JSON.stringify(enData[key]) !== JSON.stringify(trData[key])) {
      problems.push(`frontmatter ${key} must stay unchanged`);
    }
  }
  return problems;
}

/**
 * Heading ids of the English page, computed like Fumadocs' remark-heading (github-slugger over the heading text, or an
 * explicit `[#id]`). Translations reuse them, so `#anchor` links and shared URLs work in every language.
 */
export function englishHeadingIds(enBody) {
  const slugger = new GithubSlugger();
  const ids = [];
  visit(processor.parse(enBody), "heading", (heading) => {
    const last = heading.children.at(-1);
    const custom = last?.type === "text" ? HEADING_ID.exec(last.value)?.[1] : undefined;
    ids.push(custom ?? slugger.slug(toString(heading)));
    return "skip";
  });
  return ids;
}

/** Appends ` [#id]` to each heading of a translated body, in order. Headings must match English (checked beforehand). */
export function addHeadingIds(trBody, ids) {
  const inserts = [];
  let index = 0;
  visit(processor.parse(trBody), "heading", (heading) => {
    const id = ids[index];
    index += 1;
    const last = heading.children.at(-1);
    if (!id || !last?.position) return "skip";
    if (last.type === "text" && HEADING_ID.test(last.value)) return "skip";
    inserts.push({ offset: last.position.end.offset, text: ` [#${id}]` });
    return "skip";
  });
  return applyEdits(trBody, inserts.map(({ offset, text }) => ({ start: offset, end: offset, text })));
}

/** Points internal and marketing-site links of a translated body at the same language. */
export function localizeLinks(body, lang) {
  const edits = [];
  visit(processor.parse(body), (node) => {
    if ((node.type === "link" || node.type === "definition") && node.position) {
      const next = localizeUrl(node.url, lang);
      if (next === node.url) return;
      const slice = body.slice(node.position.start.offset, node.position.end.offset);
      const at = node.type === "link" ? slice.lastIndexOf(`(${node.url}`) + 1 : slice.lastIndexOf(node.url);
      if (at <= 0) return;
      const start = node.position.start.offset + at;
      edits.push({ start, end: start + node.url.length, text: next });
    }
    if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.position) {
      const href = node.attributes?.find((a) => a.type === "mdxJsxAttribute" && a.name === "href" && typeof a.value === "string");
      if (!href) return;
      const next = localizeUrl(href.value, lang);
      if (next === href.value) return;
      const at = body.indexOf(`href="${href.value}"`, node.position.start.offset);
      if (at < 0) return;
      const start = at + 'href="'.length;
      edits.push({ start, end: start + href.value.length, text: next });
    }
  });
  return applyEdits(body, edits);
}

function applyEdits(text, edits) {
  let out = text;
  for (const { start, end, text: replacement } of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, start) + replacement + out.slice(end);
  return out;
}

/** Bold text of a page, split into menu-path steps: the candidates for UI-label hints. */
export function boldLabels(body) {
  const labels = new Set();
  for (const text of analyze(body).strong) {
    const clean = text.trim();
    labels.add(clean);
    for (const part of clean.split(/\s*(?:→|›|>)\s*/)) if (part) labels.add(part.trim());
  }
  return [...labels];
}

// ---------------------------------------------------------------------------------------------------------------------
// UI-label hints from the product app

/** Where the product app's catalogs live; override with CONNEKT_APP_MESSAGES_DIR. */
export const APP_MESSAGES_DIR = process.env.CONNEKT_APP_MESSAGES_DIR ?? path.resolve(ROOT, "..", "connekt", "frontend", "messages");

/**
 * English UI text → the app's rendering in `lang` (the most common one when a label has several), or null when the app's
 * catalogs aren't available. Only short labels count (sentences are not UI labels).
 */
export function loadAppLabels(lang) {
  const enFile = path.join(APP_MESSAGES_DIR, "en.json");
  const trFile = path.join(APP_MESSAGES_DIR, `${APP_LOCALE[lang]}.json`);
  if (!fs.existsSync(enFile) || !fs.existsSync(trFile)) return null;
  const pairs = [];
  const walkPair = (en, tr) => {
    if (typeof en === "string") {
      if (typeof tr === "string" && en.length <= 60 && !en.includes("{")) pairs.push([en.trim(), tr.trim()]);
      return;
    }
    if (en && typeof en === "object" && tr && typeof tr === "object") for (const key of Object.keys(en)) walkPair(en[key], tr[key]);
  };
  walkPair(readJson(enFile), readJson(trFile));
  const counts = new Map();
  for (const [en, tr] of pairs) {
    if (!counts.has(en)) counts.set(en, new Map());
    counts.get(en).set(tr, (counts.get(en).get(tr) ?? 0) + 1);
  }
  const best = new Map();
  for (const [en, options] of counts) best.set(en, [...options].sort((a, b) => b[1] - a[1])[0][0]);
  return best;
}

/** [english, translation] pairs for the labels that the app has, capped so prompts stay small. */
export function labelHints(appLabels, texts, limit = 150) {
  if (!appLabels) return [];
  const out = [];
  const seen = new Set();
  for (const text of texts) {
    for (const candidate of [text, text.replace(/[.:]+$/, "")]) {
      if (seen.has(candidate) || !appLabels.has(candidate)) continue;
      seen.add(candidate);
      out.push([candidate, appLabels.get(candidate)]);
    }
    if (out.length >= limit) break;
  }
  return out;
}
