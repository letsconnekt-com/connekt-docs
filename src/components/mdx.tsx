import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card as FdCard, Cards } from 'fumadocs-ui/components/card';
import { Step as FdStep, Steps as FdSteps } from 'fumadocs-ui/components/steps';
import { Tab as FdTab, Tabs as FdTabs } from 'fumadocs-ui/components/tabs';
import { asMarkdown, md } from 'fumadocs-core/server';
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { MDXComponents } from 'mdx/types';
import { cn } from '@/lib/cn';
import { faIcon } from '@/components/fa-icons';
import {
  Accordion as ClientAccordion,
  AccordionGroup as ClientAccordionGroup,
} from '@/components/accordion';

// Mintlify-compatible components, mapped onto fumadocs UI.
// Each one also defines a Markdown form (via `asMarkdown()`), used for llms.txt, `.md` pages and Ask AI.

type CalloutProps = { title?: ReactNode; children?: ReactNode };

function createCallout(type: ComponentProps<typeof Callout>['type'], label: string) {
  return function MintlifyCallout(props: CalloutProps) {
    if (asMarkdown()) return md.linePrefix('> ')`**${props.title ?? label}:** ${props.children}`;

    return <Callout type={type} {...props} />;
  };
}

const Note = createCallout('info', 'Note');
const Info = createCallout('info', 'Info');
const Tip = createCallout('idea', 'Tip');
const Warning = createCallout('warning', 'Warning');
const Check = createCallout('success', 'Check');

const colsClass = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
} as const;

function CardGroup({
  cols = 2,
  className,
  ...props
}: ComponentProps<typeof Cards> & { cols?: keyof typeof colsClass }) {
  // drop the whitespace between cards, so they form a single list
  if (asMarkdown()) return md`${Children.toArray(props.children).filter((child) => isValidElement(child))}\n`;

  return <Cards {...props} className={cn(colsClass[cols], className)} />;
}

function Card({ icon, ...props }: Omit<ComponentProps<typeof FdCard>, 'icon'> & { icon?: ReactNode }) {
  if (asMarkdown()) return cardMarkdown(props);

  return <FdCard {...props} icon={typeof icon === 'string' ? faIcon(icon) : icon} />;
}

async function cardMarkdown({ title, href, children }: { title: ReactNode; href?: string; children?: ReactNode }) {
  const label = href ? `[${await md`${title}`}](${href})` : `**${await md`${title}`}**`;
  const body = (await md`${children}`).trim();

  if (!body) return `- ${label}\n`;
  if (!body.includes('\n')) return `- ${label}: ${body}\n`;
  // multi-line content (e.g. a nested list) has to be indented to stay inside the list item
  return `- ${label}\n\n${body.replace(/^(?=.)/gm, '  ')}\n\n`;
}

type StepProps ={ title?: ReactNode; children?: ReactNode; index?: number };

function Steps({ children }: { children?: ReactNode }) {
  if (asMarkdown()) {
    // number the steps, since the rendered numbers only come from CSS
    const steps = Children.toArray(children)
      .filter((child) => isValidElement<StepProps>(child))
      .map((child, i) => cloneElement(child, { index: i + 1 }));
    return md`${steps}`;
  }

  return <FdSteps>{children}</FdSteps>;
}

function Step({ title, children, index }: StepProps) {
  if (asMarkdown()) {
    const label = index ? `Step ${index}` : 'Step';
    return title ? md`**${label}: ${title}**\n\n${children}\n\n` : md`**${label}**\n\n${children}\n\n`;
  }

  return (
    <FdStep>
      {title ? <h3>{title}</h3> : null}
      {children}
    </FdStep>
  );
}

type TabProps = { title: string; children?: ReactNode };

function Tab({ title, children }: TabProps) {
  if (asMarkdown()) return md`**${title}**\n\n${children}\n\n`;

  return <FdTab value={title}>{children}</FdTab>;
}

function Tabs({ children }: { children?: ReactNode }) {
  if (asMarkdown()) return md`${children}`;

  const items = Children.toArray(children)
    .filter(
      (child): child is ReactElement<TabProps> =>
        isValidElement<TabProps>(child) && typeof child.props.title === 'string',
    )
    .map((child) => child.props.title);

  return <FdTabs items={items}>{children}</FdTabs>;
}

// server wrappers, so the client accordion components get a Markdown form

function AccordionGroup(props: ComponentProps<typeof ClientAccordionGroup>) {
  if (asMarkdown()) return md`${props.children}`;

  return <ClientAccordionGroup {...props} />;
}

function Accordion(props: ComponentProps<typeof ClientAccordion>) {
  if (asMarkdown()) return md`**${props.title}**\n\n${props.children}\n\n`;

  return <ClientAccordion {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Card,
    CardGroup,
    Steps,
    Step,
    Tabs,
    Tab,
    Accordion,
    AccordionGroup,
    Note,
    Info,
    Tip,
    Warning,
    Check,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
