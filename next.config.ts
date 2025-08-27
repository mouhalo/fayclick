import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration simple pour l'export statique
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
