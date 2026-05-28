/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next.js from bundling pdf-parse — it needs native Node.js fs
    // access and triggers test-file reads at module init that break webpack.
    serverComponentsExternalPackages: ['pdf-parse'],
  },
}

export default nextConfig
