import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production avec export statique
  // output: 'export', // Temporairement désactivé à cause des routes dynamiques [token]
  trailingSlash: false, // Désactiver les slashes finaux pour les URLs de factures
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
