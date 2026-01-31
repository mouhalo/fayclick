/**
 * Configuration environnement pour FayClick V2
 * API JSON via sql_jsonpro (proxy Next.js /api/sql)
 */

// Interface pour la configuration API
interface ApiConfig {
  ENDPOINT: string;
  TIMEOUT: number;
  APPLICATION_NAME: string;
  ORANGE_ENDPOINT: string;
}

// Le proxy local gere le forward vers sql_jsonpro
export const API_CONFIG: ApiConfig = {
  ENDPOINT: '/api/sql',
  TIMEOUT: 30000,
  APPLICATION_NAME: 'fayclick',
  ORANGE_ENDPOINT: process.env.ORANGE_ENDPOINT || 'https://api.icelabsoft.com/orange/pay_om'
};

// Configuration des applications supportees
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
    description: "Application d'envoi de SMS via add_pending_sms",
    defaultTimeout: 10000
  }
} as const;

export { API_CONFIG as default };

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [CONFIG] Configuration API JSON (sql_jsonpro):');
  console.log('📍 Proxy:', API_CONFIG.ENDPOINT);
  console.log('⏱️ Timeout:', API_CONFIG.TIMEOUT + 'ms');
  console.log('📱 Application:', API_CONFIG.APPLICATION_NAME);
}
