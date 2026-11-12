import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';
import { MessageCircleIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { notFound } from 'next/navigation';
import { isLanguage } from '@/lib/i18n';
import { getT } from '@/lib/translations';

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = getT(lang);

  return (
    <DocsLayout tree={source.getPageTree(lang)} {...baseOptions(lang)}>
      <AISearch lang={lang}>
        <AISearchPanel />
        <AISearchTrigger
          position="float"
          className={cn(
            buttonVariants({
              variant: 'secondary',
              // `min-w-24`: translated labels can be wider than "Ask AI"
              className: 'text-fd-muted-foreground rounded-2xl w-auto min-w-24',
            }),
          )}
        >
          <MessageCircleIcon className="size-4.5" />
          {t('Ask AI', { note: 'AI chat button' })}
        </AISearchTrigger>
      </AISearch>

      {children}
    </DocsLayout>
  );
}
