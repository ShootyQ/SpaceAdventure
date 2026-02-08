/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// If deploying to a custom domain (e.g. classcrave.com), keep basePath empty.
// If deploying to GitHub Pages subdirectory, set this to matches repo name:
// const repo = 'SpaceAdventure';
// const assetPrefix = isProd ? `/${repo}/` : '';
// const basePath = isProd ? `/${repo}` : '';
const assetPrefix = '';
const basePath = '';

const nextConfig = {
  // output: 'export', // Disabled to allow PDF generation and API Routes
  images: { unoptimized: true },
  basePath: basePath,
  assetPrefix: assetPrefix,
  env: {
      NEXT_PUBLIC_BASE_PATH: basePath,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.alias = {
            ...config.resolve.alias,
            'undici': false,
        };
    }
    return config;
  },
};

export default nextConfig;
