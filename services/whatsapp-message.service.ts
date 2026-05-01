/**
 * Service WhatsApp Message (proxy ICELABSOFT → Meta Graph API)
 *
 * Endpoint : POST https://api.icelabsoft.com/whatsapp_service/api/send_message
 *
 * Permet d'envoyer des messages WhatsApp via les 11 templates opérationnels
 * approuvés Meta. Le token Meta est stocké côté serveur ICELABSOFT.
 *
 * Templates supportés (voir docs/memo_whatsapp_new_endpoints.md) :
 *  - fayclick_admin_message (FR/EN) : message admin générique (sujet + corps)
 *  - achat_confirme_ok / payment_confirmed : confirmation paiement
 *  - fayclick_subscription_offered / _en : cadeau abonnement
 *  - fayclick_subscription_expiring / _en : rappel expiration
 *  - fayclick_password_reset (FR) : reset MDP
 *  - present_product / present_shop : présentation boutique (image + bouton)
 *
 * ⚠️ Sécurité :
 *  - Ne JAMAIS logger le contenu brut du message (peut contenir MDP)
 *  - Le numéro est masqué dans les logs : +2217*****221
 *
 * Pattern : singleton, cohérent avec services/whatsapp.service.ts (OTP).
 */

import SecurityService from './security.service';

const WHATSAPP_MESSAGE_API_URL =
  'https://api.icelabsoft.com/whatsapp_service/api/send_message';
const TIMEOUT_MS = 20_000;

export type WhatsAppLang = 'fr' | 'en';

export interface SendMessagePayload {
  /** Numéro destinataire au format E.164 strict (ex: +221777301221) */
  telephone: string;
  /** Nom Meta exact ou alias du template (ex: fayclick_admin_message) */
  template: string;
  /** Langue du template ('fr' par défaut). Résolution auto côté backend. */
  langue?: WhatsAppLang;
  /** Variables ordonnées {{1}}, {{2}}, ... du body. [] si template sans variable */
  variables: string[];
  /** URL HTTPS publique d'image (templates avec header IMAGE) */
  header_image_url?: string;
  /** Paramètre du button URL dynamique (templates avec bouton dynamique) */
  button_url_param?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  recipient?: string;
  message_id?: string;
  error_code?: string;
  details?: Array<{ field: string; msg: string }>;
}

/**
 * Codes d'erreur qui justifient un fallback (autre canal : SMS / Email).
 */
const FALLBACK_ERROR_CODES = new Set([
  'META_INVALID_NUMBER',
  'META_GENERIC_ERROR',
  'META_UNKNOWN_ERROR',
  'META_TOKEN_EXPIRED',
  'META_RATE_LIMIT',
  'META_PAIR_RATE_LIMIT',
  'DAILY_QUOTA_EXCEEDED',
  'INTERNAL_ERROR',
]);

class WhatsAppMessageService {
  private static instance: WhatsAppMessageService;

  private constructor() {}

  static getInstance(): WhatsAppMessageService {
    if (!this.instance) this.instance = new WhatsAppMessageService();
    return this.instance;
  }

  /**
   * Envoie un message WhatsApp via le proxy ICELABSOFT.
   *
   * Normalise automatiquement les numéros sénégalais 9 chiffres
   * (ex: 771234567) en E.164 (+221771234567).
   *
   * @returns SendMessageResponse — vérifier `success` pour router fallback.
   * @throws Error uniquement sur erreur réseau (timeout, fetch fail).
   *   Les erreurs métier Meta sont retournées avec success=false.
   */
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    const normalizedPhone = this.normalizeToE164(payload.telephone);

    if (!/^\+\d{8,15}$/.test(normalizedPhone)) {
      throw new Error(
        'WhatsApp: téléphone invalide (format E.164 attendu, ex: +221777301221)'
      );
    }
    if (!payload.template || typeof payload.template !== 'string') {
      throw new Error('WhatsApp: template requis');
    }
    if (!Array.isArray(payload.variables)) {
      throw new Error('WhatsApp: variables doit être un tableau (peut être vide)');
    }

