import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        // the logo is dark, so invert it on the dark theme
        <img src="/logo.svg" alt="Connekt" width={99} height={24} className="h-6 w-auto dark:invert" />
      ),
    },
  };
}
