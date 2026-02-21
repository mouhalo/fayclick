/**
 * Service SMS pour l'envoi de messages
 * Utilisé pour la récupération de mot de passe, OTP inscription et notifications
 *
 * 2 modes d'envoi :
 * - sendDirectSMS() : API REST send_o_sms → envoi IMMÉDIAT (inscription, OTP)
 * - sendNotificationSMS() : PostgreSQL add_pending_sms → file d'attente
 */

import SecurityService from './security.service';
import DatabaseService from './database.service';

// URL de l'API SMS directe (envoi immédiat)
const SMS_API_URL = 'https://api.icelabsoft.com/sms_service/api/send_o_sms';

// Configuration SMS pour l'API PostgreSQL (file d'attente)
const SMS_CONFIG = {
  application: 'sms',
  senderName: 'ICELABOSOFT',
  clientName: 'FAYCLICK'
};

// Types pour les réponses SMS
interface SMSRequest {
  numtel: string;
  message: string;
  sender: string;
}

interface SMSResponse {
  success: boolean;
  message: string;
  details?: {
    balance_remaining: number;
    delivery_info: any;
  };
}

class SMSService {
  private static instance: SMSService;

  private constructor() {}

  static getInstance(): SMSService {
    if (!this.instance) {
      this.instance = new SMSService();
    }
    return this.instance;
  }

  /**
   * Envoie un SMS pour la récupération de mot de passe
   * Utilise la fonction PostgreSQL add_pending_sms() via l'application 'sms'
   * IMPORTANT: Ne jamais logger le code temporaire pour des raisons de sécurité
   */
  async sendPasswordResetSMS(phoneNumber: string, tempCode: string): Promise<SMSResponse> {
    try {
      // Validation du numéro de téléphone
      const cleanPhone = this.formatPhoneNumber(phoneNumber);
      if (!this.isValidSenegalPhone(cleanPhone)) {
        throw new Error('Numéro de téléphone invalide');
      }

      // Construction du message SMS
      const message = `Pour reinitialiser votre ancien mot de passe, confirmer avant 2 minutes avec ce mot de passe: ${tempCode}`;

      // Log sécurisé (sans le code)
      SecurityService.secureLog('log', `📱 [SMS] Envoi SMS de récupération au numéro: ${this.maskPhoneNumber(cleanPhone)}`);

      // Appel de la fonction PostgreSQL add_pending_sms
      const result = await this.sendSMSViaPSQL(cleanPhone, message);

      if (result && result.id) {
        SecurityService.secureLog('log', `✅ [SMS] SMS ajouté en base avec ID: ${result.id}, date: ${result.date_create}`);
        return {
          success: true,
          message: 'SMS envoyé avec succès',
          details: {
            sms_id: result.id,
            numtel: result.numtel,
            date_create: result.date_create
          }
        };
      } else {
        throw new Error('Aucune réponse valide de la base de données');
      }

    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [SMS] Erreur envoi SMS: ${error.message}`);
      throw new Error(`Impossible d'envoyer le SMS: ${error.message}`);
    }
  }

  /**
   * Envoie un SMS de notification générique
   * Utilise la fonction PostgreSQL add_pending_sms() via l'application 'sms'
   */
  async sendNotificationSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const cleanPhone = this.formatPhoneNumber(phoneNumber);
      if (!this.isValidSenegalPhone(cleanPhone)) {
        throw new Error('Numéro de téléphone invalide');
      }

      SecurityService.secureLog('log', `📱 [SMS] Envoi SMS de notification au numéro: ${this.maskPhoneNumber(cleanPhone)}`);

      // Appel de la fonction PostgreSQL add_pending_sms
      const result = await this.sendSMSViaPSQL(cleanPhone, message);

