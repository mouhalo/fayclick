/**
 * Configuration API centralisée pour FayClick V2
 * Détection automatique d'environnement par URL
 */

// Type pour les environnements supportés
type Environment = 'development' | 'production';

/**
 * Détecte automatiquement l'environnement selon le contexte
 * - Côté serveur: utilise NODE_ENV
 * - Côté client: analyse l'hostname pour détecter localhost vs production
 */
function detectEnvironment(): Environment {
  // Côté serveur (build time et SSR)
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }
  
  // Côté client (runtime) - Détection par hostname
  const hostname = window.location.hostname;
  
  // Environnements de développement local
  const developmentHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0'
  ];
  
  // Détection développement
  if (developmentHosts.includes(hostname) || 
      hostname.startsWith('192.168.') ||     // Réseau local
      hostname.startsWith('10.') ||          // Réseau local  
      hostname.startsWith('172.') ||         // Réseau local
      hostname.endsWith('.local') ||         // mDNS local
      hostname.includes('ngrok') ||          // Tunnels de développement
      hostname.includes('vercel.app')) {     // Preview Vercel
    return 'development';
  }
  
  // Par défaut, considérer comme production
  return 'production';
}

/**
 * Obtient l'URL API selon l'environnement détecté automatiquement
 * Permet override manuel via FORCE_ENVIRONMENT
 */
export function getApiBaseUrl(): string {
  // Override manuel possible via variable d'environnement
  const forceEnv = process.env.FORCE_ENVIRONMENT as Environment;
  const detectedEnv = forceEnv || detectEnvironment();
  
  switch (detectedEnv) {
    case 'production':
      return process.env.NEXT_PUBLIC_API_URL_PROD || 'https://api.icelabsoft.com/api/psql_request/api/psql_request';
    case 'development':
    default:
      return process.env.NEXT_PUBLIC_API_URL_DEV || 'https://api.icelabsoft.com/api/psql_request/api/psql_request';
  }
}

/**
 * Obtient des informations détaillées sur l'environnement détecté
 * Utile pour le debugging et les logs
 */
export function getEnvironmentInfo() {
  const isServer = typeof window === 'undefined';
  const hostname = isServer ? 'server' : window.location.hostname;
  const detectedEnv = detectEnvironment();
  const apiUrl = getApiBaseUrl();
  
  return {
    isServer,
    hostname,
    detectedEnvironment: detectedEnv,
    nodeEnv: process.env.NODE_ENV,
    forceEnvironment: process.env.FORCE_ENVIRONMENT,
    apiUrl,
    timestamp: new Date().toISOString()
  };
}

// Configuration centralisée
export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
} as const;

// Logs détaillés pour vérifier la détection automatique
if (process.env.NODE_ENV === 'development') {
  const envInfo = getEnvironmentInfo();
  
  console.log('🔧 FayClick V2 - Configuration API Automatique');
  console.log('📍 Détection d\'environnement:', {
    hostname: envInfo.hostname,
    détecté: envInfo.detectedEnvironment,
    nodeEnv: envInfo.nodeEnv,
    forceEnv: envInfo.forceEnvironment || 'aucun',
    isServer: envInfo.isServer
  });
  console.log('🌐 Configuration API:', {
    baseUrl: envInfo.apiUrl,
    timeout: API_CONFIG.timeout + 'ms'
  });
  console.log('⏰ Timestamp:', envInfo.timestamp);
  
  // Warning si configuration manuelle détectée
  if (envInfo.forceEnvironment) {
    console.warn('⚠️ Override manuel détecté via FORCE_ENVIRONMENT');
  }
}