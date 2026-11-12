import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// renamed or removed pages
const moved = [
  { source: '/lists/creating-a-talent-pool', destination: '/projects/creating-a-project' },
  { source: '/lists/:path*', destination: '/projects/:path*' },
  { source: '/integrations/connecting-gmail', destination: '/integrations/connecting-email' },
  { source: '/integrations/connecting-linkedin', destination: '/integrations/connecting-email' },
  { source: '/placements/business-development-pipeline', destination: '/submissions/pipeline-board' },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return moved.flatMap(({ source, destination }) => [
      { source, destination, permanent: true },
      // the same pages under a language prefix (keep the list in sync with `LANGUAGES` in src/lib/i18n.ts;
      // disabled languages: zh, zh-hk, ko → `/:lang(ja|zh|zh-hk|ko)`)
      { source: `/:lang(ja)${source}`, destination: `/:lang${destination}`, permanent: true },
    ]);
  },
};

export default withMDX(config);
