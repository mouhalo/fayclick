/**
 * Service pour la gestion des paiements par wallet
 * Support pour Orange Money, Wave et Free Money
 */

import {
  PaymentMethod,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  PaymentStatus,
  WALLET_SERVICE_MAP,
  PaymentContext
} from '@/types/payment-wallet';

class PaymentWalletService {
  private readonly API_BASE_URL = 'https://api.icelabsoft.com/pay_services/api';
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingAbortController: AbortController | null = null;

  // 🎯 Session de paiement - État global pour éviter la double initialisation
  private currentPaymentSession: {
    uuid: string;
    factureId: string;
    isActive: boolean;
    createdAt: number;
  } | null = null;

  // 🚫 Mutex global pour bloquer les créations simultanées
  private isCreatingPayment: boolean = false;

  /**
   * Vérifier si une session de paiement est active pour cette facture
   */
  private hasActivePaymentSession(factureId: string): boolean {
    if (!this.currentPaymentSession) return false;

    const isForSameFacture = this.currentPaymentSession.factureId === factureId;
    const isStillActive = this.currentPaymentSession.isActive;
    const isRecent = (Date.now() - this.currentPaymentSession.createdAt) < 300000; // 5 minutes max

    return isForSameFacture && isStillActive && isRecent;
  }

  /**
   * Créer une session de paiement
   */
  private createPaymentSession(uuid: string, factureId: string): void {
    // 🛡️ Vérifier si on écrase une session existante (problème architectural)
    if (this.currentPaymentSession?.isActive) {
      console.warn('⚠️ [SESSION] ÉCRASEMENT session existante!', {
        ancienne: this.currentPaymentSession,
        nouvelle: { uuid, factureId }
      });
    }

    console.log('🎯 [SESSION] Création session paiement:', { uuid, factureId });
    this.currentPaymentSession = {
      uuid,
      factureId,
      isActive: true,
      createdAt: Date.now()
    };
  }

  /**
   * Terminer une session de paiement
   */
  private endPaymentSession(reason: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'MANUAL'): void {
    if (this.currentPaymentSession) {
      console.log(`🏁 [SESSION] Fin session paiement: ${reason}`, this.currentPaymentSession.uuid);
      this.currentPaymentSession = null;
    }
  }

  /**
   * Obtenir l'UUID de la session active
   */
  getActiveSessionUUID(): string | null {
    return this.currentPaymentSession?.isActive ? this.currentPaymentSession.uuid : null;
  }

