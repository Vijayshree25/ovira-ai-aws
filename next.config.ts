import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for faster builds
  experimental: {
    // Optimize package imports for faster cold starts
    optimizePackageImports: ['lucide-react', 'date-fns', '@react-pdf/renderer'],
  },
  // Reduce source map overhead in development
  productionBrowserSourceMaps: false,
  // Skip type checking during build (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build (run separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // PWA: Ensure service worker has correct scope and freshness
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
};

export default nextConfig;
