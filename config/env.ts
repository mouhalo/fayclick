/**
 * Configuration environnement pour FayClick V2
 * Compatible avec l'architecture old_services XML
 */

import { getApiBaseUrl } from '@/lib/api-config';

// Interface pour la configuration API
interface ApiConfig {
  ENDPOINT: string;
  TIMEOUT: number;
  APPLICATION_NAME: string;
  ORANGE_ENDPOINT: string;
}

// Configuration principale avec détection automatique d'environnement
export const API_CONFIG: ApiConfig = {
  // Utilise le système de détection automatique existant (l'endpoint complet est déjà configuré)
  ENDPOINT: getApiBaseUrl(),
  TIMEOUT: 30000,
  APPLICATION_NAME: 'fayclick',
  // Endpoint Orange Money depuis .env
  ORANGE_ENDPOINT: process.env.ORANGE_ENDPOINT || 'https://api.icelabsoft.com/orange/pay_om'
};

// Configuration des applications supportées (compatible old_services)
export const APPLICATIONS_CONFIG = {
  payecole: {
    name: 'payecole',
    description: 'Application de gestion scolaire et paiements',
    defaultTimeout: 10000
  },
  fayclick: {
    name: 'fayclick',
    description: 'Super App de gestion avec payement Wallet',
    defaultTimeout: 10000
  },
  sms: {
    name: 'sms',
    description: 'Application d\'envoi de SMS via add_pending_sms',
    defaultTimeout: 10000
  }
} as const;

// Export pour compatibilité avec old_services
export { API_CONFIG as default };

// Logs de configuration en développement
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [CONFIG] Configuration API XML activée:');
  console.log('📍 Endpoint:', API_CONFIG.ENDPOINT);
  console.log('⏱️ Timeout:', API_CONFIG.TIMEOUT + 'ms');
  console.log('📱 Application:', API_CONFIG.APPLICATION_NAME);
}