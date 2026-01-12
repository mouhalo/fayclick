/**
 * Service pour la gestion des retraits Wallet (OM, WAVE, FREE)
 * Utilise l'API send_cash et la fonction PostgreSQL add_retrait_marchand
 */

import database from '@/services/database.service';

// URLs des APIs
const PAY_SERVICES_URL = 'https://api.icelabsoft.com/pay_services/api/send_cash';
const SMS_API_URL = 'https://api.icelabsoft.com/sms_service/api/send_o_sms';

// Types pour les retraits
export interface RetraitParams {
  idStructure: number;
  telephone: string;
  montant: number;
  methode: 'OM' | 'WAVE' | 'FREE';
  nomStructure: string;
}

export interface SendCashResponse {
  success: boolean;
  detail?: {
    reference: string;
    transactionId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    payment_uuid: string;
    persistence_status: 'SAVED' | 'ERROR';
  };
  error?: string;
}

export interface RetraitResult {
  success: boolean;
  message: string;
  versement_id?: number;
  transactionId?: string;
}

export interface OTPSession {
  code: string;
  expiresAt: number;
  attempts: number;
}

class RetraitService {
  private otpSessions: Map<string, OTPSession> = new Map();
  private readonly OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_OTP_ATTEMPTS = 3;

  /**
   * Génère un code OTP à 5 chiffres
   */
  private generateOTP(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Génère une clé de session OTP unique
   */
  private getSessionKey(idStructure: number, methode: string): string {
    return `${idStructure}-${methode}`;
  }

  /**
   * Envoie un OTP par SMS pour valider le retrait
   * Utilise l'API directe send_o_sms pour l'envoi immédiat
   */
  async sendOTP(
    idStructure: number,
    telephone: string,
    methode: 'OM' | 'WAVE' | 'FREE',
    montant: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const code = this.generateOTP();
      const sessionKey = this.getSessionKey(idStructure, methode);

      console.log('📝 [RETRAIT] Création session OTP:', {
        sessionKey,
        code,
        idStructure,
        methode,
        telephone: telephone.slice(0, 2) + '****' + telephone.slice(-2)
      });

      // Stocker la session OTP
      this.otpSessions.set(sessionKey, {
        code,
        expiresAt: Date.now() + this.OTP_EXPIRY_MS,
        attempts: 0
      });

      console.log('✅ [RETRAIT] Session OTP créée. Sessions actives:', Array.from(this.otpSessions.keys()));

      // Construire le message SMS
      const methodeName = methode === 'OM' ? 'Orange Money' : methode === 'WAVE' ? 'Wave' : 'Free Money';
      const montantFormate = montant.toLocaleString('fr-FR');
      const message = `Entrez le code : ${code} pour valider le retrait ${methodeName} de ${montantFormate} FCFA. Ce code est valide pour 2 minutes.`;

      // Envoyer le SMS via l'API directe
      const response = await fetch(SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numtel: telephone,
          message: message,
          sender: 'ICELABOSOFT',
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`📱 [RETRAIT] OTP envoyé au ${telephone.slice(0, 2)}****${telephone.slice(-2)}`);
        return {
          success: true,
          message: 'Code de confirmation envoyé par SMS'
        };
      } else {
        console.error('❌ [RETRAIT] Échec envoi SMS:', data.message);
        // Supprimer la session OTP car le SMS n'a pas été envoyé
        this.otpSessions.delete(sessionKey);
        return {
          success: false,
          message: data.message || 'Échec de l\'envoi du SMS'
        };
      }
    } catch (error) {
      console.error('❌ [RETRAIT] Erreur envoi OTP:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur envoi SMS'
      };
    }
  }

  /**
   * Vérifie le code OTP saisi
   */
  verifyOTP(idStructure: number, methode: string, code: string): { valid: boolean; message: string } {
    const sessionKey = this.getSessionKey(idStructure, methode);
    const session = this.otpSessions.get(sessionKey);

    console.log('🔍 [RETRAIT] Vérification OTP:', {
      sessionKey,
      codeEntre: code,
      sessionExiste: !!session,
      sessionsActives: Array.from(this.otpSessions.keys())
    });

    if (!session) {
      console.error('❌ [RETRAIT] Aucune session OTP trouvée pour:', sessionKey);
      return { valid: false, message: 'Aucun code en attente. Veuillez redemander un code.' };
    }

    console.log('📋 [RETRAIT] Session trouvée:', {
      codeAttendu: session.code,
      expiresAt: new Date(session.expiresAt).toLocaleTimeString(),
      attempts: session.attempts,
      estExpire: Date.now() > session.expiresAt
    });

    // Vérifier expiration
    if (Date.now() > session.expiresAt) {
      this.otpSessions.delete(sessionKey);
      console.error('❌ [RETRAIT] Code OTP expiré');
      return { valid: false, message: 'Code expiré. Veuillez redemander un nouveau code.' };
    }

    // Vérifier tentatives
    if (session.attempts >= this.MAX_OTP_ATTEMPTS) {
      this.otpSessions.delete(sessionKey);
      console.error('❌ [RETRAIT] Trop de tentatives');
      return { valid: false, message: 'Trop de tentatives. Veuillez redemander un nouveau code.' };
    }

    // Incrémenter les tentatives
    session.attempts++;

    // Vérifier le code
    if (session.code !== code) {
      const remaining = this.MAX_OTP_ATTEMPTS - session.attempts;
      console.error('❌ [RETRAIT] Code incorrect:', { attendu: session.code, recu: code });
      return {
        valid: false,
        message: remaining > 0
          ? `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
          : 'Code incorrect. Veuillez redemander un nouveau code.'
      };
    }

    // Code valide - supprimer la session
    console.log('✅ [RETRAIT] Code OTP valide ! Suppression de la session');
    this.otpSessions.delete(sessionKey);
    return { valid: true, message: 'Code vérifié avec succès' };
  }

  /**
   * Formate le motif pour l'API send_cash
   * Format: "Retrait {methode} KALPE {AAMMJJHHMMSS}"
   */
  private formatMotif(methode: string): string {
    const now = new Date();
    const timestamp =
      now.getFullYear().toString().slice(-2) +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');

    return `Retrait ${methode} KALPE ${timestamp}`;
  }

  /**
   * Appelle l'API send_cash pour effectuer le retrait
   */
  async sendCash(params: RetraitParams): Promise<SendCashResponse> {
    try {
      // Déterminer le service selon la méthode
      const pservicename = params.methode === 'WAVE' ? 'INTOUCH' : 'OFMS';

      const body = {
        pservicename,
        app_name: 'FAYCLICK',
        pmethode: params.methode === 'FREE' ? 'OM' : params.methode, // FREE utilise OM comme pmethode
        ptelnumber: params.telephone,
        pamount: params.montant,
        pmotif: this.formatMotif(params.methode),
        pnomstructure: params.nomStructure
      };

      console.log('💸 [RETRAIT] Appel API send_cash:', {
        url: PAY_SERVICES_URL,
        methode: params.methode,
        telephone: params.telephone.slice(0, 2) + '****' + params.telephone.slice(-2),
        montant: params.montant
      });

      const response = await fetch(PAY_SERVICES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.detail?.status === 'SUCCESS') {
        console.log('✅ [RETRAIT] send_cash SUCCESS:', data.detail.transactionId);
        return {
          success: true,
          detail: data.detail
        };
      } else {
        console.error('❌ [RETRAIT] send_cash FAILED:', data);
        return {
          success: false,
          error: data.message || data.error || 'Échec du retrait'
        };
      }
    } catch (error) {
      console.error('❌ [RETRAIT] Erreur API send_cash:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion'
      };
    }
  }

  /**
   * Enregistre le retrait en base de données via add_retrait_marchand
   */
  async saveRetrait(
    idStructure: number,
    transactionId: string,
    telephone: string,
    montant: number,
    methode: 'OM' | 'WAVE' | 'FREE'
  ): Promise<RetraitResult> {
    try {
      // Échapper les valeurs
      const escapedTransactionId = transactionId.replace(/'/g, "''");
      const escapedPhone = telephone.replace(/'/g, "''");
      const methodeDb = methode === 'FREE' ? 'OM' : methode; // FREE enregistré comme OM

      const query = `SELECT * FROM public.add_retrait_marchand(
        ${idStructure},
        '${escapedTransactionId}',
        '${escapedPhone}',
        ${montant},
        '${methodeDb}',
        0
      );`;

      console.log('💾 [RETRAIT] Sauvegarde en base:', { idStructure, transactionId, montant, methode });

      const results = await database.query(query);

      if (results && results.length > 0) {
        const result = results[0];
        const data = result.add_retrait_marchand || result;

        console.log('✅ [RETRAIT] Sauvegarde réussie:', data);

        return {
          success: true,
          message: data.message || 'Retrait enregistré avec succès',
          versement_id: data.versement_id,
          transactionId
        };
      }

      return {
        success: false,
        message: 'Aucune réponse de la base de données'
      };
    } catch (error) {
      console.error('❌ [RETRAIT] Erreur sauvegarde:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de sauvegarde'
      };
    }
  }

  /**
   * Effectue le retrait complet : API send_cash + sauvegarde en base
   */
  async effectuerRetrait(params: RetraitParams): Promise<RetraitResult> {
    console.log('🚀 [RETRAIT] effectuerRetrait appelé avec:', {
      idStructure: params.idStructure,
      telephone: params.telephone.slice(0, 2) + '****' + params.telephone.slice(-2),
      montant: params.montant,
      methode: params.methode,
      nomStructure: params.nomStructure
    });

    // Étape 1: Appeler l'API send_cash
    console.log('📡 [RETRAIT] Appel API send_cash...');
    const sendCashResult = await this.sendCash(params);
    console.log('📡 [RETRAIT] Résultat send_cash:', sendCashResult);

    if (!sendCashResult.success) {
      return {
        success: false,
        message: sendCashResult.error || 'Échec du retrait'
      };
    }

    // Étape 2: Sauvegarder en base si SUCCESS
    if (sendCashResult.detail?.status === 'SUCCESS' && sendCashResult.detail?.persistence_status === 'SAVED') {
      const saveResult = await this.saveRetrait(
        params.idStructure,
        sendCashResult.detail.transactionId,
        params.telephone,
        params.montant,
        params.methode
      );

      return saveResult;
    }

    return {
      success: false,
      message: 'Statut de paiement non confirmé'
    };
  }

  /**
   * Valide un numéro de téléphone sénégalais
   */
  validatePhone(phone: string, methode: 'OM' | 'WAVE' | 'FREE'): { valid: boolean; message: string } {
    // Nettoyer le numéro
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length !== 9) {
      return { valid: false, message: 'Le numéro doit contenir 9 chiffres' };
    }

    const prefix = cleaned.slice(0, 2);

    // Validation selon la méthode
    if (methode === 'OM' || methode === 'FREE') {
      if (!['77', '78'].includes(prefix)) {
        return { valid: false, message: 'Numéro Orange Money invalide (doit commencer par 77 ou 78)' };
      }
    } else if (methode === 'WAVE') {
      if (!['77', '78', '76', '70', '75'].includes(prefix)) {
        return { valid: false, message: 'Numéro Wave invalide' };
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * Valide le montant du retrait
   */
  validateMontant(montant: number, soldeDisponible: number): { valid: boolean; message: string } {
    if (montant <= 0) {
      return { valid: false, message: 'Le montant doit être supérieur à 0' };
    }

    if (montant > soldeDisponible) {
      return { valid: false, message: `Solde insuffisant. Disponible: ${soldeDisponible.toLocaleString('fr-FR')} FCFA` };
    }

    // Montant minimum de retrait (généralement 100 FCFA)
    if (montant < 100) {
      return { valid: false, message: 'Le montant minimum de retrait est de 100 FCFA' };
    }

    return { valid: true, message: '' };
  }
}

export const retraitService = new RetraitService();
export default retraitService;
