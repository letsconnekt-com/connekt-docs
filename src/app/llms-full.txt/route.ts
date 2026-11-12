import { docsLlms } from '@/lib/llms';

export const revalidate = false;

// English only; translated pages are served as Markdown at their `.md` URL (`/ja/billing/plans-compared.md`)

export async function GET() {
  return new Response(await docsLlms.full('en'));
}
