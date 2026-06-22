/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Mirror server-side mode flag to the client.
  env: {
    NEXT_PUBLIC_BKOS_MODE: process.env.BKOS_MODE || 'private',
  },
};
export default nextConfig;
