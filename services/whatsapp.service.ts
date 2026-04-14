/**
 * Service WhatsApp OTP (proxy ICELABSOFT → Meta Graph API)
 *
 * Le token Meta est stocké côté serveur ICELABSOFT : le frontend ne fait
 * que poster { telephone, code, langue } vers le proxy HTTPS.
 *
 * Usage principal : pays ≠ SN (canal primaire, fallback Email).
 * Templates résolus automatiquement côté backend selon `langue` :
 *   - fr → fayclick_auth_code
 *   - en → fayclick_otp_verification
 *
 * Voir docs/memo_api_whatsapp.md pour la spec complète.
 */

import SecurityService from './security.service';

const WHATSAPP_API_URL = 'https://api.icelabsoft.com/whatsapp_service/api/send_otp';
const TIMEOUT_MS = 20_000;

export type WhatsAppLang = 'fr' | 'en';

export interface WhatsAppPayload {
  telephone: string;       // E.164 strict : +<indicatif><numero>, ex: '+212612345678'
  code: string;            // 4-8 chiffres
  langue?: WhatsAppLang;   // défaut 'fr'
  template?: string;       // override manuel, rarement utilisé
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  recipient?: string;
  message_id?: string;
  error_code?: string;
  details?: Array<{ field: string; msg: string }>;
}

/**
 * Codes d'erreur qui déclenchent un fallback Email côté caller.
 * Les autres (INVALID_REQUEST, CORS_FORBIDDEN, NOT_FOUND) sont des bugs à ne pas masquer.
 */
const FALLBACK_ERROR_CODES = new Set([
  'META_INVALID_NUMBER',
  'META_GENERIC_ERROR',
  'META_UNKNOWN_ERROR',
  'META_TOKEN_EXPIRED',
  'META_RATE_LIMIT',
  'DAILY_QUOTA_EXCEEDED',
  'INTERNAL_ERROR',
]);

class WhatsAppService {
  private static instance: WhatsAppService;

  private constructor() {}

  static getInstance(): WhatsAppService {
    if (!this.instance) this.instance = new WhatsAppService();
    return this.instance;
  }

  /**
   * Envoie un OTP WhatsApp. Retourne toujours un WhatsAppResponse :
   * vérifier `success` pour router vers fallback Email si false.
   *
   * @throws Error uniquement sur problème réseau (timeout, fetch fail).
   *   Les erreurs métier Meta sont retournées avec success=false.
   */
  async sendDirectWhatsApp(payload: WhatsAppPayload): Promise<WhatsAppResponse> {
    if (!payload.telephone || !/^\+\d{8,15}$/.test(payload.telephone)) {
      throw new Error('WhatsApp: téléphone invalide (format E.164 attendu, ex: +212612345678)');
    }
    if (!payload.code || !/^\d{4,8}$/.test(payload.code)) {
      throw new Error('WhatsApp: code OTP invalide (4 à 8 chiffres)');
    }

    const body: Record<string, string> = {
      telephone: payload.telephone,
      code: payload.code,
      langue: payload.langue ?? 'fr',
    };
    if (payload.template) body.template = payload.template;

    SecurityService.secureLog(
      'log',
      `📱 [WHATSAPP] Envoi OTP lang=${body.langue} to=${this.maskPhone(payload.telephone)}`
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(WHATSAPP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data: WhatsAppResponse = await res.json().catch(() => ({
        success: false,
        message: 'Réponse WhatsApp invalide',
        error_code: 'INTERNAL_ERROR',
      }));

      if (data.success) {
        SecurityService.secureLog('log', `✅ [WHATSAPP] OK message_id=${data.message_id ?? 'n/a'}`);
      } else {
        SecurityService.secureLog(
          'warn',
          `⚠️ [WHATSAPP] KO code=${data.error_code ?? 'unknown'} msg=${data.message}`
        );
      }

      return data;
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      SecurityService.secureLog('error', `❌ [WHATSAPP] Exception réseau: ${msg}`);
      throw new Error(`WhatsApp indisponible: ${msg}`);
    }
  }

  /**
   * Indique si une réponse WhatsApp en échec doit déclencher un fallback Email.
   */
  isFallbackEligible(response: WhatsAppResponse): boolean {
    if (response.success) return false;
    return FALLBACK_ERROR_CODES.has(response.error_code ?? '');
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '***';
    return phone.substring(0, 4) + '****' + phone.substring(phone.length - 3);
  }
}

export default WhatsAppService.getInstance();
