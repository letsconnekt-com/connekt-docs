import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, tool, toUIMessageStream } from "ai";
import { z } from "zod";
import { docsLlms } from "@/lib/llms";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { searchServer } from "@/lib/search";
import { source } from "@/lib/source";
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGE_META, localizedPath, type Language } from "@/lib/i18n";
import type { ChatUIMessage, SearchTool } from "@/components/ai/search";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// fallback when OPENROUTER_MODEL is not set
const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4.1-flash";
// OpenRouter retries with these when the primary model is down or rate limited
const fallbackModels = ["deepseek/deepseek-v4.1-flash", "google/gemini-3.5-flash-lite"].filter((m) => m !== model);

/** only the latest messages are sent to the model, to bound the cost of long chats */
const MAX_MESSAGES = 20;
/** upper bound for the serialized messages, rejects oversized prompts */
const MAX_MESSAGES_SIZE = 50_000;

// the endpoint is public (help centre visitors are anonymous), so limit how often one client can call it
const rateLimit = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });

/** System prompt per language, you can update it to provide more specific information */
const systemPrompts = new Map<Language, Promise<string>>();

function getSystemPrompt(lang: Language) {
  let prompt = systemPrompts.get(lang);
  if (!prompt) {
    prompt = docsLlms.index(lang).then((index) => buildSystemPrompt(lang, index));
    systemPrompts.set(lang, prompt);
  }
  return prompt;
}

function buildSystemPrompt(lang: Language, index: string) {
  const help = localizedPath("/getting-started/getting-help", lang);
  const plans = localizedPath("/billing/plans-compared", lang);
  const language =
    lang === DEFAULT_LANGUAGE
      ? []
      : [
          `Language: the user is reading the ${LANGUAGE_META[lang].englishName} Help Centre. Answer in ${LANGUAGE_META[lang].englishName} unless the user writes in another language, then answer in theirs.`,
          `Use the UI labels exactly as the ${LANGUAGE_META[lang].englishName} pages write them. Link to the ${LANGUAGE_META[lang].englishName} pages, whose URLs start with /${lang}/.`,
          "",
        ];

  return [
    "You are the AI assistant for the Connekt Help Centre, the documentation for Connekt, a recruitment CRM for staffing agencies and in-house hiring teams.",
    "Answer questions about using Connekt, grounded only in the documentation.",
    "",
    "How to find information:",
    "- The page index below lists every documentation page with its URL and a short description. Use it to pick the relevant pages.",
    "- Call `get_page` with a page URL to read the full page before answering. Read more than one page when the question spans several topics.",
    "- Call `search` when you're unsure which page covers the question. It returns matching sections with their URLs.",
    "",
    "How to answer:",
    "- Be concise and practical. Use numbered steps for procedures and bold for UI elements, as the docs do.",
    `- Cite sources as standard Markdown links with a readable title and the page URL: [Plans compared](${plans}). Search results may include a section anchor, e.g. [Pricing](${plans}#pricing).`,
    `- Never write bare bracket citations like [${plans}] or [-billing/plans-compared#pricing], they don't render as links.`,
    "- Link each source once, where it's first relevant or in a short \"Learn more\" line at the end. Don't add a citation after every sentence or bullet.",
    `- If the documentation doesn't cover the question, say so plainly and don't guess. For account-specific issues, point the user to [Getting help](${help}) to reach the Connekt team via in-app chat or email.`,
    "- The user message may include `[Client Context]` with the page the user is viewing, use it to resolve questions like \"this page\".",
    "",
    ...language,
    "Page index:",
    index,
  ].join("\n");
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("Ask AI is not configured: missing OPENROUTER_API_KEY", { status: 500 });
  }

  // only accept requests from the docs site itself, not other origins
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== host) {
    return new Response("Forbidden", { status: 403 });
  }

  const limited = rateLimit(getClientIp(req));
  if (!limited.ok) {
    return new Response("Too many requests, please try again later.", {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }

  const reqJson = await req.json().catch(() => null);
  if (!reqJson || !Array.isArray(reqJson.messages)) {
    return new Response("Invalid request body", { status: 400 });
  }

  const messages: ChatUIMessage[] = reqJson.messages.slice(-MAX_MESSAGES);
  if (JSON.stringify(messages).length > MAX_MESSAGES_SIZE) {
    return new Response("Conversation is too long, please start a new chat.", { status: 413 });
  }

  // the Help Centre language the user is reading, sent by the chat panel with every message
  const lastClientPart = messages
    .flatMap((message) => message.parts ?? [])
    .findLast((part) => part.type === "data-client");
  const requestedLang = lastClientPart?.type === "data-client" ? lastClientPart.data.lang : undefined;
  const lang: Language = isLanguage(requestedLang) ? requestedLang : DEFAULT_LANGUAGE;

  const result = streamText({
    model: openrouter.chat(model, { models: [model, ...fallbackModels] }),
    stopWhen: stepCountIs(5),
    maxOutputTokens: 2000,
    tools: {
      search: createSearchTool(lang),
      get_page: createGetPageTool(lang),
    },
    // AI SDK 7 rejects system messages inside `messages`
    instructions: await getSystemPrompt(lang),
    messages: await convertToModelMessages<ChatUIMessage>(messages, {
      convertDataPart(part) {
        if (part.type === "data-client")
          return {
            type: "text",
            text: `[Client Context: ${JSON.stringify(part.data)}]`,
          };
      },
    }),
    toolChoice: "auto",
    onError({ error }) {
      console.error("[api/chat]", error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

const createSearchTool = (lang: Language) => tool({
  description:
    "Search the documentation. Returns matching pages, headings and text snippets with their URLs, read a page with `get_page` for full details.",
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(20).default(8),
  }),
  async execute({ query, limit }) {
    const results = await searchServer.search(query, { locale: lang });

    return results.slice(0, limit).map((result) => ({
      url: result.url,
      type: result.type,
      content: result.content.replace(/<\/?mark>/g, ""),
    }));
  },
}) satisfies SearchTool;

const createGetPageTool = (lang: Language) => tool({
  description: `Read the full Markdown content of a documentation page by its URL, e.g. \`${localizedPath("/billing/plans-compared", lang)}\`.`,
  inputSchema: z.object({
    url: z.string(),
  }),
  async execute({ url }) {
    const path = url.split("#")[0];
    // accept the English form of a URL too, and serve the page in the user's language
    const page = source.getPageByUrl(path, lang) ?? source.getPageByUrl(localizedPath(path, lang), lang) ?? source.getPageByUrl(path);
    if (!page) return `Page not found: ${url}. Pick a URL from the page index.`;

    return await docsLlms.page(page);
  },
});
