/**
 * Service amélioré pour la gestion des paiements par wallet
 * Support étendu pour Orange Money, Wave et Free Money
 * Avec gestion de cache, retry et historique
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

// Interface pour l'historique des paiements
export interface PaymentHistory {
  uuid: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  reference: string;
  clientName: string;
  clientPhone: string;
  errorMessage?: string;
  transactionId?: string;
}

// Interface pour les statistiques de paiement
export interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  byMethod: Record<PaymentMethod, number>;
}

// Configuration de retry
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

// Cache des paiements
interface PaymentCache {
  payment: CreatePaymentResponse;
  timestamp: number;
  expiresAt: number;
}

class PaymentWalletEnhancedService {
  private readonly API_BASE_URL = 'https://api.icelabsoft.com/pay_services/api';
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingAbortController: AbortController | null = null;

  // Cache des paiements
  private paymentCache = new Map<string, PaymentCache>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Historique des paiements (stocké en localStorage)
  private paymentHistory: PaymentHistory[] = [];

  // Configuration de retry par défaut
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  };

  // WebSocket pour les notifications temps réel (si disponible)
  private websocket: WebSocket | null = null;

  constructor() {
    this.loadHistory();
    this.cleanExpiredCache();
  }

  /**
   * Créer une demande de paiement avec retry automatique
   */
  async createPaymentWithRetry(
    method: Exclude<PaymentMethod, 'CASH'>,
    context: PaymentContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<CreatePaymentResponse> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Tentative ${attempt}/${config.maxAttempts} de création de paiement`);

        const response = await this.createPayment(method, context);

        // Succès - ajouter à l'historique
        this.addToHistory({
          uuid: response.uuid,
          method,
          amount: context.montant_acompte,
          status: 'PROCESSING',
          reference: context.facture.num_facture,
          clientName: context.facture.nom_client,
          clientPhone: context.facture.tel_client
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Échec tentative ${attempt}:`, error);

        if (attempt < config.maxAttempts) {
          const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
          console.log(`⏳ Attente de ${delay}ms avant nouvelle tentative...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Échec après plusieurs tentatives');
  }

  /**
   * Créer une demande de paiement (méthode de base améliorée)
   */
  async createPayment(
    method: Exclude<PaymentMethod, 'CASH'>,
    context: PaymentContext
  ): Promise<CreatePaymentResponse> {
    // Vérifier le cache
    const cacheKey = this.getCacheKey(method, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Paiement récupéré du cache');
      return cached;
    }

    try {
      // Valider le montant
      const validation = this.validateAmount(context.montant_acompte, method);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Valider le numéro de téléphone
      const phoneValidation = this.validatePhoneNumber(context.facture.tel_client, method);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.message);
      }

      const request: CreatePaymentRequest = {
        pAppName: 'FAYCLICK',
        pMethode: method,
        pReference: context.facture.num_facture,
        pClientTel: this.formatPhoneNumber(context.facture.tel_client),
        pMontant: context.montant_acompte,
        pServiceName: WALLET_SERVICE_MAP[method],
        pNomClient: context.facture.nom_client,
        pnom_structure: context.facture.nom_structure || 'FAYCLICK',
      };

      // ===== LOGS DÉTAILLÉS DU PAYLOAD =====
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 PAYLOAD DE PAIEMENT WALLET');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔹 Méthode:', method);
      console.log('🔹 Endpoint:', `${this.API_BASE_URL}/add_payement`);
      console.log('🔹 Payload complet:', JSON.stringify(request, null, 2));
      console.log('');
      console.log('📋 Détails du payload:');
      console.log('  • pAppName:', request.pAppName);
      console.log('  • pMethode:', request.pMethode);
      console.log('  • pReference:', request.pReference, `(longueur: ${request.pReference.length} caractères)`);
      console.log('  • pClientTel:', request.pClientTel);
      console.log('  • pMontant:', request.pMontant, 'FCFA');
      console.log('  • pServiceName:', request.pServiceName);
      console.log('  • pNomClient:', request.pNomClient);
      console.log('  • pnom_structure:', request.pnom_structure);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(`${this.API_BASE_URL}/add_payement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': this.generateRequestId()
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000) // Timeout de 30 secondes
      });

      console.log('📡 Réponse HTTP reçue:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Erreur de l\'API:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        throw new Error(
          errorData?.message || `Erreur HTTP: ${response.status}`
        );
      }

      const data: CreatePaymentResponse = await response.json();

      // ===== LOGS DÉTAILLÉS DE LA RÉPONSE =====
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ RÉPONSE DE L\'API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔹 Réponse complète:', JSON.stringify(data, null, 2));
      console.log('');
      console.log('📋 Détails de la réponse:');
      console.log('  • UUID:', data.uuid);
      console.log('  • Statut:', data.status);
      console.log('  • QR Code présent:', !!data.qrCode);
      console.log('  • Payment URL:', data.payment_url || 'N/A');
      console.log('  • OM Deeplink:', data.om || 'N/A');
      console.log('  • MaxIt URL:', data.maxit || 'N/A');
      console.log('  • Message:', data.message || 'N/A');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Ajouter au cache
      this.addToCache(cacheKey, data);

      // Émettre un événement
      this.emitPaymentEvent('created', data);

      return data;
    } catch (error) {
      console.error('❌ Erreur création paiement:', error);

      // Enregistrer l'échec dans l'historique
      this.addToHistory({
        uuid: 'error-' + Date.now(),
        method,
        amount: context.montant_acompte,
        status: 'FAILED',
        reference: context.facture.num_facture,
        clientName: context.facture.nom_client,
        clientPhone: context.facture.tel_client,
        errorMessage: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Vérifier le statut d'un paiement avec cache
   */
  async checkPaymentStatus(uuid: string, useCache = true): Promise<PaymentStatusResponse> {
    const cacheKey = `status-${uuid}`;

    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📦 Statut récupéré du cache');
        return cached as PaymentStatusResponse;
      }
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/payment_status/${uuid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': this.generateRequestId()
        },
        signal: AbortSignal.timeout(10000) // Timeout de 10 secondes
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: PaymentStatusResponse = await response.json();

      // Mettre à jour l'historique
      this.updateHistoryStatus(uuid, data.data?.statut as PaymentStatus);

      // Ajouter au cache si le statut n'est pas final
      if (data.data?.statut !== 'COMPLETED' && data.data?.statut !== 'FAILED') {
        this.addToCache(cacheKey, data, 10000); // Cache de 10 secondes pour les statuts en cours
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      throw new Error('Impossible de vérifier le statut du paiement');
    }
  }

  /**
   * Polling amélioré avec gestion d'erreurs
   */
  startEnhancedPolling(
    uuid: string,
    onStatusUpdate: (status: PaymentStatus, data?: PaymentStatusResponse) => void,
    options: {
      timeout?: number;
      interval?: number;
      maxErrors?: number;
    } = {}
  ): void {
    const {
      timeout = 90000,
      interval = 5000,
      maxErrors = 3
    } = options;

    this.stopPolling();

    console.log('🔄 Démarrage du polling amélioré pour:', uuid);

    this.pollingAbortController = new AbortController();
    let errorCount = 0;

    const timeoutId = setTimeout(() => {
      console.log('⏱️ Timeout du polling atteint');
      this.stopPolling();
      this.updateHistoryStatus(uuid, 'TIMEOUT');
      onStatusUpdate('TIMEOUT');
    }, timeout);

    const pollStatus = async () => {
      try {
        if (this.pollingAbortController?.signal.aborted) {
          return;
        }

        const response = await this.checkPaymentStatus(uuid, false);
        errorCount = 0; // Reset error count on success

        console.log('📊 Statut reçu:', response.data?.statut || response.status);

        const status = response.data?.statut as PaymentStatus;

        if (status === 'COMPLETED' || status === 'FAILED') {
          clearTimeout(timeoutId);
          this.stopPolling();
          this.updateHistoryStatus(uuid, status);
          onStatusUpdate(status, response);
          this.emitPaymentEvent(status === 'COMPLETED' ? 'completed' : 'failed', { uuid, response });
          return;
        }

        onStatusUpdate('PROCESSING', response);

      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur pendant le polling (${errorCount}/${maxErrors}):`, error);

        if (errorCount >= maxErrors) {
          clearTimeout(timeoutId);
          this.stopPolling();
          this.updateHistoryStatus(uuid, 'FAILED');
          onStatusUpdate('FAILED');
        }
      }
    };

    // Démarrer le polling immédiatement
    pollStatus();

    // Puis à intervalles réguliers
    this.pollingInterval = setInterval(pollStatus, interval);
  }

  /**
   * Valider le numéro de téléphone selon le wallet
   */
  validatePhoneNumber(phone: string, method: PaymentMethod): { valid: boolean; message?: string } {
    // Supprimer les espaces et caractères spéciaux
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Vérifier le format sénégalais
    const senegalRegex = /^(\+?221)?(77|78|76|70|75)\d{7}$/;

    if (!senegalRegex.test(cleanPhone)) {
      return {
        valid: false,
        message: 'Numéro de téléphone invalide. Format attendu: 77XXXXXXX'
      };
    }

    // Validations spécifiques par wallet
    switch (method) {
      case 'OM':
        const omPrefixes = ['77', '78'];
        const prefix = cleanPhone.replace(/^\+?221/, '').substring(0, 2);
        if (!omPrefixes.includes(prefix)) {
          return {
            valid: false,
            message: 'Orange Money nécessite un numéro commençant par 77 ou 78'
          };
        }
        break;

      case 'WAVE':
        // Wave accepte tous les opérateurs
        break;

      case 'FREE':
        const freePrefix = cleanPhone.replace(/^\+?221/, '').substring(0, 2);
        if (freePrefix !== '76') {
          return {
            valid: false,
            message: 'Free Money nécessite un numéro commençant par 76'
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Formater le numéro de téléphone selon le wallet
   */
  formatPhoneNumber(phone: string): string {
    // Supprimer les espaces et caractères spéciaux
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Supprimer le préfixe international si présent
    if (cleanPhone.startsWith('+221')) {
      cleanPhone = cleanPhone.substring(4);
    } else if (cleanPhone.startsWith('221')) {
      cleanPhone = cleanPhone.substring(3);
    }

    // Retourner au format local
    return cleanPhone;
  }

  /**
   * Obtenir les statistiques de paiement
   */
  getPaymentStats(): PaymentStats {
    const history = this.getHistory();

    const stats: PaymentStats = {
      totalPayments: history.length,
      successfulPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      totalAmount: 0,
      averageAmount: 0,
      successRate: 0,
      byMethod: {
        OM: 0,
        WAVE: 0,
        FREE: 0,
        CASH: 0
      }
    };

    history.forEach(payment => {
      // Compter par statut
      switch (payment.status) {
        case 'COMPLETED':
          stats.successfulPayments++;
          stats.totalAmount += payment.amount;
          break;
        case 'FAILED':
        case 'TIMEOUT':
          stats.failedPayments++;
          break;
        case 'PROCESSING':
        case 'PENDING':
          stats.pendingPayments++;
          break;
      }

      // Compter par méthode
      stats.byMethod[payment.method]++;
    });

    // Calculer les moyennes
    if (stats.successfulPayments > 0) {
      stats.averageAmount = stats.totalAmount / stats.successfulPayments;
    }

    if (stats.totalPayments > 0) {
      stats.successRate = (stats.successfulPayments / stats.totalPayments) * 100;
    }

    return stats;
  }

  /**
   * Obtenir l'historique des paiements
   */
  getHistory(filters?: {
    method?: PaymentMethod;
    status?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): PaymentHistory[] {
    let filtered = [...this.paymentHistory];

    if (filters) {
      if (filters.method) {
        filtered = filtered.filter(p => p.method === filters.method);
      }
      if (filters.status) {
        filtered = filtered.filter(p => p.status === filters.status);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(p => new Date(p.createdAt) >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(p => new Date(p.createdAt) <= filters.dateTo!);
      }
    }

    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Nettoyer l'historique
   */
  clearHistory(olderThanDays = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.paymentHistory.length;
    this.paymentHistory = this.paymentHistory.filter(
      p => new Date(p.createdAt) > cutoffDate
    );

    this.saveHistory();
    return initialCount - this.paymentHistory.length;
  }

  /**
   * Exporter l'historique en CSV
   */
  exportHistoryToCSV(): string {
    const headers = [
      'Date',
      'Référence',
      'Client',
      'Téléphone',
      'Montant',
      'Méthode',
      'Statut',
      'ID Transaction'
    ];

    const rows = this.paymentHistory.map(p => [
      new Date(p.createdAt).toLocaleString('fr-FR'),
      p.reference,
      p.clientName,
      p.clientPhone,
      p.amount.toString(),
      p.method,
      p.status,
      p.transactionId || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  // --- Méthodes privées ---

  private getCacheKey(method: PaymentMethod, context: PaymentContext): string {
    return `${method}-${context.facture.num_facture}-${context.montant_acompte}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.paymentCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payment;
    }
    this.paymentCache.delete(key);
    return null;
  }

  private addToCache(key: string, data: any, ttl = this.CACHE_TTL): void {
    const timestamp = Date.now();
    this.paymentCache.set(key, {
      payment: data,
      timestamp,
      expiresAt: timestamp + ttl
    });
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.paymentCache.entries()) {
      if (value.expiresAt <= now) {
        this.paymentCache.delete(key);
      }
    }
    // Nettoyer périodiquement
    setTimeout(() => this.cleanExpiredCache(), 60000);
  }

  private addToHistory(payment: Omit<PaymentHistory, 'createdAt' | 'updatedAt'>): void {
    const now = new Date();
    this.paymentHistory.push({
      ...payment,
      createdAt: now,
      updatedAt: now
    });
    this.saveHistory();
  }

  private updateHistoryStatus(uuid: string, status: PaymentStatus): void {
    const payment = this.paymentHistory.find(p => p.uuid === uuid);
    if (payment) {
      payment.status = status;
      payment.updatedAt = new Date();
      this.saveHistory();
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem('fayclick_payment_history', JSON.stringify(this.paymentHistory));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  }

  private loadHistory(): void {
    try {
      const saved = localStorage.getItem('fayclick_payment_history');
      if (saved) {
        this.paymentHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      this.paymentHistory = [];
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitPaymentEvent(type: string, data: unknown): void {
    window.dispatchEvent(new CustomEvent(`payment:${type}`, { detail: data }));
  }

  // Méthodes héritées du service original
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

  formatQRCode(qrCode: string): string {
    if (!qrCode) return '';
    if (qrCode.startsWith('data:image')) {
      return qrCode;
    }
    return `data:image/png;base64,${qrCode}`;
  }

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

  validateAmount(amount: number, method: PaymentMethod): { valid: boolean; message?: string } {
    const limits = {
      OM: { min: 100, max: 2000000 },
      WAVE: { min: 100, max: 5000000 },
      FREE: { min: 100, max: 1000000 },
      CASH: { min: 1, max: Number.MAX_SAFE_INTEGER }
    };

    const { min, max } = limits[method];

    if (amount < min) {
      return {
        valid: false,
        message: `Le montant minimum est de ${min.toLocaleString('fr-FR')} FCFA`
      };
    }

    if (amount > max) {
      return {
        valid: false,
        message: `Le montant maximum est de ${max.toLocaleString('fr-FR')} FCFA`
      };
    }

    return { valid: true };
  }
}

// Export singleton
export const paymentWalletEnhancedService = new PaymentWalletEnhancedService();
export default paymentWalletEnhancedService;