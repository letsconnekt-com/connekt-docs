import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, tool, toUIMessageStream } from "ai";
import { z } from "zod";
import { docsLlms } from "@/lib/llms";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { searchServer } from "@/lib/search";
import { source } from "@/lib/source";
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

/** System prompt, you can update it to provide more specific information */
const systemPrompt = docsLlms.index().then((index) =>
  [
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
    "- Cite sources as standard Markdown links with a readable title and the page URL: [Plans compared](/billing/plans-compared). Search results may include a section anchor, e.g. [Pricing](/billing/plans-compared#pricing).",
    "- Never write bare bracket citations like [/billing/plans-compared] or [-billing/plans-compared#pricing], they don't render as links.",
    "- Link each source once, where it's first relevant or in a short \"Learn more\" line at the end. Don't add a citation after every sentence or bullet.",
    "- If the documentation doesn't cover the question, say so plainly and don't guess. For account-specific issues, point the user to [Getting help](/getting-started/getting-help) to reach the Connekt team via in-app chat or email.",
    "- The user message may include `[Client Context]` with the page the user is viewing, use it to resolve questions like \"this page\".",
    "",
    "Page index:",
    index,
  ].join("\n"),
);

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

  const result = streamText({
    model: openrouter.chat(model, { models: [model, ...fallbackModels] }),
    stopWhen: stepCountIs(5),
    maxOutputTokens: 2000,
    tools: {
      search: searchTool,
      get_page: getPageTool,
    },
    // AI SDK 7 rejects system messages inside `messages`
    instructions: await systemPrompt,
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

const searchTool = tool({
  description:
    "Search the documentation. Returns matching pages, headings and text snippets with their URLs, read a page with `get_page` for full details.",
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(20).default(8),
  }),
  async execute({ query, limit }) {
    const results = await searchServer.search(query);

    return results.slice(0, limit).map((result) => ({
      url: result.url,
      type: result.type,
      content: result.content.replace(/<\/?mark>/g, ""),
    }));
  },
}) satisfies SearchTool;

const getPageTool = tool({
  description: "Read the full Markdown content of a documentation page by its URL, e.g. `/billing/plans-compared`.",
  inputSchema: z.object({
    url: z.string(),
  }),
  async execute({ url }) {
    const page = source.getPageByUrl(url.split("#")[0]);
    if (!page) return `Page not found: ${url}. Pick a URL from the page index.`;

    return await docsLlms.page(page);
  },
});
