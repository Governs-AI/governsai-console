import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/** @type {import('next').NextConfig} */ 
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  basePath: '',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    domains: ['placeholder.svg'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: true,
  },
  transpilePackages: ["@prisma/client", "@governs-ai/billing", "@governs-ai/db"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new PrismaPlugin());
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    
    // Handle Node.js modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    return config
  },
}

export default nextConfig