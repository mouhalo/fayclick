/**
 * Modal pour afficher le QR Code et gérer le polling du paiement
 * Design glassmorphisme avec timer et statut en temps réel
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  QrCode,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Smartphone
} from 'lucide-react';
import {
  PaymentMethod,
  PaymentContext,
  PaymentStatus,
  WALLET_CONFIG,
  formatAmount
} from '@/types/payment-wallet';
import { paymentWalletService } from '@/services/payment-wallet.service';

interface ModalPaiementQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: Exclude<PaymentMethod, 'CASH'>;
  paymentContext: PaymentContext;
  onPaymentComplete: (uuid: string) => void;
  onPaymentFailed: (error: string) => void;
}

type ModalState = 'LOADING' | 'SHOWING_QR' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export function ModalPaiementQRCode({
  isOpen,
  onClose,
  paymentMethod,
  paymentContext,
  onPaymentComplete,
  onPaymentFailed
}: ModalPaiementQRCodeProps) {

  const [modalState, setModalState] = useState<ModalState>('LOADING');
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  // const [paymentUuid, setPaymentUuid] = useState<string>(''); // Supprimé car non utilisé
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 secondes
  const [error, setError] = useState<string>('');

  const walletConfig = WALLET_CONFIG[paymentMethod];

  // Fonction handleTimeout avec useCallback
  const handleTimeout = useCallback(() => {
    console.log('⏱️ Timeout du paiement');
    setModalState('TIMEOUT');
    paymentWalletService.stopPolling();
    setTimeout(() => {
      onClose();
    }, 3000);
  }, [onClose]);

  // Fonction startPolling avec gestion améliorée
  const startPolling = useCallback((uuid: string) => {
    console.log('🔄 Démarrage du polling pour:', uuid);

    paymentWalletService.startPolling(
      uuid,
      (status: PaymentStatus) => {
        console.log('📊 Statut reçu:', status);

        switch (status) {
          case 'PROCESSING':
            setModalState('PROCESSING');
            break;
          case 'COMPLETED':
            setModalState('SUCCESS');
            setTimeout(() => {
              onPaymentComplete(uuid);
            }, 2000);
            break;
          case 'FAILED':
            setModalState('FAILED');
            setError('Le paiement a échoué');
            setTimeout(() => {
              onPaymentFailed('Paiement échoué');
            }, 3000);
            break;
          case 'TIMEOUT':
            handleTimeout();
            break;
        }
      },
      90000 // 1 minute
    );
  }, [onPaymentComplete, onPaymentFailed, handleTimeout]);

  // Fonction d'initialisation avec useCallback pour éviter les re-renders
  const initializePayment = useCallback(async () => {
    try {
      console.log('🚀 Initialisation du paiement:', paymentMethod);

      const response = await paymentWalletService.createPayment(
        paymentMethod,
        paymentContext
      );

      // setPaymentUuid(response.uuid); // Supprimé car non utilisé
      setQrCode(paymentWalletService.formatQRCode(response.qrCode));
      setPaymentUrl(paymentWalletService.extractPaymentUrl(response, paymentMethod));
      setModalState('SHOWING_QR');

      // Démarrer le polling
      startPolling(response.uuid);

    } catch (error: unknown) {
      console.error('❌ Erreur initialisation:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la création du paiement');
      setModalState('FAILED');
    }
  }, [paymentMethod, paymentContext, startPolling]);

  // Effet pour initialiser le paiement
  useEffect(() => {
    if (isOpen && modalState === 'LOADING') {
      initializePayment();
    }
  }, [isOpen, modalState, initializePayment]);

  // Effet pour le timer
  useEffect(() => {
    if (modalState === 'SHOWING_QR' || modalState === 'PROCESSING') {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [modalState, handleTimeout]);

  // Effet de nettoyage
  useEffect(() => {
    return () => {
      paymentWalletService.stopPolling();
    };
  }, []);

  const handleClose = () => {
    paymentWalletService.stopPolling();
    onClose();
  };

  const handleRetry = () => {
    setModalState('LOADING');
    setError('');
    setTimeRemaining(60);
    initializePayment();
  };

  const openPaymentUrl = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${walletConfig.color.replace('bg-', 'from-')} to-purple-600 p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {walletConfig.name}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {formatAmount(paymentContext.montant_acompte)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6">

            {/* État de chargement */}
            {modalState === 'LOADING' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Génération du QR Code...
                </h3>
                <p className="text-gray-600 text-sm">
                  Création de votre lien de paiement sécurisé
                </p>
              </div>
            )}

            {/* Affichage du QR Code */}
            {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && (
              <div className="text-center">
                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">
                    Temps restant: {formatTime(timeRemaining)}
                  </span>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-inner border mb-6 inline-block">
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode}
                      alt="QR Code de paiement"
                      className="w-48 h-48 mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg"></div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Comment payer ?
                  </h3>
                  <div className="text-left space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                      <p>Ouvrez votre application {walletConfig.name}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <QrCode className="w-5 h-5 text-blue-600 mt-0.5" />
                      <p>Scannez le QR code ci-dessus</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <p>Confirmez le paiement dans l&apos;application</p>
                    </div>
                  </div>

                  {/* Lien de paiement alternatif */}
                  {paymentUrl && (
                    <div className="pt-4 border-t">
                      <button
                        onClick={openPaymentUrl}
                        className="flex items-center gap-2 mx-auto text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm">Ouvrir le lien de paiement</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Indicateur de traitement */}
                {modalState === 'PROCESSING' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 text-blue-800">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Paiement en cours de traitement...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* État de succès */}
            {modalState === 'SUCCESS' && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </motion.div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Paiement confirmé !
                </h3>
                <p className="text-green-600">
                  L&apos;acompte a été enregistré avec succès
                </p>
              </div>
            )}

            {/* État d'erreur */}
            {modalState === 'FAILED' && (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  Paiement échoué
                </h3>
                <p className="text-red-600 mb-6">
                  {error || 'Une erreur est survenue'}
                </p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* État de timeout */}
            {modalState === 'TIMEOUT' && (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-amber-800 mb-2">
                  Temps expiré
                </h3>
                <p className="text-amber-600 mb-6">
                  Le délai de paiement a été dépassé. Veuillez réessayer.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && (
            <div className="px-6 pb-6">
              <button
                onClick={handleClose}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}