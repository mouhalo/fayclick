/**
 * Routeur OTP Multi-Pays CEDEAO — Cascade 3 canaux
 *
 * Logique de cascade :
 *   1. Sénégal (+221)        → SMS  → fallback Email (si gmail dispo)
 *   2. Autres pays           → WhatsApp → fallback Email (si gmail dispo)
 *
 * Scope : inscription (welcome) + recovery (password reset).
 * Langue template WhatsApp : déduite du pays (anglophones GH/NG/LR/SL/CV → en).
 */

import smsService from './sms.service';
import emailService from './email.service';
import whatsappService, { WhatsAppResponse } from './whatsapp.service';
import SecurityService from './security.service';
import {
  isSmsPays,
  toE164Phone,
  getLangueForPays,
  getPaysByCode,
} from '@/types/pays';

export type OtpContext = 'registration' | 'recovery';
export type OtpChannel = 'sms' | 'whatsapp' | 'email';

export interface OtpRouteParams {
  codeIsoPays: string;           // ex: 'SN', 'CI', 'ML'
  phone: string;                 // numéro local (7 à 10 chiffres selon pays)
  email?: string | null;         // email Gmail (fallback pour tous)
  otpCode: string;               // code OTP 4-5 chiffres
  context: OtpContext;
  structureName?: string;        // réservé futur (personnalisation template)
}

export interface OtpRouteResult {
  success: boolean;
  channel: OtpChannel;
  recipient: string;             // numéro ou email masqué
  fallbackUsed?: boolean;        // true si on a dû basculer sur Email
}

class OtpRouterService {
  private static instance: OtpRouterService;

  private constructor() {}

  static getInstance(): OtpRouterService {
    if (!this.instance) this.instance = new OtpRouterService();
    return this.instance;
  }

  /**
   * Point d'entrée unique OTP — applique la cascade SMS/WhatsApp → Email.
   *
   * @throws Error si aucun canal ne peut aboutir (pas d'email disponible
   *   ou tous les canaux échouent)
   */
  async sendOTP(params: OtpRouteParams): Promise<OtpRouteResult> {
    const { codeIsoPays, phone, email, otpCode, context } = params;

    if (!codeIsoPays) throw new Error("Code ISO pays requis pour router l'OTP");
    if (!otpCode) throw new Error('Code OTP requis');
    if (!getPaysByCode(codeIsoPays)) {
      throw new Error(`Pays non supporté : ${codeIsoPays}`);
    }

    const message = this.buildMessage(context, otpCode);
    const hasValidEmail = !!email && emailService.isValidGmail(email);

    // ═════════════ Canal primaire selon pays ═════════════
    if (isSmsPays(codeIsoPays)) {
      // SÉNÉGAL → SMS puis fallback Email
      if (!phone) throw new Error('Numéro de téléphone requis pour OTP SMS');

      try {
        SecurityService.secureLog('log', `📤 [OTP-ROUTER] SN→SMS context=${context}`);
        await smsService.sendDirectSMS(phone, message);
        return { success: true, channel: 'sms', recipient: this.maskPhone(phone) };
      } catch (smsErr) {
        SecurityService.secureLog(
          'warn',
          `⚠️ [OTP-ROUTER] SMS failed → fallback Email: ${(smsErr as Error).message}`
        );
        if (!hasValidEmail) {
          throw new Error(
            "Envoi SMS impossible et aucun email Gmail valide pour fallback"
          );
        }
        return await this.sendEmailFallback(email!, message, true);
      }
    }

    // PAYS ≠ SN → WhatsApp puis fallback Email
    if (!phone) throw new Error('Numéro de téléphone requis pour OTP WhatsApp');

    const e164 = toE164Phone(phone, codeIsoPays);
    const langue = getLangueForPays(codeIsoPays);

    if (!e164) {
      throw new Error(`Impossible de formater le numéro pour ${codeIsoPays}`);
    }

    let wa: WhatsAppResponse | null = null;
    try {
      SecurityService.secureLog(
        'log',
        `📤 [OTP-ROUTER] ${codeIsoPays}→WhatsApp(${langue}) context=${context}`
      );
      wa = await whatsappService.sendDirectWhatsApp({
        telephone: e164,
        code: otpCode,
        langue,
      });

      if (wa.success) {
        return {
          success: true,
          channel: 'whatsapp',
          recipient: wa.recipient ?? this.maskE164(e164),
        };
      }
    } catch (waErr) {
      SecurityService.secureLog(
        'warn',
        `⚠️ [OTP-ROUTER] WhatsApp exception: ${(waErr as Error).message}`
      );
      // On passe au fallback ci-dessous
    }

    // WhatsApp échec (erreur métier ou exception réseau) → fallback Email
    const fallbackAllowed = !wa || whatsappService.isFallbackEligible(wa);
    if (!fallbackAllowed) {
      throw new Error(
        `WhatsApp refusé (code=${wa?.error_code}) : ${wa?.message ?? 'erreur inconnue'}`
      );
    }
    if (!hasValidEmail) {
      throw new Error(
        "WhatsApp indisponible et aucun email Gmail valide pour fallback"
      );
    }

    SecurityService.secureLog(
      'log',
      `🔁 [OTP-ROUTER] ${codeIsoPays}→Email (fallback après WhatsApp ${wa?.error_code ?? 'exception'})`
    );
    return await this.sendEmailFallback(email!, message, true);
  }

  // ═════════════ Helpers privés ═════════════

  private async sendEmailFallback(
    email: string,
    message: string,
    fallbackUsed: boolean
  ): Promise<OtpRouteResult> {
    await emailService.sendDirectEmail(email, message);
    return {
      success: true,
      channel: 'email',
      recipient: this.maskEmail(email),
      fallbackUsed,
    };
  }

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

  private maskE164(e164: string): string {
    if (!e164 || e164.length < 6) return '***';
    return e164.substring(0, 4) + '****' + e164.substring(e164.length - 3);
  }

  private maskEmail(email: string): string {
    const [local, domain] = (email || '').split('@');
    if (!local || !domain) return '***';
    return `${local.substring(0, Math.min(2, local.length))}***@${domain}`;
  }
}

export default OtpRouterService.getInstance();
