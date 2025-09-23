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
    appDir: true,
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
    return config
  },
}

export default nextConfig