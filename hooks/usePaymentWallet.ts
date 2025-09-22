/**
 * Hook personnalisé pour gérer les paiements wallet
 * Simplifie l'intégration des paiements dans les composants
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentContext,
  CreatePaymentResponse,
  PaymentStatusResponse
} from '@/types/payment-wallet';
import { paymentWalletEnhancedService as walletService } from '@/services/payment-wallet-enhanced.service';
import type { PaymentHistory, PaymentStats } from '@/services/payment-wallet-enhanced.service';

// État du paiement
export interface PaymentState {
  status: PaymentStatus | 'IDLE';
  loading: boolean;
  error: string | null;
  payment: CreatePaymentResponse | null;
  statusData: PaymentStatusResponse | null;
  qrCode: string | null;
  paymentUrl: string | null;
  progress: number; // 0-100
}

// Options du hook
export interface UsePaymentWalletOptions {
  autoRetry?: boolean;
  pollingTimeout?: number;
  pollingInterval?: number;
  onSuccess?: (payment: PaymentStatusResponse) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: PaymentStatus) => void;
}

export function usePaymentWallet(options: UsePaymentWalletOptions = {}) {
  const {
    autoRetry = true,
    pollingTimeout = 90000,
    pollingInterval = 5000,
    onSuccess,
    onError,
    onStatusChange
  } = options;

  // État local
  const [state, setState] = useState<PaymentState>({
    status: 'IDLE',
    loading: false,
    error: null,
    payment: null,
    statusData: null,
    qrCode: null,
    paymentUrl: null,
    progress: 0
  });

  // Historique et statistiques
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  // Références
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialisation
  useEffect(() => {
    loadHistory();
    loadStats();

    // Écouter les événements de paiement
    const handlePaymentCreated = () => loadHistory();
    const handlePaymentCompleted = () => {
      loadHistory();
      loadStats();
    };

    window.addEventListener('payment:created', handlePaymentCreated);
    window.addEventListener('payment:completed', handlePaymentCompleted);

    return () => {
      window.removeEventListener('payment:created', handlePaymentCreated);
      window.removeEventListener('payment:completed', handlePaymentCompleted);
      stopProgressTracking();
    };
  }, []);

  // Charger l'historique
  const loadHistory = useCallback(() => {
    const data = walletService.getHistory();
    setHistory(data);
  }, []);

  // Charger les statistiques
  const loadStats = useCallback(() => {
    const data = walletService.getPaymentStats();
    setStats(data);
  }, []);

  // Créer un paiement
  const createPayment = useCallback(async (
    method: Exclude<PaymentMethod, 'CASH'>,
    context: PaymentContext
  ) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      status: 'PENDING',
      progress: 0
    }));

    startProgressTracking();

    try {
      const response = autoRetry
        ? await walletService.createPaymentWithRetry(method, context)
        : await walletService.createPayment(method, context);

      const qrCode = walletService.formatQRCode(response.qrCode);
      const paymentUrl = walletService.extractPaymentUrl(response, method);

      setState(prev => ({
        ...prev,
        loading: false,
        payment: response,
        qrCode,
        paymentUrl,
        status: 'PROCESSING',
        progress: 10
      }));

      // Démarrer le polling automatiquement
      startPolling(response.uuid);

      return response;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        status: 'FAILED',
        progress: 0
      }));

      stopProgressTracking();
      onError?.(error as Error);
      throw error;
    }
  }, [autoRetry, onError]);

  // Démarrer le polling
  const startPolling = useCallback((uuid: string) => {
    walletService.startEnhancedPolling(
      uuid,
      (status, data) => {
        // Mettre à jour le statut
        setState(prev => ({
          ...prev,
          status,
          statusData: data || null,
          progress: calculateProgress(status)
        }));

        onStatusChange?.(status);

        // Gérer les états finaux
        if (status === 'COMPLETED') {
          stopProgressTracking();
          setState(prev => ({ ...prev, progress: 100 }));
          onSuccess?.(data!);
          loadHistory();
          loadStats();
        } else if (status === 'FAILED' || status === 'TIMEOUT') {
          stopProgressTracking();
          setState(prev => ({
            ...prev,
            error: status === 'TIMEOUT' ? 'Le paiement a expiré' : 'Le paiement a échoué',
            progress: 0
          }));
          onError?.(new Error(`Paiement ${status}`));
        }
      },
      {
        timeout: pollingTimeout,
        interval: pollingInterval
      }
    );
  }, [pollingTimeout, pollingInterval, onSuccess, onError, onStatusChange]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    walletService.stopPolling();
    stopProgressTracking();
  }, []);

  // Vérifier manuellement le statut
  const checkStatus = useCallback(async (uuid: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await walletService.checkPaymentStatus(uuid, false);

      setState(prev => ({
        ...prev,
        loading: false,
        statusData: response,
        status: response.data?.statut as PaymentStatus || 'PROCESSING'
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message
      }));
      throw error;
    }
  }, []);

  // Réinitialiser l'état
  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: 'IDLE',
      loading: false,
      error: null,
      payment: null,
      statusData: null,
      qrCode: null,
      paymentUrl: null,
      progress: 0
    });
  }, [stopPolling]);

  // Valider un montant
  const validateAmount = useCallback((amount: number, method: PaymentMethod) => {
    return walletService.validateAmount(amount, method);
  }, []);

  // Valider un numéro de téléphone
  const validatePhone = useCallback((phone: string, method: PaymentMethod) => {
    return walletService.validatePhoneNumber(phone, method);
  }, []);

  // Formater un numéro de téléphone
  const formatPhone = useCallback((phone: string, method: PaymentMethod) => {
    return walletService.formatPhoneNumber(phone, method);
  }, []);

  // Obtenir les instructions
  const getInstructions = useCallback((method: PaymentMethod) => {
    return walletService.getPaymentInstructions(method);
  }, []);

  // Exporter l'historique en CSV
  const exportHistory = useCallback(() => {
    const csv = walletService.exportHistoryToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fayclick-payments-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Nettoyer l'historique ancien
  const clearOldHistory = useCallback((days = 30) => {
    const deleted = walletService.clearHistory(days);
    loadHistory();
    return deleted;
  }, [loadHistory]);

  // Filtrer l'historique
  const getFilteredHistory = useCallback((filters?: {
    method?: PaymentMethod;
    status?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }) => {
    return walletService.getHistory(filters);
  }, []);

  // --- Méthodes privées ---

  const startProgressTracking = () => {
    startTimeRef.current = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / pollingTimeout) * 100, 95);
      setState(prev => ({ ...prev, progress }));
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const calculateProgress = (status: PaymentStatus): number => {
    switch (status) {
      case 'PENDING': return 10;
      case 'PROCESSING': return 50;
      case 'COMPLETED': return 100;
      case 'FAILED': return 0;
      case 'TIMEOUT': return 0;
      default: return 0;
    }
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // État
    state,
    history,
    stats,

    // Actions principales
    createPayment,
    checkStatus,
    reset,
    stopPolling,

    // Validation et formatage
    validateAmount,
    validatePhone,
    formatPhone,
    getInstructions,

    // Gestion de l'historique
    loadHistory,
    loadStats,
    exportHistory,
    clearOldHistory,
    getFilteredHistory,

    // État de chargement
    isLoading: state.loading,
    isProcessing: state.status === 'PROCESSING',
    isCompleted: state.status === 'COMPLETED',
    isFailed: state.status === 'FAILED',
    hasError: !!state.error
  };
}