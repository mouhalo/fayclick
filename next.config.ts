import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour la production
  // ⚠️ IMPORTANT: Utiliser 'standalone' pour les API Routes (upload logo)
  // output: 'export', // ❌ Désactivé pour permettre les API Routes
  output: 'standalone', // ✅ Mode serveur Node.js pour API Routes
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
