#!/usr/bin/env node
/**
 * Translates the Help Centre into the languages in TARGET_LANGUAGES (scripts/i18n/shared.mjs) through OpenRouter (`pnpm translate`).
 * Japanese is enabled; zh, zh-hk (Hong Kong) and ko are ready but switched off for now.
 *
 * - Pages: content/docs/<path>.mdx → <path>.<lang>.mdx (Fumadocs' `dot` convention). Each page is translated whole, then
 *   checked: it must compile as MDX and keep English's components, attributes, links, code, headings, lists and tables.
 *   Failures are retried with the problems listed, then left untranslated (English fallback) and reported.
 *   Headings get English's anchor ids (`## 料金 [#pricing]`) and links point at the same language (`/ja/...`).
 * - Strings: messages/en.json (site UI) → messages/<lang>.json, and sidebar labels in meta.json → meta.<lang>.json.
 * - Incremental: content/.translation-cache.json and messages/.translation-cache.json store a hash of each English source,
 *   so reruns only send new or changed pages and strings.
 * - Manual fixes: edit a translated page directly; it's kept on reruns until its English source changes (then it's reported,
 *   and only replaced with --force). For strings, use messages/overrides/<lang>.json (always wins).
 * - Bold UI labels follow the product app's own translations when ../connekt/frontend/messages is available.
 *
 * Options: --locale <code> (repeatable), --page <path substring> (repeatable), --strings-only, --pages-only,
 * --dry-run (count pending work, no API calls), --force (ignore the caches and manual edits).
 * Needs OPENROUTER_API_KEY in the environment or in .env / .env.local (never printed).
 */
import fs from "node:fs";
import path from "node:path";
import { buildPagePrompt, buildStringsPrompt } from "./translation/guide.mjs";
import {
  addHeadingIds,
  boldLabels,
  compileProblem,
  CONTENT_DIR,
  englishHeadingIds,
  frontmatterProblems,
  hashText,
  labelHints,
  listEnglishMeta,
  listEnglishPages,
  loadAppLabels,
  localizedFile,
  localizeLinks,
  localizeMeta,
  MESSAGES_DIR,
  metaStrings,
  OVERRIDES_DIR,
  PAGES_CACHE_PATH,
  readApiKey,
  readJson,
  splitFrontmatter,
  STRINGS_CACHE_PATH,
  structureProblems,
  TARGET_LANGUAGES,
  validateString,
  writeJson,
} from "./i18n/shared.mjs";

/** Same model as the marketing site and the app (picked in the app's eval against a native Japanese reviewer). */
const MODELS = {
  ja: "openai/gpt-6.1-sol",
  // disabled languages:
  // zh: "openai/gpt-6.1-sol",
  // "zh-hk": "openai/gpt-6.1-sol",
  // ko: "openai/gpt-6.1-sol",
};

const STRINGS_BATCH_SIZE = 30;
/** Requests in flight per language. */
const CONCURRENCY = 4;
const MAX_HTTP_ATTEMPTS = 4;
/** Translation attempts per page before it's left in English. */
const MAX_PAGE_ATTEMPTS = 3;

function parseArgs(argv) {
  const values = (flag) => argv.flatMap((arg, i) => (arg === flag ? [argv[i + 1]] : []));
  const locales = values("--locale");
  const unknown = locales.filter((locale) => !TARGET_LANGUAGES.includes(locale));
  if (unknown.length) throw new Error(`Unknown locale(s): ${unknown.join(", ")}. Targets: ${TARGET_LANGUAGES.join(", ")}`);
  return {
    locales: locales.length ? locales : TARGET_LANGUAGES,
    pages: values("--page"),
    strings: !argv.includes("--pages-only"),
    pagesEnabled: !argv.includes("--strings-only"),
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
  };
}

/** One chat completion; returns the text, cost and finish reason. Retries HTTP and network errors. */
async function complete({ model, system, user, json, apiKey }) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_HTTP_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Connekt Help Centre translation" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          ...(json ? { response_format: { type: "json_object" } } : {}),
          temperature: 0.2,
          max_tokens: 32000,
          // Public documentation: providers that log or train on prompts are acceptable, which widens routing.
          provider: { data_collection: "allow" },
          usage: { include: true },
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      const payload = await response.json();
      const choice = payload.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string") throw new Error("no content in response");
      return { text: content, cost: Number(payload.usage?.cost ?? 0), finish: choice.finish_reason };
    } catch (error) {
      lastError = error;
      console.warn(`  ${model}: attempt ${attempt}/${MAX_HTTP_ATTEMPTS} failed: ${error instanceof Error ? error.message : error}`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw lastError;
}

async function pool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await worker(item);
    }),
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Strings: site UI and sidebar labels

