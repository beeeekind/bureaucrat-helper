/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'pdfjs-dist', '@napi-rs/canvas'],
}

export default nextConfig