    const body: Record<string, unknown> = {
      telephone: normalizedPhone,
      template: payload.template,
      langue: payload.langue ?? 'fr',
      variables: payload.variables,
    };
    if (payload.header_image_url) {
      body.header_image_url = payload.header_image_url;
    }
    if (payload.button_url_param) {
      body.button_url_param = payload.button_url_param;
    }

    // ⚠️ Logger uniquement les métadonnées (jamais variables ni corps)
    SecurityService.secureLog(
      'log',
      `📱 [WHATSAPP_MSG] Envoi template=${payload.template} lang=${body.langue} to=${this.maskPhone(normalizedPhone)} vars=${payload.variables.length}`
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(WHATSAPP_MESSAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data: SendMessageResponse = await res.json().catch(() => ({
        success: false,
        message: 'Réponse WhatsApp invalide',
        error_code: 'INTERNAL_ERROR',
      }));

      if (data.success) {
        SecurityService.secureLog(
          'log',
          `✅ [WHATSAPP_MSG] OK message_id=${data.message_id ?? 'n/a'} recipient=${data.recipient ?? 'n/a'}`
        );
      } else {
        SecurityService.secureLog(
          'warn',
          `⚠️ [WHATSAPP_MSG] KO code=${data.error_code ?? 'unknown'} msg=${data.message}`
        );
      }

      return data;
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      SecurityService.secureLog('error', `❌ [WHATSAPP_MSG] Exception réseau: ${msg}`);
      throw new Error(`WhatsApp indisponible: ${msg}`);
    }
  }

