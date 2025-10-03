import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production
  // ⚠️ IMPORTANT: Utiliser 'export' pour génération statique (Apache/Nginx)
  // Si vous avez des API Routes, utilisez 'standalone' avec un serveur Node.js
  output: 'export', // Génération statique pour Apache/Nginx
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