      if (result && result.id) {
        SecurityService.secureLog('log', `✅ [SMS] SMS ajouté en base avec ID: ${result.id}`);
        return {
          success: true,
          message: 'SMS envoyé avec succès',
          details: {
            sms_id: result.id,
            numtel: result.numtel,
            date_create: result.date_create
          }
        };
      } else {
        throw new Error('Aucune réponse valide de la base de données');
      }

    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [SMS] Erreur: ${error.message}`);
      throw new Error(`Erreur envoi SMS: ${error.message}`);
    }
  }

  /**
   * Envoie un SMS immédiatement via l'API REST send_o_sms
   * Utilisé pour : OTP inscription, codes urgents
   * Contrairement à sendNotificationSMS qui met en file d'attente PostgreSQL
   */
  async sendDirectSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const cleanPhone = this.formatPhoneNumber(phoneNumber);
      if (!this.isValidPhone(cleanPhone)) {
        throw new Error('Numéro de téléphone invalide');
      }

      SecurityService.secureLog('log', `📱 [SMS-DIRECT] Envoi SMS immédiat au: ${this.maskPhoneNumber(cleanPhone)}`);

      const response = await fetch(SMS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numtel: cleanPhone,
          message: message,
          sender: SMS_CONFIG.senderName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        SecurityService.secureLog('log', `✅ [SMS-DIRECT] SMS envoyé avec succès`);
        return { success: true, message: 'SMS envoyé avec succès' };
      } else {
        throw new Error(data.message || 'Erreur API SMS');
      }
    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [SMS-DIRECT] Erreur: ${error.message}`);
      throw new Error(`Erreur envoi SMS direct: ${error.message}`);
    }
  }

  /**
   * Formate un numéro de téléphone sénégalais
   */
  private formatPhoneNumber(phone: string): string {
    // Retirer tous les espaces et caractères non numériques
    let cleaned = phone.replace(/\D/g, '');
    
    // Si le numéro commence par 221, le retirer
    if (cleaned.startsWith('221')) {
      cleaned = cleaned.substring(3);
    }
    
    // Si le numéro commence par +221, le retirer
    if (phone.startsWith('+221')) {
      cleaned = phone.substring(4).replace(/\D/g, '');
    }
    
    return cleaned;
  }

  /**
   * Valide un numéro de téléphone (Sénégal, Côte d'Ivoire, Mali)
   * Sénégal/CI: 9-10 chiffres, Mali: 7-8 chiffres
   */
  private isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 7 && cleanPhone.length <= 10;
  }

  /**
   * @deprecated Alias pour isValidPhone - Conservé pour compatibilité interne
   */
  private isValidSenegalPhone(phone: string): boolean {
    return this.isValidPhone(phone);
  }

  /**
   * Masque un numéro de téléphone pour les logs
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return '***';
    return phone.substring(0, 2) + '****' + phone.substring(phone.length - 2);
  }

  /**
   * Génère un message de récupération de mot de passe
   */
  generatePasswordResetMessage(code: string): string {
    return `Pour reinitialiser votre ancien mot de passe, confirmer avant 2 minutes avec ce mot de passe: ${code}`;
  }

  /**
   * Génère un message avec le nouveau mot de passe
   */
  generateNewPasswordMessage(newPassword: string): string {
    return `Votre nouveau mot de passe FayClick est: ${newPassword}. Connectez-vous et changez-le immédiatement pour votre sécurité.`;
  }

  /**
   * Envoie un SMS via l'API PostgreSQL en utilisant add_pending_sms
   * @private
   */
  private async sendSMSViaPSQL(phoneNumber: string, message: string): Promise<any> {
    try {
      // Utilisation de l'instance DatabaseService (déjà exportée comme instance)
      const dbService = DatabaseService;
      
      // Échapper les quotes dans les paramètres
      const escapedSender = SMS_CONFIG.senderName.replace(/'/g, "''");
      const escapedClient = SMS_CONFIG.clientName.replace(/'/g, "''");
      const escapedPhone = phoneNumber.replace(/'/g, "''");
      const escapedMessage = message.replace(/'/g, "''");
      
      // Construction de la requête pour add_pending_sms
      const query = `SELECT * FROM add_pending_sms('${escapedSender}'::varchar, '${escapedClient}'::varchar, '${escapedPhone}'::varchar, '${escapedMessage}'::varchar);`;
      
      SecurityService.secureLog('log', `📱 [SMS-PSQL] Ajout SMS en base pour: ${this.maskPhoneNumber(phoneNumber)}`);
      
      // Utilisation directe de envoyerRequeteApi avec l'application 'sms'
      const results = await dbService.envoyerRequeteApi(SMS_CONFIG.application, query);
      
      if (results && results.length > 0) {
        const response = results[0];
        
        // Gestion de la structure de réponse (similaire aux autres fonctions)
        let data;
        if (response.add_pending_sms) {
          const functionResult = response.add_pending_sms;
          data = typeof functionResult === 'string' ? JSON.parse(functionResult) : functionResult;
        } else {
          data = typeof response === 'string' ? JSON.parse(response) : response;
        }
        
        return data;
      }
      
      throw new Error('Aucune réponse de la base de données');
      
    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [SMS-PSQL] Erreur: ${error.message}`);
      throw error;
    }
  }
}

export default SMSService.getInstance();