  /**
   * Helper : envoie un message admin générique via `fayclick_admin_message`.
   * Variables : [sujet, corps]
   *
   * @param telephone - Numéro destinataire (9 chiffres SN ou E.164)
   * @param sujet - Sujet du message (variable {{1}})
   * @param corps - Corps du message (variable {{2}})
   * @param langue - 'fr' (défaut) ou 'en'
   */
  async sendAdminMessage(
    telephone: string,
    sujet: string,
    corps: string,
    langue: WhatsAppLang = 'fr'
  ): Promise<SendMessageResponse> {
    if (!sujet || !sujet.trim()) {
      throw new Error('WhatsApp: sujet requis pour fayclick_admin_message');
    }
    if (!corps || !corps.trim()) {
      throw new Error('WhatsApp: corps requis pour fayclick_admin_message');
    }
    // ⚠️ Meta refuse les newlines, tabs et 4+ espaces dans les variables (#132018).
    // Sanitize : remplace tout caractère de mise en forme par un espace, puis collapse.
    const sanitize = (txt: string) =>
      txt
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {4,}/g, ' ')
        .trim();
    return this.sendMessage({
      telephone,
      template: 'fayclick_admin_message',
      langue,
      variables: [sanitize(sujet), sanitize(corps)],
    });
  }

  /**
   * Helper spécialisé : notification reset MDP via `fayclick_admin_message`.
   *
   * Le sujet et le corps sont construits côté frontend (template générique).
   * Avantage : pas dépendant de la version EN de fayclick_password_reset
   * (non encore approuvée par Meta).
   *
   * @param telephone - Numéro destinataire (9 chiffres SN ou E.164)
   * @param login - Login utilisateur (affiché dans le corps)
   * @param newPassword - Nouveau mot de passe (affiché dans le corps)
   * @param langue - 'fr' (défaut) ou 'en'
   *
   * ⚠️ Le corps contient le MDP en clair — ne JAMAIS logger l'objet retour
   * complet ni les arguments.
   */
  async sendNewPasswordNotification(
    telephone: string,
    login: string,
    newPassword: string,
    langue: WhatsAppLang = 'fr'
  ): Promise<SendMessageResponse> {
    if (!login || !login.trim()) {
      throw new Error('WhatsApp: login requis');
    }
    if (!newPassword || !newPassword.trim()) {
      throw new Error('WhatsApp: nouveau mot de passe requis');
    }

    const sujet =
      langue === 'fr'
        ? 'Réinitialisation mot de passe FayClick'
        : 'FayClick password reset';

    // ⚠️ Meta interdit les newlines (\n) dans les variables de template
    // (erreur 132018 "issue with the parameters"). On utilise des séparateurs " — " à la place.
    const corps =
      langue === 'fr'
        ? `Votre mot de passe FayClick a été réinitialisé par l'équipe administrative. Login : ${login} — Nouveau mot de passe : ${newPassword} — Connectez-vous immédiatement et changez ce mot de passe depuis vos paramètres.`
        : `Your FayClick password has been reset by the admin team. Login: ${login} — New password: ${newPassword} — Please log in immediately and change this password from your settings.`;

    return this.sendAdminMessage(telephone, sujet, corps, langue);
  }

  /**
   * Helper spécialisé : notification d'abonnement offert via `fayclick_subscription_offered`.
   *
   * Variables Meta :
   *  - {{1}} = nom_structure
   *  - {{2}} = nb_jours
   *  - {{3}} = date_fin (formatée DD/MM/YYYY si reçue en ISO)
   *
   * @param telephone - Numéro destinataire (mobile_om / mobile_wave de la structure)
   * @param nomStructure - Nom de la structure bénéficiaire
   * @param nbJours - Nombre de jours offerts (> 0)
   * @param dateFin - Date de fin (ISO YYYY-MM-DD ou DD/MM/YYYY)
   * @param langue - 'fr' (défaut) ou 'en'
   */
  async sendSubscriptionOfferedNotification(
    telephone: string,
    nomStructure: string,
    nbJours: number,
    dateFin: string,
    langue: WhatsAppLang = 'fr'
  ): Promise<SendMessageResponse> {
    if (!nomStructure || !nomStructure.trim()) {
      throw new Error('WhatsApp: nom de structure requis');
    }
    if (!Number.isFinite(nbJours) || nbJours <= 0) {
      throw new Error('WhatsApp: nombre de jours invalide');
    }
    if (!dateFin || !dateFin.trim()) {
      throw new Error('WhatsApp: date de fin requise');
    }

    // Convertit YYYY-MM-DD → DD/MM/YYYY pour affichage humain.
    const formatDate = (d: string): string => {
      const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
      return d.trim();
    };

    return this.sendMessage({
      telephone,
      template: 'fayclick_subscription_offered',
      langue,
      variables: [nomStructure.trim(), String(nbJours), formatDate(dateFin)],
    });
  }

  /**
   * Helper spécialisé : notification d'achat confirmé au marchand via
   * `achat_confirme_ok` (FR) / `payment_confirmed` (EN).
   *
   * Variables Meta :
   *  - {{1}} = numéro client (téléphone payeur)
   *  - {{2}} = montant formaté (ex: "1500 FCFA")
   *  - {{3}} = mode de paiement libellé (ex: "Orange Money", "Wave", "Free Money")
   *  - {{4}} = TEXTE D'INVITATION uniquement ("Cliquer sur le bouton facture.")
   *           — l'URL réelle du bouton est passée via `button_url_param`,
   *           plus joli côté UX (pas d'URL en clair dans le body).
   *
   * Le bouton "Facture" du template Meta utilise le `button_url_param` pour
   * construire `https://fayclick.com/facture` + suffixe (ex: `?token=...`).
   *
   * @param telephoneMarchand - Numéro WhatsApp du marchand (mobile_om / mobile_wave)
   * @param numeroClient - Téléphone du client payeur (affiché dans le message)
   * @param montant - Montant payé (sera formaté en "X XXX FCFA")
   * @param modePaiement - 'OM' / 'WAVE' / 'FREE' / 'CASH' / autre — converti en libellé humain
   * @param factureUrl - URL complète de la facture publique (https://fayclick.com/facture?token=...)
   * @param langue - 'fr' (défaut, template `achat_confirme_ok`) ou 'en' (`payment_confirmed`)
   */
  async sendPurchaseConfirmedNotification(
    telephoneMarchand: string,
    numeroClient: string,
    montant: number,
    modePaiement: string,
    factureUrl: string,
    langue: WhatsAppLang = 'fr'
  ): Promise<SendMessageResponse> {
    if (!numeroClient || !numeroClient.trim()) {
      throw new Error('WhatsApp: numéro client requis');
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      throw new Error('WhatsApp: montant invalide');
    }
    if (!factureUrl || !factureUrl.trim()) {
      throw new Error('WhatsApp: URL facture requise');
    }

    // Mapping code interne → libellé humain (FR + EN). Conserve le code original
    // s'il n'est pas reconnu plutôt que de planter.
    const modeMap: Record<string, { fr: string; en: string }> = {
      OM: { fr: 'Orange Money', en: 'Orange Money' },
      WAVE: { fr: 'Wave', en: 'Wave' },
      FREE: { fr: 'Free Money', en: 'Free Money' },
      CASH: { fr: 'Espèces', en: 'Cash' },
    };
    const codeUpper = (modePaiement || '').toUpperCase();
    const modeLabel = modeMap[codeUpper]?.[langue] ?? modePaiement;

    // Format montant en français : "1 500 FCFA"
    const montantStr = `${Math.round(montant).toLocaleString('fr-FR')} FCFA`;

    // Texte placé en {{4}} à la place de l'URL en clair.
    const buttonInvitation =
      langue === 'en'
        ? 'Click the Invoice button.'
        : 'Cliquer sur le bouton facture.';

    // Extrait le suffixe `?token=...` (ou tout query string) de l'URL pour
    // alimenter le button_url_param. Si l'URL n'a pas de query string, on
    // passe l'URL entière en fallback (l'API ICELABSOFT validera).
    const queryMatch = factureUrl.match(/\?[^#\s]+/);
    const buttonUrlParam = queryMatch ? queryMatch[0] : factureUrl.trim();

    return this.sendMessage({
      telephone: telephoneMarchand,
      template: langue === 'en' ? 'payment_confirmed' : 'achat_confirme_ok',
      langue,
      variables: [numeroClient.trim(), montantStr, modeLabel, buttonInvitation],
      button_url_param: buttonUrlParam,
    });
  }

  /**
   * Indique si une réponse WhatsApp en échec doit déclencher un fallback
   * (SMS, email, ou affichage manuel à l'admin).
   */
  isFallbackEligible(response: SendMessageResponse): boolean {
    if (response.success) return false;
    return FALLBACK_ERROR_CODES.has(response.error_code ?? '');
  }

  /**
   * Normalise un numéro vers le format E.164 attendu par l'API :
   *  - 9 chiffres commençant par 7 (SN) → +221 + numéro
   *  - Déjà préfixé "+221..." → garde tel quel
   *  - Préfixe "00" international → remplace par "+"
   *  - Sinon renvoie tel quel (validation E.164 faite plus tard)
   */
  private normalizeToE164(phone: string): string {
    if (!phone) return '';
    const trimmed = phone.replace(/\s+/g, '').replace(/[-.()]/g, '');

    // Déjà E.164 valide
    if (trimmed.startsWith('+')) return trimmed;

    // Format international avec 00
    if (trimmed.startsWith('00')) return '+' + trimmed.substring(2);

    // 9 chiffres commençant par 7 (Sénégal : 70/75/76/77/78)
    if (/^7\d{8}$/.test(trimmed)) return '+221' + trimmed;

    // 12 chiffres commençant par 221 (sans le +)
    if (/^221\d{9}$/.test(trimmed)) return '+' + trimmed;

    return trimmed;
  }

  /**
   * Masque un numéro E.164 pour les logs : +221777301221 → +2217*****221
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return '***';
    const start = phone.substring(0, 5);
    const end = phone.substring(phone.length - 3);
    return `${start}*****${end}`;
  }
}

export default WhatsAppMessageService.getInstance();
