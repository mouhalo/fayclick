import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour la production - Mode export statique
  output: 'export',
  trailingSlash: false,

  images: {
    unoptimized: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuration Webpack pour résolution alias @/
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, '.');
    return config;
  },

  // Note: headers() n'est PAS compatible avec output: 'export'
  // Les headers de sécurité sont gérés via .htaccess sur le serveur Apache
};

export default nextConfig;
