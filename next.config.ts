import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production avec export statique
  output: 'export', // Réactivé pour le déploiement
  trailingSlash: false, // Désactiver les slashes finaux pour les URLs de factures
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Temporaire pour déploiement
  },
  // Configuration PWA (désactivée pour export statique)
  // headers: async () => [...], // Désactivé car incompatible avec output: 'export'
};

export default nextConfig;
