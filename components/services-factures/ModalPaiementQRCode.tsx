/**
 * Modal pour afficher le QR Code et gérer le polling du paiement
 * Design glassmorphisme avec timer et statut en temps réel - Version optimisée
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
  onPaymentComplete: (paymentStatusResponse: any) => void; // Modifié pour passer toute la réponse
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
  const [omDeeplink, setOmDeeplink] = useState<string | null>(null); // Lien OM app
  const [maxitUrl, setMaxitUrl] = useState<string | null>(null); // Lien MaxIt web
  const [timeRemaining, setTimeRemaining] = useState(120); // 120 secondes
  const [error, setError] = useState<string>('');
  const [paymentStatusResponse, setPaymentStatusResponse] = useState<any>(null); // Store la réponse complète
  const [isInitialized, setIsInitialized] = useState(false); // Flag pour éviter les doubles initialisations

  const walletConfig = WALLET_CONFIG[paymentMethod];

  // Fonction handleTimeout avec useCallback
  const handleTimeout = useCallback(() => {
    console.log('⏱️ Timeout du paiement');
    setModalState('TIMEOUT');
    paymentWalletService.stopPolling();
  }, []);

  // Fonction startPolling modifiée pour capturer la réponse complète
  const startPolling = useCallback((uuid: string) => {
    console.log('🔄 Démarrage du polling pour:', uuid);

    paymentWalletService.startPolling(
      uuid,
      (status: PaymentStatus, statusResponse?: any) => {
        console.log('📊 Statut reçu:', status, statusResponse);

        // Stocker la réponse complète
        if (statusResponse) {
          setPaymentStatusResponse(statusResponse);
        }

        switch (status) {
          case 'PROCESSING':
            setModalState('PROCESSING');
            break;
          case 'COMPLETED':
            setModalState('SUCCESS');
            setTimeout(() => {
              // Passer la réponse complète au lieu de seulement l'UUID
              onPaymentComplete(statusResponse || { data: { uuid, reference_externe: uuid } });
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
      120000 // 2 minutes
    );
  }, [onPaymentComplete, onPaymentFailed, handleTimeout]);

  // Fonction d'initialisation avec useCallback pour éviter les re-renders
  const initializePayment = useCallback(async () => {
    try {
      console.log('🚀 [QR] Initialisation du paiement:', paymentMethod, 'UUID sera créé...');

      const response = await paymentWalletService.createPayment(
        paymentMethod,
        paymentContext
      );

      // 🛡️ Vérifier si c'est une session réutilisée
      if (response.qrCode === 'session-active') {
        console.log('🔄 [QR] Réutilisation session existante:', response.uuid);

        // Pour une session réutilisée, on n'a pas de nouveau QR Code
        // Mais on continue le polling sur l'UUID existant
        setModalState('PROCESSING');
        startPolling(response.uuid);
        return;
      }

      setQrCode(paymentWalletService.formatQRCode(response.qrCode));

      // Pour OM, extraire les 2 liens (deeplink + MaxIt)
      if (paymentMethod === 'OM') {
        setOmDeeplink(response.om || null);
        setMaxitUrl(response.maxit || null);
        setPaymentUrl(null);
      } else {
        setPaymentUrl(paymentWalletService.extractPaymentUrl(response, paymentMethod));
        setOmDeeplink(null);
        setMaxitUrl(null);
      }

      setModalState('SHOWING_QR');

      console.log('✅ [QR] Paiement initialisé avec UUID:', response.uuid);

      // Démarrer le polling
      startPolling(response.uuid);

    } catch (error: unknown) {
      console.error('❌ Erreur initialisation:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la création du paiement');
      setModalState('FAILED');
    }
  }, [paymentMethod, paymentContext, startPolling]);

  // Effet pour initialiser le paiement - sans initializePayment dans les dépendances
  useEffect(() => {
    if (isOpen && modalState === 'LOADING' && !isInitialized) {
      console.log('🔄 Initialisation du paiement (effet)');
      setIsInitialized(true);
      initializePayment();
    }
  }, [isOpen, modalState, isInitialized]);

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

  // Effet pour reset le modal quand il s'ouvre/ferme
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [QR] Modal ouvert - Reset complet');
      // Reset complet du modal à l'ouverture
      setModalState('LOADING');
      setIsInitialized(false);
      setError('');
      setTimeRemaining(120);
      setPaymentStatusResponse(null);
      setQrCode('');
      setPaymentUrl(null);
      setOmDeeplink(null);
      setMaxitUrl(null);
    } else {
      console.log('🔄 [QR] Modal fermé - Nettoyage');
      // Nettoyage à la fermeture
      paymentWalletService.stopPolling();
      setIsInitialized(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    paymentWalletService.stopPolling();
    onClose();
  };

  const handleRetry = () => {
    console.log('🔄 Retry du paiement');
    paymentWalletService.stopPolling(); // Stop le polling existant
    setModalState('LOADING');
    setIsInitialized(false); // Reset le flag pour permettre une nouvelle initialisation
    setError('');
    setTimeRemaining(120);
    setPaymentStatusResponse(null);
    setQrCode('');
    setPaymentUrl(null);
    // initializePayment sera appelé par le useEffect quand isInitialized devient false
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-3"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header compact */}
          <div className={`bg-gradient-to-r ${walletConfig.color.replace('bg-', 'from-')} to-purple-600 p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {walletConfig.name}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {formatAmount(paymentContext.montant_acompte)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Contenu principal compact */}
          <div className="p-4">

            {/* État de chargement */}
            {modalState === 'LOADING' && (
              <div className="text-center py-6">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">
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
                {/* Timer compact */}
                <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-800 text-sm">
                    Temps restant: {formatTime(timeRemaining)}
                  </span>
                </div>

                {/* QR Code plus petit */}
                <div className="bg-white p-3 rounded-xl shadow-inner border mb-4 inline-block">
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode}
                      alt="QR Code de paiement"
                      className="w-40 h-40 mx-auto"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gray-100 animate-pulse rounded-lg"></div>
                  )}
                </div>

                {/* Liens de paiement OM (2 boutons) */}
                {paymentMethod === 'OM' && (omDeeplink || maxitUrl) && (
                  <div className="mb-4 space-y-2">
                    {/* Bouton Orange Money App */}
                    {omDeeplink && (
                      <motion.a
                        href={omDeeplink}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Smartphone className="w-5 h-5" />
                          <span>📱 Ouvrir Orange Money</span>
                        </div>
                      </motion.a>
                    )}

                    {/* Bouton MaxIt Web */}
                    {maxitUrl && (
                      <motion.a
                        href={maxitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="block w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <ExternalLink className="w-5 h-5" />
                          <span>🌐 Payer via MaxIt Web</span>
                        </div>
                      </motion.a>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Alternative si le QR code ne fonctionne pas
                    </p>
                  </div>
                )}

                {/* Lien de paiement WAVE/FREE (1 bouton) */}
                {paymentMethod !== 'OM' && paymentUrl && (
                  <div className="mb-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openPaymentUrl}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        <span>Ouvrir le lien de paiement</span>
                      </div>
                    </motion.button>
                    <p className="text-xs text-gray-500 mt-1">
                      Alternative si le QR code ne fonctionne pas
                    </p>
                  </div>
                )}

                {/* Instructions compactes */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Comment payer ?
                  </h3>
                  <div className="text-left space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs">Ouvrez votre application {walletConfig.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs">Scannez le QR code ou utilisez le lien</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs">Confirmez le paiement dans l&apos;application</p>
                    </div>
                  </div>
                </div>

                {/* Indicateur de traitement */}
                {modalState === 'PROCESSING' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-medium text-sm">Paiement en cours de traitement...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* État de succès */}
            {modalState === 'SUCCESS' && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </motion.div>
                <h3 className="text-lg font-bold text-green-800 mb-1">
                  Paiement confirmé !
                </h3>
                <p className="text-green-600 text-sm">
                  L&apos;acompte a été enregistré avec succès
                </p>
                
                {/* Affichage des détails de paiement en mode succès */}
                {paymentStatusResponse?.data && (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      Transaction: {paymentStatusResponse.data.reference_externe || 'N/A'}
                    </p>
                    <p className="text-xs text-green-600">
                      UUID: {paymentStatusResponse.data.uuid || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* État d'erreur */}
            {modalState === 'FAILED' && (
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-800 mb-1">
                  Paiement échoué
                </h3>
                <p className="text-red-600 mb-4 text-sm">
                  {error || 'Une erreur est survenue'}
                </p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* État de timeout avec bouton Réessayer */}
            {modalState === 'TIMEOUT' && (
              <div className="text-center py-6">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-amber-800 mb-1">
                  Temps expiré
                </h3>
                <p className="text-amber-600 mb-4 text-sm">
                  Le délai de paiement a été dépassé. Veuillez réessayer.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleRetry}
                    className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Réessayer le paiement
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer compact */}
          {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && (
            <div className="px-4 pb-4">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
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