  /**
   * Créer une demande de paiement avec protection anti-double initialisation
   */
  async createPayment(
    method: Exclude<PaymentMethod, 'CASH'>,
    context: PaymentContext
  ): Promise<CreatePaymentResponse> {
    // 🔒 MUTEX - Bloquer si création en cours
    if (this.isCreatingPayment) {
      console.error('🚫 [MUTEX] Création de paiement déjà en cours - REJET');
      throw new Error('Une création de paiement est déjà en cours. Veuillez attendre.');
    }

    try {
      this.isCreatingPayment = true; // 🔒 Verrouiller
      const factureId = context.facture.id_facture.toString();

      // 🛡️ PROTECTION RENFORCÉE - Vérifier s'il y a déjà une session active
      if (this.hasActivePaymentSession(factureId)) {
        console.error('🚫 [SESSION] REJET - Session déjà active pour facture', factureId);
        console.error('📋 [SESSION] UUID existant:', this.currentPaymentSession!.uuid);
        console.error('🏗️ [SESSION] Problème architectural: Multiple instances de ModalPaiementQRCode');

        // Récupérer les infos de la session existante pour debug
        const existingSession = this.currentPaymentSession!;
        const ageInSeconds = Math.floor((Date.now() - existingSession.createdAt) / 1000);

        console.error('🕒 [SESSION] Session existante:', {
          uuid: existingSession.uuid,
          factureId: existingSession.factureId,
          age: `${ageInSeconds}s`,
          isActive: existingSession.isActive
        });

        // Retourner l'UUID existant pour continuer le polling sur la bonne session
        return {
          uuid: existingSession.uuid,
          telephone: context.facture.tel_client,
          status: 'PROCESSING',
          service: method,
          qrCode: 'session-active', // Marqueur pour modal QR
        };
      }
      const request: CreatePaymentRequest = {
        pAppName: 'FAYCLICK',
        pMethode: method,
        pReference: context.facture.num_facture,
        pClientTel: context.facture.tel_client,
        pMontant: context.montant_acompte,
        pServiceName: WALLET_SERVICE_MAP[method],
        pNomClient: context.facture.nom_client,
        pnom_structure: context.facture.nom_structure || 'FAYCLICK',
      };

      console.log('🔄 Création de paiement wallet:', {
        method,
        facture: context.facture.num_facture,
        montant: context.montant_acompte
      });

      const response = await fetch(`${this.API_BASE_URL}/add_payement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: CreatePaymentResponse = await response.json();

      console.log('✅ Paiement créé:', {
        uuid: data.uuid,
        status: data.status,
        hasQR: !!data.qrCode
      });

      // 🎯 Créer une session de paiement pour cette facture
      this.createPaymentSession(data.uuid, factureId);

      return data;
    } catch (error) {
      console.error('❌ Erreur création paiement:', error);
      throw new Error('Impossible de créer la demande de paiement');
    } finally {
      this.isCreatingPayment = false; // 🔓 Déverrouiller TOUJOURS
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(uuid: string): Promise<PaymentStatusResponse> {
    try {
      console.log('🔍 Vérification statut pour UUID:', uuid);
      
      const response = await fetch(`${this.API_BASE_URL}/payment_status/${uuid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Réponse HTTP non-ok:', response.status);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: PaymentStatusResponse = await response.json();
      
      // Log détaillé de la réponse complète
      console.log('📦 Réponse complète du statut:', JSON.stringify(data, null, 2));
      
      return data;
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      throw new Error('Impossible de vérifier le statut du paiement');
    }
  }

  /**
   * Démarrer le polling du statut de paiement
   * @param uuid - UUID du paiement
   * @param onStatusUpdate - Callback appelé à chaque mise à jour
   * @param timeout - Timeout en millisecondes (défaut: 120000ms = 2 minutes)
   */
  startPolling(
    uuid: string,
    onStatusUpdate: (status: PaymentStatus, data?: PaymentStatusResponse) => void,
    timeout: number = 120000
  ): void {
    // Nettoyer le polling précédent si existant
    this.stopPolling();

    console.log('🔄 Démarrage du polling pour:', uuid);

    // Créer un AbortController pour gérer l'annulation
    this.pollingAbortController = new AbortController();

    // Timer pour le timeout
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Timeout du polling atteint');
      this.stopPolling();
      this.endPaymentSession('TIMEOUT'); // 🏁 Terminer la session
      onStatusUpdate('TIMEOUT');
    }, timeout);

    // Fonction de polling
    const pollStatus = async () => {
      try {
        if (this.pollingAbortController?.signal.aborted) {
          return;
        }

        const response = await this.checkPaymentStatus(uuid);

        console.log('📊 Statut reçu:', response.data?.statut || response.status);

        console.log('📊 Analyse du statut:', {
          apiStatus: response.data?.statut,
          hasData: !!response.data,
          completedAt: response.data?.completed_at,
          originalStatus: response.data?.metadata?.original_status,
          referenceExterne: response.data?.reference_externe,
          numTransaction: response.data?.metadata?.intouch_response?.numTransaction
        });

        // Vérifier le statut selon la nouvelle structure
        // IMPORTANT: response.status === 'success' signifie que l'API a répondu correctement
        // Ce n'est PAS le statut du paiement lui-même
        
        if (response.status === 'success' && response.data) {
          // Vérifier si le paiement a échoué
          // Si original_status est FAILED, c'est un échec confirmé
          if (response.data.metadata?.original_status === 'FAILED') {
            console.log('❌ Paiement détecté comme ÉCHOUÉ (original_status: FAILED)');
            clearTimeout(timeoutId);
            this.stopPolling();
            this.endPaymentSession('FAILED'); // 🏁 Terminer la session
            onStatusUpdate('FAILED', response);
            return;
          }
          
          // Vérifier si le paiement est complété avec succès
          // Un paiement est réussi si:
          // 1. completed_at existe (transaction terminée)
          // 2. reference_externe existe (numéro de transaction attribué)
          // 3. original_status n'est PAS 'FAILED'
          if (response.data.completed_at && 
              response.data.reference_externe && 
              response.data.metadata?.original_status !== 'FAILED') {
            console.log('✅ Paiement détecté comme RÉUSSI');
            console.log('   - Reference:', response.data.reference_externe);
            console.log('   - UUID:', response.data.uuid);
            clearTimeout(timeoutId);
            this.stopPolling();
            this.endPaymentSession('SUCCESS'); // 🏁 Terminer la session
            onStatusUpdate('COMPLETED', response);
            return;
          }

          // Si on a un statut explicite (ancien format)
          if (response.data.statut === 'COMPLETED') {
            console.log('✅ Paiement COMPLETED (ancien format)');
            clearTimeout(timeoutId);
            this.stopPolling();
            this.endPaymentSession('SUCCESS'); // 🏁 Terminer la session
            onStatusUpdate('COMPLETED', response);
            return;
          }

          if (response.data.statut === 'FAILED') {
            console.log('❌ Paiement FAILED (ancien format)');
            clearTimeout(timeoutId);
            this.stopPolling();
            this.endPaymentSession('FAILED'); // 🏁 Terminer la session
            onStatusUpdate('FAILED', response);
            return;
          }
        }

        // Le paiement est toujours en cours de traitement
        console.log('⏳ Paiement toujours en cours...');
        onStatusUpdate('PROCESSING', response);

      } catch (error) {
        console.error('❌ Erreur pendant le polling:', error);
        // Continuer le polling malgré l'erreur
      }
    };

    // Démarrer le polling immédiatement
    pollStatus();

    // Puis toutes les 5 secondes
    this.pollingInterval = setInterval(pollStatus, 5000);
  }

