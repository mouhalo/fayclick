/**
 * Service Email pour l'envoi de messages (OTP, notifications)
 * Utilisé en remplacement du SMS pour les pays CEDEAO hors Sénégal
 *
 * Mode d'envoi unique :
 * - sendDirectEmail() : API REST ICELABSOFT email_sender → envoi IMMÉDIAT
 *
 * Contrainte métier : UNIQUEMENT les adresses @gmail.com sont acceptées
 * (décision produit MVP — voir PRD multi-pays CEDEAO).
 */

import SecurityService from './security.service';

// URL de l'API Email directe (envoi immédiat)
const EMAIL_API_URL = 'https://api.icelabsoft.com/email_sender/api/send';

// Regex Gmail strict : aucun alias suffixe, doit finir par @gmail.com
const GMAIL_STRICT_REGEX = /^[^\s@]+@gmail\.com$/i;

// Types pour les requêtes/réponses Email
export interface EmailPayload {
  email: string;
  message: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  recipient?: string;
}

class EmailService {
  private static instance: EmailService;

  private constructor() {}

  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  /**
   * Envoie un email immédiatement via l'API REST ICELABSOFT
   * Utilisé pour : OTP inscription, recovery login (pays ≠ SN)
   *
   * @throws Error si email non Gmail ou réponse API KO
   */
  async sendDirectEmail(email: string, message: string): Promise<EmailResponse> {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!this.isValidGmail(cleanEmail)) {
        throw new Error('Email invalide : seules les adresses @gmail.com sont acceptées');
      }

      if (!message || message.trim().length === 0) {
        throw new Error('Message requis');
      }

      SecurityService.secureLog('log', `📧 [EMAIL] Envoi email immédiat à: ${this.maskEmail(cleanEmail)}`);

      const payload: EmailPayload = {
        email: cleanEmail,
        message: message,
      };

      const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        SecurityService.secureLog('log', `✅ [EMAIL] Email envoyé avec succès (${data.timestamp ?? 'no-ts'})`);
        return {
          success: true,
          message: data.message ?? 'Email envoyé avec succès',
          timestamp: data.timestamp,
          recipient: data.recipient ?? cleanEmail,
        };
      } else {
        throw new Error(data.message || 'Erreur API Email');
      }
    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [EMAIL] Erreur: ${error.message}`);
      throw new Error(`Erreur envoi email: ${error.message}`);
    }
  }

  /**
   * Valide strictement un email Gmail (xxx@gmail.com)
   * Exposé pour permettre la validation en amont (UI, otpRouter, registration)
   */
  isValidGmail(email: string): boolean {
    if (!email) return false;
    return GMAIL_STRICT_REGEX.test(email.trim().toLowerCase());
  }

  /**
   * Masque une adresse email pour les logs (RGPD/sécurité)
   * Ex: johndoe@gmail.com → jo***@gmail.com
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.substring(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
}

// Export instance unique (pattern conforme à sms.service.ts)
export default EmailService.getInstance();