function englishStrings() {
  const ui = Object.entries(readJson(path.join(MESSAGES_DIR, "en.json"), {})).map(([key, text]) => ({ key, text }));
  const meta = listEnglishMeta().flatMap((rel) => metaStrings(rel, readJson(path.join(CONTENT_DIR, rel))));
  return [...ui, ...meta];
}

function extractJson(content) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1));
}

async function translateStrings(lang, strings, cache, appLabels, { dryRun, force, apiKey }) {
  const localeCache = (cache[lang] ??= {});
  const overrides = readJson(path.join(OVERRIDES_DIR, `${lang}.json`), {});
  const pending = strings.filter(({ key, text }) => !(key in overrides) && (force || localeCache[key]?.hash !== hashText(text)));
  console.log(`${lang}: ${pending.length} strings to translate (${Object.keys(overrides).length} overrides)`);
  const stats = { cost: 0, failed: [] };
  if (dryRun || pending.length === 0) return stats;

  const system = buildStringsPrompt(lang, labelHints(appLabels, pending.map(({ text }) => text)));
  const batches = [];
  for (let i = 0; i < pending.length; i += STRINGS_BATCH_SIZE) batches.push(pending.slice(i, i + STRINGS_BATCH_SIZE));
  await pool(batches, async (batch) => {
    let todo = batch;
    for (let attempt = 1; attempt <= 3 && todo.length; attempt += 1) {
      const user = JSON.stringify(todo.map((item, index) => ({ id: String(index + 1), key: item.key, text: item.text })));
      const result = await complete({ model: MODELS[lang], system, user, json: true, apiKey });
      stats.cost += result.cost;
      let map = {};
      try {
        const parsed = extractJson(result.text);
        map = parsed.translations ?? parsed;
      } catch {
        map = {};
      }
      const retry = [];
      todo.forEach((item, index) => {
        const text = map[String(index + 1)];
        const problem = validateString(item.text, text);
        if (problem) {
          if (attempt === 3) stats.failed.push(`${item.key} (${problem})`);
          retry.push(item);
        } else {
          localeCache[item.key] = { hash: hashText(item.text), text: text.trim() };
        }
      });
      todo = retry;
    }
    writeJson(STRINGS_CACHE_PATH, cache);
  });
  return stats;
}

/** Writes messages/<lang>.json and meta.<lang>.json from overrides and up-to-date cached translations. */
function writeStrings(lang, strings, cache) {
  const overrides = readJson(path.join(OVERRIDES_DIR, `${lang}.json`), {});
  const english = new Map(strings.map(({ key, text }) => [key, text]));
  const pick = (key, fallback) => {
    if (key in overrides) return overrides[key];
    const cached = cache[lang]?.[key];
    return cached && english.has(key) && cached.hash === hashText(english.get(key)) ? cached.text : fallback;
  };

  const en = readJson(path.join(MESSAGES_DIR, "en.json"), {});
  const catalog = {};
  for (const key of Object.keys(en)) {
    const value = pick(key, null);
    if (value !== null) catalog[key] = value;
  }
  writeJson(path.join(MESSAGES_DIR, `${lang}.json`), catalog);

  for (const rel of listEnglishMeta()) writeJson(path.join(CONTENT_DIR, localizedFile(rel, lang)), localizeMeta(rel, readJson(path.join(CONTENT_DIR, rel)), pick));
  return { ui: Object.keys(catalog).length, uiTotal: Object.keys(en).length };
}

// ---------------------------------------------------------------------------------------------------------------------
// Pages

function stripFence(text) {
  return text.replace(/^\s*```(?:mdx|md|markdown)?\s*\n/, "").replace(/\n```\s*$/, "\n");
}

/** Problems of a raw model translation (before heading ids and link localization are added). */
async function pageProblems(english, translated, lang) {
  const en = splitFrontmatter(english);
  const tr = splitFrontmatter(translated);
  const problems = [...frontmatterProblems(en.data, tr.data)];
  if (/^#{1,6} .*\[#[^\]]+\]\s*$/m.test(tr.body)) problems.push("headings must not contain [#id] markers");
  const compileError = await compileProblem(tr.body);
  if (compileError) return [...problems, compileError];
  return [...problems, ...structureProblems(en.body, tr.body, lang)];
}

async function translatePage(rel, lang, appLabels, apiKey) {
  const english = fs.readFileSync(path.join(CONTENT_DIR, rel), "utf8");
  const { body: enBody } = splitFrontmatter(english);
  const system = buildPagePrompt(lang, labelHints(appLabels, boldLabels(enBody)));
  let cost = 0;
  let problems = [];
  for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt += 1) {
    const user =
      attempt === 1
        ? english
        : `${english}\n\n---\nYour previous translation of this file was rejected because:\n${problems.map((p) => `- ${p}`).join("\n")}\nTranslate the whole file again, fixing these problems.`;
    const result = await complete({ model: MODELS[lang], system, user, json: false, apiKey });
    cost += result.cost;
    if (result.finish === "length") {
      problems = ["the reply was cut off (too long)"];
      continue;
    }
    const translated = stripFence(result.text).replace(/\s*$/, "\n");
    problems = await pageProblems(english, translated, lang);
    if (problems.length) {
      console.warn(`  ${lang}: ${rel} attempt ${attempt}/${MAX_PAGE_ATTEMPTS} rejected: ${problems.join("; ")}`);
      continue;
    }

    const tr = splitFrontmatter(translated);
    const body = localizeLinks(addHeadingIds(tr.body, englishHeadingIds(enBody)), lang);
    const final = tr.raw + body;
    const finalError = await compileProblem(body);
    if (finalError) {
      problems = [finalError];
      continue;
    }
    return { text: final, cost };
  }
  return { text: null, cost, problems };
}