  /**
   * Arrêter le polling en cours
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.pollingAbortController) {
      this.pollingAbortController.abort();
      this.pollingAbortController = null;
    }

    console.log('⏹️ Polling arrêté');
  }

  /**
   * Forcer la fin de session (pour reset manuel)
   */
  forceEndSession(): void {
    this.endPaymentSession('MANUAL');
  }

  /**
   * Formater le QR Code pour l'affichage
   * Le QR code peut être en base64 direct ou avec préfixe data:image
   */
  formatQRCode(qrCode: string): string {
    if (!qrCode) return '';

    // Si c'est déjà un data URI complet
    if (qrCode.startsWith('data:image')) {
      return qrCode;
    }

    // Si c'est du base64 brut, ajouter le préfixe
    return `data:image/png;base64,${qrCode}`;
  }

  /**
   * Extraire l'URL de paiement selon le type de wallet
   */
  extractPaymentUrl(response: CreatePaymentResponse, method: PaymentMethod): string | null {
    switch (method) {
      case 'OM':
        return response.om || response.maxit || null;
      case 'WAVE':
      case 'FREE':
        return response.payment_url || null;
      default:
        return null;
    }
  }

  /**
   * Obtenir les instructions de paiement selon le wallet
   */
  getPaymentInstructions(method: PaymentMethod): string {
    switch (method) {
      case 'OM':
        return 'Scannez le QR code avec votre application Orange Money ou utilisez le lien de paiement';
      case 'WAVE':
        return 'Scannez le QR code avec votre application Wave ou cliquez sur le lien de paiement';
      case 'FREE':
        return 'Scannez le QR code avec votre application Free Money ou utilisez le lien de paiement';
      default:
        return 'Suivez les instructions pour effectuer le paiement';
    }
  }

  /**
   * Valider le montant selon le wallet
   */
  validateAmount(amount: number, method: PaymentMethod): { valid: boolean; message?: string } {
    const minAmount = 50;
    const maxAmount = 1000000;
    //TODO: ajouter des validations selon le wallet
    switch (method) {
      case 'OM':
        return {
          valid: false,
          message: `Le montant minimum est de ${minAmount} FCFA`
        };
      case 'WAVE':
        return {
          valid: false,
          message: `Le montant minimum est de ${minAmount} FCFA`
        };
      case 'FREE':
        return {
          valid: false,
          message: `Le montant minimum est de ${minAmount} FCFA`
        };
      default:
        return {
          valid: false,
          message: `Le montant minimum est de ${minAmount} FCFA`
        };
    }   
    if (amount < minAmount) {
      return {
        valid: false,
        message: `Le montant minimum est de ${minAmount} FCFA`
      };
    } 

    if (amount > maxAmount) {
      return {
        valid: false,
        message: `Le montant maximum est de ${maxAmount} FCFA`
      };
    }

    return { valid: true };
  }

  /**
   * 🆕 Créer un paiement pour un abonnement
   *
   * Workflow spécifique abonnements :
   * - Contexte différent (pas de facture)
   * - Référence unique pour abonnement
   * - Pas de double protection (pas de factureId)
   */
  async createSubscriptionPayment(params: {
    idStructure: number;
    typeAbonnement: string;
    montant: number;
    methode: Exclude<PaymentMethod, 'CASH'>;
  }): Promise<CreatePaymentResponse> {
    try {
      console.log('💳 [SUBSCRIPTION-PAYMENT] Création paiement abonnement:', params);

      // Générer référence unique pour l'abonnement
      const reference = `ABO-${params.idStructure}-${Date.now()}`;

      // Créer la requête de paiement
      const request: CreatePaymentRequest = {
        pAppName: 'FAYCLICK',
        pMethode: params.methode,
        pReference: reference,
        pClientTel: '221000000000', // Numéro fictif pour abonnement structure
        pMontant: params.montant,
        pServiceName: WALLET_SERVICE_MAP[params.methode],
        pNomClient: `Structure ${params.idStructure}`,
        pnom_structure: `Abonnement ${params.typeAbonnement}`,
        ref_all_facture: reference
      };

      console.log('📤 [SUBSCRIPTION-PAYMENT] Envoi requête API:', request);

      const response = await fetch(`${this.API_BASE_URL}/create_payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CreatePaymentResponse = await response.json();

      if (!data.uuid) {
        throw new Error('UUID de paiement non reçu');
      }

      console.log('✅ [SUBSCRIPTION-PAYMENT] Paiement créé:', {
        uuid: data.uuid,
        reference,
        montant: params.montant
      });

      return data;

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-PAYMENT] Erreur création:', error);
      throw error;
    }
  }
}

// Export singleton
export const paymentWalletService = new PaymentWalletService();