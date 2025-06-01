import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static file serving configuration
  async headers() {
    return [
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/suped-nexvolv-logo.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'image/png',
          },
        ],
      },
    ];
  },

  // Bundle analysis
  webpack: (config, { isServer }) => {
    // Analyze bundle size in production builds
    if (process.env.ANALYZE === 'true') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: isServer ? '../analyze/server.html' : '../analyze/client.html',
            openAnalyzer: false,
          })
        );
      } catch (error) {
        console.warn('webpack-bundle-analyzer not found, skipping bundle analysis');
      }
    }

    // Optimize chunks
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate vendor chunks by usage patterns
          audioVendor: {
            test: /[\\/]node_modules[\\/](whisper|@whisper|audio-|ffmpeg)/,
            name: 'audio-vendor',
            chunks: 'all',
            priority: 30,
          },
          dndVendor: {
            test: /[\\/]node_modules[\\/]@dnd-kit/,
            name: 'dnd-vendor',
            chunks: 'all',
            priority: 25,
          },
          chartsVendor: {
            test: /[\\/]node_modules[\\/](recharts|d3-|victory)/,
            name: 'charts-vendor',
            chunks: 'all',
            priority: 25,
          },
          editorVendor: {
            test: /[\\/]node_modules[\\/]@tiptap/,
            name: 'editor-vendor',
            chunks: 'all',
            priority: 25,
          },
          dateVendor: {
            test: /[\\/]node_modules[\\/](date-fns|react-day-picker)/,
            name: 'date-vendor',
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }

    return config;
  },

  // Disable strict linting during build for performance testing
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checking during build for performance testing
  typescript: {
    ignoreBuildErrors: true,
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'recharts',
    ],
    // Configure server actions for larger file uploads
    serverActions: {
      bodySizeLimit: '100mb', // Allow up to 100MB for audio file uploads
    },
  },
};

export default nextConfig;
