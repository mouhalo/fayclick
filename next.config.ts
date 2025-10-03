import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production
  // Mode export statique + Upload via API backend
  output: 'export', // ✅ Génération statique (Apache/Nginx)
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
  // Configuration PWA
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        }
      ],
    },
  ],
};

export default nextConfig;
