/**
 * Routeur OTP Multi-Pays CEDEAO
 * Décide du canal d'envoi (SMS ou Email Gmail) selon le code ISO pays.
 *
 * Règle : code_iso_pays === 'SN' → SMS | sinon → Email Gmail strict
 * Scope MVP : inscription (welcome) + recovery (password reset).
 */

import smsService from './sms.service';
import emailService from './email.service';
import SecurityService from './security.service';
import { isSmsPays } from '@/types/pays';

export type OtpContext = 'registration' | 'recovery';

export interface OtpRouteParams {
  codeIsoPays: string;           // ex: 'SN', 'CI', 'ML'
  phone: string;                 // numéro 7 à 10 chiffres (requis si SN)
  email?: string | null;         // email Gmail (requis si ≠ SN)
  otpCode: string;               // code OTP à 4-5 chiffres
  context: OtpContext;
  structureName?: string;        // pour personnaliser le template welcome (optionnel)
}

export interface OtpRouteResult {
  success: boolean;
  channel: 'sms' | 'email';
  recipient: string;             // numéro ou email masqué (safe pour logs/UI)
}

class OtpRouterService {
  private static instance: OtpRouterService;

  private constructor() {}

  static getInstance(): OtpRouterService {
    if (!this.instance) {
      this.instance = new OtpRouterService();
    }
    return this.instance;
  }

  /**
   * Point d'entrée unique OTP.
   * Route SMS (SN) vs Email (autres pays CEDEAO).
   *
   * @throws Error si paramètres invalides ou canal d'envoi en erreur
   */
  async sendOTP(params: OtpRouteParams): Promise<OtpRouteResult> {
    const { codeIsoPays, phone, email, otpCode, context } = params;

    if (!codeIsoPays) {
      throw new Error('Code ISO pays requis pour router l\'OTP');
    }
    if (!otpCode) {
      throw new Error('Code OTP requis');
    }

    const message = this.buildMessage(context, otpCode);
    const isSenegal = isSmsPays(codeIsoPays);

    if (isSenegal) {
      if (!phone) {
        throw new Error('Numéro de téléphone requis pour OTP SMS (Sénégal)');
      }

      SecurityService.secureLog('log', `📤 [OTP-ROUTER] Canal=SMS pays=SN context=${context}`);
      await smsService.sendDirectSMS(phone, message);

      return {
        success: true,
        channel: 'sms',
        recipient: this.maskPhone(phone),
      };
    }

    // Pays non-SN → Email Gmail strict OBLIGATOIRE
    if (!email) {
      throw new Error(`Email Gmail requis pour les OTP hors Sénégal (pays=${codeIsoPays})`);
    }
    if (!emailService.isValidGmail(email)) {
      throw new Error('Seules les adresses @gmail.com sont acceptées pour les OTP internationaux');
    }

    SecurityService.secureLog('log', `📤 [OTP-ROUTER] Canal=EMAIL pays=${codeIsoPays} context=${context}`);
    await emailService.sendDirectEmail(email, message);

    return {
      success: true,
      channel: 'email',
      recipient: this.maskEmail(email),
    };
  }

  /**
   * Génère le corps du message selon le contexte (FR uniquement au MVP)
   */
  private buildMessage(context: OtpContext, code: string): string {
    switch (context) {
      case 'registration':
        return `Bienvenue sur FayClick ! Votre code de connexion rapide est : ${code}. Utilisez-le pour vous connecter facilement. Ne le partagez pas.`;
      case 'recovery':
        return `Votre code de récupération FayClick : ${code}. Ce code expire dans 10 minutes. Ne le partagez pas.`;
      default:
        return `Votre code FayClick est : ${code}`;
    }
  }

  private maskPhone(phone: string): string {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return cleaned.substring(0, 2) + '****' + cleaned.substring(cleaned.length - 2);
  }

  private maskEmail(email: string): string {
    const [local, domain] = (email || '').split('@');
    if (!local || !domain) return '***';
    return `${local.substring(0, Math.min(2, local.length))}***@${domain}`;
  }
}

export default OtpRouterService.getInstance();
