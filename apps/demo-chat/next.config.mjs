/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
      PROVIDER: process.env.PROVIDER,
      PRECHECK_URL: process.env.PRECHECK_URL,
      DEMO_USER_ID: process.env.DEMO_USER_ID,
      PRECHECK_API_KEY: process.env.PRECHECK_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    },
};

export default nextConfig;
