/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node:sqlite'],
  // Схема и готовая база нужны функции во время работы, но импортов на них
  // нет — Next сам бы их не положил в бандл.
  outputFileTracingIncludes: {
    '/**': ['./lib/schema.sql', './data/seed.db'],
  },
};

export default nextConfig;
