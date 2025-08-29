import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production avec export statique
  output: 'export', // Réactivé pour le déploiement - les routes dynamiques marchent en dev seulement
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
