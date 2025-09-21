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

  /**
   * Créer une demande de paiement
   */
  async createPayment(
    method: Exclude<PaymentMethod, 'CASH'>,
    context: PaymentContext
  ): Promise<CreatePaymentResponse> {
    try {
      const request: CreatePaymentRequest = {
        pAppName: 'FAYCLICK',
        pMethode: method,
        pReference: context.facture.num_facture,
        pClientTel: context.facture.tel_client,
        pMontant: context.montant_acompte,
        pServiceName: WALLET_SERVICE_MAP[method],
        pNomClient: context.facture.nom_client,
        pnom_structure: 'FAYCLICK', // TODO: Récupérer depuis le contexte utilisateur
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

      return data;
    } catch (error) {
      console.error('❌ Erreur création paiement:', error);
      throw new Error('Impossible de créer la demande de paiement');
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(uuid: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payment_status/${uuid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: PaymentStatusResponse = await response.json();
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
   * @param timeout - Timeout en millisecondes (défaut: 60000ms = 1 minute)
   */
  startPolling(
    uuid: string,
    onStatusUpdate: (status: PaymentStatus, data?: PaymentStatusResponse) => void,
    timeout: number = 60000
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

        // Vérifier le statut
        if (response.data?.statut === 'COMPLETED') {
          clearTimeout(timeoutId);
          this.stopPolling();
          onStatusUpdate('COMPLETED', response);
          return;
        }

        if (response.data?.statut === 'FAILED') {
          clearTimeout(timeoutId);
          this.stopPolling();
          onStatusUpdate('FAILED', response);
          return;
        }

        // Statut toujours en cours
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
    const minAmount = 100;
    const maxAmount = 5000000;

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
}

// Export singleton
export const paymentWalletService = new PaymentWalletService();