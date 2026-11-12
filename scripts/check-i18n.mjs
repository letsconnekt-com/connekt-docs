#!/usr/bin/env node
/**
 * Checks the Help Centre translations (`pnpm check:i18n`).
 *
 * Errors (exit 1):
 * - a translated page that doesn't compile as MDX, or whose components, links, code, headings, lists or tables differ from English
 * - a translated page whose heading ids don't match English's (anchor links would break)
 * - a translated UI string with different placeholders, a meta.<lang>.json whose page list differs from English
 * Warnings (exit 1 with --strict): untranslated or stale pages, missing UI strings, en.json missing Fumadocs UI keys.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  analyze,
  compileProblem,
  CONTENT_DIR,
  englishHeadingIds,
  frontmatterProblems,
  hashText,
  listEnglishMeta,
  listEnglishPages,
  localizedFile,
  MESSAGES_DIR,
  PAGES_CACHE_PATH,
  readJson,
  ROOT,
  splitFrontmatter,
  structureProblems,
  TARGET_LANGUAGES,
  validateString,
} from "./i18n/shared.mjs";

const strict = process.argv.includes("--strict");
const errors = [];
const warnings = [];

const en = readJson(path.join(MESSAGES_DIR, "en.json"), {});
const pagesCache = readJson(PAGES_CACHE_PATH, {});
const pages = listEnglishPages();
const metas = listEnglishMeta();

// en.json must list every Fumadocs UI key, so new UI strings get translated after an upgrade
try {
  const uiRequire = createRequire(path.join(ROOT, "node_modules", "fumadocs-ui", "package.json"));
  const keysFile = path.join(path.dirname(uiRequire.resolve("fumadocs-ui/package.json")), "dist", ".translations", "keys.js");
  const keys = [...fs.readFileSync(keysFile, "utf8").matchAll(/"((?:[^"\\]|\\.)+)"/g)].map((m) => JSON.parse(`"${m[1]}"`)).filter((key) => key !== "displayName");
  const missing = keys.filter((key) => !(key in en));
  if (missing.length) warnings.push(`messages/en.json is missing ${missing.length} Fumadocs UI key(s): ${missing.slice(0, 5).join(" | ")}`);
} catch {
  warnings.push("could not read Fumadocs UI's translation keys to compare with messages/en.json");
}

for (const lang of TARGET_LANGUAGES) {
  // UI strings
  const catalog = readJson(path.join(MESSAGES_DIR, `${lang}.json`), {});
  const missing = Object.keys(en).filter((key) => !(key in catalog));
  if (missing.length) warnings.push(`${lang}: ${missing.length}/${Object.keys(en).length} UI strings untranslated`);
  for (const [key, value] of Object.entries(catalog)) {
    if (!(key in en)) errors.push(`${lang}: messages/${lang}.json has a key that isn't in en.json: ${key}`);
    else {
      const problem = validateString(en[key], value);
      if (problem) errors.push(`${lang}: messages/${lang}.json "${key}": ${problem}`);
    }
  }

  // sidebar labels
  let metaMissing = 0;
  for (const rel of metas) {
    const file = path.join(CONTENT_DIR, localizedFile(rel, lang));
    if (!fs.existsSync(file)) {
      metaMissing += 1;
      continue;
    }
    const english = readJson(path.join(CONTENT_DIR, rel));
    const translated = readJson(file);
    const shape = (pagesList = []) => pagesList.map((item) => (/^---.+---$/.test(item) ? "---" : item.replace(/^\[[^\]]+\]/, "[]")));
    if (JSON.stringify(shape(english.pages)) !== JSON.stringify(shape(translated.pages))) errors.push(`${lang}: ${localizedFile(rel, lang)} lists different pages than ${rel}; rerun pnpm translate`);
  }
  if (metaMissing) warnings.push(`${lang}: ${metaMissing}/${metas.length} sidebar files (meta.${lang}.json) missing`);

  // pages
  let untranslated = 0;
  const stale = [];
  for (const rel of pages) {
    const file = path.join(CONTENT_DIR, localizedFile(rel, lang));
    if (!fs.existsSync(file)) {
      untranslated += 1;
      continue;
    }
    const englishSource = fs.readFileSync(path.join(CONTENT_DIR, rel), "utf8");
    const english = splitFrontmatter(englishSource);
    const translated = splitFrontmatter(fs.readFileSync(file, "utf8"));
    const name = localizedFile(rel, lang);
    for (const problem of frontmatterProblems(english.data, translated.data)) errors.push(`${lang}: ${name}: ${problem}`);
    const compileError = await compileProblem(translated.body);
    if (compileError) {
      errors.push(`${lang}: ${name}: ${compileError}`);
      continue;
    }
    for (const problem of structureProblems(english.body, translated.body, lang)) errors.push(`${lang}: ${name}: ${problem}`);
    const expected = englishHeadingIds(english.body);
    const actual = analyze(translated.body, lang).headingIds;
    if (expected.length === actual.length && expected.some((id, i) => id !== actual[i])) errors.push(`${lang}: ${name}: heading ids differ from English (${expected.join(", ")})`);
    if (pagesCache[lang]?.[rel]?.source !== hashText(englishSource)) stale.push(rel);
  }
  if (untranslated) warnings.push(`${lang}: ${untranslated}/${pages.length} pages untranslated (shown in English)`);
  if (stale.length) warnings.push(`${lang}: ${stale.length} page(s) translated from an older English version: ${stale.slice(0, 5).join(", ")}${stale.length > 5 ? ", ..." : ""}`);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
if (errors.length || (strict && warnings.length)) process.exitCode = 1;
