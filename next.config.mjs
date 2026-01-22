/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repo = 'SpaceAdventure';
const assetPrefix = isProd ? `/${repo}/` : '';
const basePath = isProd ? `/${repo}` : '';

const nextConfig = {
  output: 'export',
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
