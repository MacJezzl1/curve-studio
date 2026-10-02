/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@curve-studio/core",
    "@curve-studio/presets",
    "@curve-studio/chain",
    "@curve-studio/ui",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