async function translatePages(lang, cache, appLabels, { dryRun, force, apiKey, pages: filters }) {
  const localeCache = (cache[lang] ??= {});
  const stats = { cost: 0, failed: [], kept: [], written: 0 };
  const pending = [];
  for (const rel of listEnglishPages()) {
    if (filters.length && !filters.some((filter) => rel.includes(filter))) continue;
    const source = hashText(fs.readFileSync(path.join(CONTENT_DIR, rel), "utf8"));
    const outFile = path.join(CONTENT_DIR, localizedFile(rel, lang));
    const entry = localeCache[rel];
    if (!force && fs.existsSync(outFile)) {
      if (entry?.source === source) continue;
      const edited = entry?.output && hashText(fs.readFileSync(outFile, "utf8")) !== entry.output;
      // hand-edited and the English changed since: report instead of overwriting the edit
      if (edited || !entry) {
        stats.kept.push(rel);
        continue;
      }
    }
    pending.push({ rel, source, outFile });
  }
  console.log(`${lang}: ${pending.length} pages to translate with ${MODELS[lang]}`);
  if (dryRun || pending.length === 0) return stats;

  let done = 0;
  await pool(pending, async ({ rel, source, outFile }) => {
    const result = await translatePage(rel, lang, appLabels, apiKey);
    stats.cost += result.cost;
    done += 1;
    if (result.text === null) {
      stats.failed.push(`${rel} (${result.problems.join("; ")})`);
      console.warn(`  ${lang}: ${done}/${pending.length} ${rel} FAILED, left in English`);
      return;
    }
    fs.writeFileSync(outFile, result.text);
    localeCache[rel] = { source, output: hashText(result.text) };
    writeJson(PAGES_CACHE_PATH, cache);
    stats.written += 1;
    console.log(`  ${lang}: ${done}/${pending.length} ${rel} ($${result.cost.toFixed(4)}, total $${stats.cost.toFixed(2)})`);
  });
  return stats;
}

// ---------------------------------------------------------------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = readApiKey();
  if (!apiKey && !options.dryRun) {
    console.error("OPENROUTER_API_KEY not found in the environment, .env.local or .env.");
    process.exit(1);
  }
  const strings = englishStrings();
  const stringsCache = readJson(STRINGS_CACHE_PATH, {});
  const pagesCache = readJson(PAGES_CACHE_PATH, {});

  let failed = 0;
  for (const lang of options.locales) {
    const appLabels = loadAppLabels(lang);
    if (!appLabels) console.warn(`${lang}: the app's catalogs weren't found, so bold UI labels get no app hints (set CONNEKT_APP_MESSAGES_DIR).`);
    let cost = 0;

    if (options.strings) {
      const stats = await translateStrings(lang, strings, stringsCache, appLabels, { ...options, apiKey });
      cost += stats.cost;
      if (!options.dryRun) {
        writeJson(STRINGS_CACHE_PATH, stringsCache);
        const written = writeStrings(lang, strings, stringsCache);
        console.log(`${lang}: ${written.ui}/${written.uiTotal} UI strings written, sidebar labels written`);
      }
      for (const item of stats.failed) console.warn(`  ${lang}: kept English for ${item}; fix it in messages/overrides/${lang}.json`);
      failed += stats.failed.length;
    }

    if (options.pagesEnabled) {
      const stats = await translatePages(lang, pagesCache, appLabels, { ...options, apiKey });
      cost += stats.cost;
      for (const rel of stats.kept) console.warn(`  ${lang}: ${localizedFile(rel, lang)} was edited by hand and its English changed; update it, or rerun with --force --page ${rel}`);
      for (const item of stats.failed) console.warn(`  ${lang}: left in English: ${item}`);
      failed += stats.failed.length;
      if (!options.dryRun) console.log(`${lang}: ${stats.written} pages written`);
    }

    if (!options.dryRun) console.log(`${lang}: total cost $${cost.toFixed(4)}`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
