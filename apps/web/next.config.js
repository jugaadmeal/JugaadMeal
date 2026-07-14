/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared-types', 'ui-tokens'],
  outputFileTracing: false,
  output: 'export',
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Bypass OneDrive real-time sync lock errors by keeping compilation cache in memory
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
}

module.exports = nextConfig
