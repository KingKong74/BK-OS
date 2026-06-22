/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Don't 308-redirect /api/webdav/ → /api/webdav. WebDAV clients (Windows
  // File Explorer especially) don't follow redirects and fail silently.
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_BKOS_MODE: process.env.BKOS_MODE || 'private',
  },
};
export default nextConfig;
