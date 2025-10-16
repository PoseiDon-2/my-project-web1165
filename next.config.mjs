/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false }, // เปิดตรวจ error เพื่อ debug
  images: { domains: ["res.cloudinary.com"], unoptimized: true },
};
export default nextConfig;