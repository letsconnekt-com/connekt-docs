'use client';
import { createContext, useContext, type ComponentProps } from 'react';
import { Accordion as FdAccordion, Accordions } from 'fumadocs-ui/components/accordion';

const InGroup = createContext(false);

export function AccordionGroup(props: ComponentProps<typeof Accordions>) {
  return (
    <InGroup.Provider value>
      <Accordions multiple {...props} />
    </InGroup.Provider>
  );
}

type AccordionProps = ComponentProps<typeof FdAccordion> & { defaultOpen?: boolean };

// Mintlify allows a bare <Accordion>, fumadocs requires an <Accordions> root
export function Accordion({ defaultOpen, ...props }: AccordionProps) {
  const inGroup = useContext(InGroup);
  if (inGroup) return <FdAccordion {...props} />;

  const value = props.value ?? String(props.title);
  return (
    <Accordions defaultValue={defaultOpen ? [value] : undefined}>
      <FdAccordion {...props} value={value} />
    </Accordions>
  );
}
