// next.config.mjs
var isProd = process.env.NODE_ENV === "production";
var assetPrefix = "";
var basePath = "";
var nextConfig = {
  // output: 'export', // Disabled to allow PDF generation and API Routes
  images: { unoptimized: true },
  basePath,
  assetPrefix,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "undici": false
      };
    }
    return config;
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
