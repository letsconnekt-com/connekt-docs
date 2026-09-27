import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      // renamed or removed pages
      { source: '/lists/creating-a-talent-pool', destination: '/projects/creating-a-project', permanent: true },
      { source: '/lists/:path*', destination: '/projects/:path*', permanent: true },
      { source: '/integrations/connecting-gmail', destination: '/integrations/connecting-email', permanent: true },
      { source: '/integrations/connecting-linkedin', destination: '/integrations/connecting-email', permanent: true },
      { source: '/placements/business-development-pipeline', destination: '/submissions/pipeline-board', permanent: true },
    ];
  },
};

export default withMDX(config);
