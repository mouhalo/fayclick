/**
 * Modal d'encaissement VenteFlash - Version Flip Cards
 * Interface optimisée mobile avec cartes flip 3x1
 * CASH: Montant reçu + calcul monnaie à rendre
 * WALLET (OM/WAVE): Saisie téléphone + QR Code + polling 2min
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Banknote, CheckCircle,
  Calculator, QrCode, Clock, Loader2, AlertCircle, ExternalLink, Smartphone
} from 'lucide-react';
import Image from 'next/image';
import { PaymentMethod, WALLET_CONFIG, formatAmount } from '@/types/payment-wallet';
import { paymentWalletService } from '@/services/payment-wallet.service';
import { authService } from '@/services/auth.service';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslations } from '@/hooks/useTranslations';

interface ModalEncaissementVenteFlashProps {
  isOpen: boolean;
  onClose: () => void;
  montantTotal: number;
  walletPaiement?: boolean;
  /** Montant cible de la tranche en cours (défaut = montantTotal → comportement actuel inchangé) */
  montantAEncaisser?: number;
  /** true dès qu'une tranche a déjà été encaissée sur la vente (bandeau "Reste à encaisser") */
  trancheEnCours?: boolean;
  /** Case "Paiement multimode" — contrôlée par le parent, jamais réinitialisée par resetModal() */
  multiMode?: boolean;
  onMultiModeChange?: (checked: boolean) => void;
  /** Infos facture de la vente en cours (split démarré) pour le contexte wallet */
  idFactureEnCours?: number;
  numFactureEnCours?: string;
  onPaymentComplete: (method: PaymentMethod, transactionData: {
    transactionId: string;
    uuid: string;
    telephone?: string; // Numéro téléphone pour paiements wallet
  }, monnaieARendre?: number, montantEncaisse?: number) => void;
  onPaymentFailed?: (error: string) => void;
}

type PaymentStep = 'SELECT_METHOD' | 'WALLET_QR' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
type FlipMethod = 'CASH' | 'OM' | 'WAVE';

export function ModalEncaissementVenteFlash({
  isOpen,
  onClose,
  montantTotal,
  walletPaiement = false,
  montantAEncaisser,
  trancheEnCours = false,
  multiMode = false,
  onMultiModeChange,
  idFactureEnCours,
  numFactureEnCours,
  onPaymentComplete,
  onPaymentFailed
}: ModalEncaissementVenteFlashProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const isCompact = isMobile || isMobileLarge;
  const t = useTranslations('venteFlash');

  // Montant cible de CETTE tranche : restant dû en cours de split, sinon total de la vente
  const montantCible = montantAEncaisser ?? montantTotal;

  // États principaux
  const [step, setStep] = useState<PaymentStep>('SELECT_METHOD');
  const [flippedCards, setFlippedCards] = useState<Set<FlipMethod>>(new Set());

  // États CASH
  const [montantRecu, setMontantRecu] = useState<string>('');
  const [monnaieARendre, setMonnaieARendre] = useState<number>(0);

  // États WALLET
  const [telephone, setTelephone] = useState<string>('');
  const [telephoneError, setTelephoneError] = useState<string>('');
  const [activeWalletMethod, setActiveWalletMethod] = useState<'OM' | 'WAVE' | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [omDeeplink, setOmDeeplink] = useState<string | null>(null);
  const [maxitUrl, setMaxitUrl] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isPolling, setIsPolling] = useState(false);

  // États généraux
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Ref pour éviter les appels multiples (closure-safe)
  const paymentCompletedRef = useRef(false);

  // Toggle flip d'une carte (une seule à la fois)
  const toggleFlip = (method: FlipMethod) => {
    setFlippedCards(prev => {
      const next = new Set<FlipMethod>();
      // Si la carte cliquée est déjà ouverte, la fermer
      // Sinon, fermer toutes les autres et ouvrir celle-ci
      if (!prev.has(method)) {
        next.add(method);
      }
      return next;
    });
    setError('');
  };

  // Calculer la monnaie à rendre (sur la tranche en cours, pas sur le total de la vente)
  useEffect(() => {
    const recu = parseFloat(montantRecu) || 0;
    const monnaie = recu - montantCible;
    setMonnaieARendre(monnaie >= 0 ? monnaie : 0);
  }, [montantRecu, montantCible]);

  // Timer pour le paiement wallet
  useEffect(() => {
    if (step === 'WALLET_QR' && isPolling) {
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
  }, [step, isPolling]);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const resetModal = () => {
    setStep('SELECT_METHOD');
    setFlippedCards(new Set());
    setMontantRecu('');
    setMonnaieARendre(0);
    setTelephone('');
    setTelephoneError('');
    setActiveWalletMethod(null);
    setQrCode('');
    setPaymentUrl(null);
    setOmDeeplink(null);
    setMaxitUrl(null);
    setTimeRemaining(120);
    setIsPolling(false);
    setIsProcessing(false);
    setError('');
    paymentCompletedRef.current = false;
    paymentWalletService.stopPolling();
  };

  const handleTimeout = useCallback(() => {
    console.log('⏱️ [VF-PAIEMENT] TIMEOUT - Paiement expiré');
    setStep('TIMEOUT');
    setIsPolling(false);
    paymentWalletService.stopPolling();
  }, []);

  // Validation du paiement CASH
  const handleCashValidate = async () => {
    if (paymentCompletedRef.current) {
      console.warn('⚠️ [ENCAISSEMENT] Paiement CASH déjà validé, ignoré');
      return;
    }

    const recu = parseFloat(montantRecu) || 0;

    // Mono-mode : le reçu doit couvrir tout le restant (comportement historique).
    // Multimode : un montant partiel est admis (tranche), seul le solde est plafonné.
    if (!multiMode && recu < montantCible) {
      setError(t('checkout.minAmount', { amount: montantCible.toLocaleString('fr-FR') }));
      return;
    }
    if (multiMode && recu <= 0) {
      setError(t('checkout.montantRequis'));
      return;
    }

    paymentCompletedRef.current = true;
    setIsProcessing(true);
    setError('');

    try {
      const user = authService.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const transactionId = `CASH-${user.id_structure}-${Date.now()}`;
      const montantEncaisse = Math.min(recu, montantCible);

      console.log('💵 [VF-PAIEMENT] CASH validé | Cible:', montantCible, '| Encaissé:', montantEncaisse, '| Monnaie:', monnaieARendre);

      // Callback immédiat avec monnaie à rendre + montant réellement encaissé sur cette tranche
      onPaymentComplete('CASH', {
        transactionId,
        uuid: 'face2face'
      }, monnaieARendre, montantEncaisse);

    } catch (err) {
      console.error('❌ [ENCAISSEMENT] Erreur CASH:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
      paymentCompletedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Validation directe wallet (mode walletPaiement = true, comme CASH)
  const handleWalletDirect = async (method: 'OM' | 'WAVE') => {
    if (paymentCompletedRef.current) {
      console.warn(`⚠️ [ENCAISSEMENT] Paiement ${method} direct déjà validé, ignoré`);
      return;
    }

    paymentCompletedRef.current = true;
    setIsProcessing(true);
    setError('');

    try {
      const user = authService.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const transactionId = `${method}-${user.id_structure}-${Date.now()}`;

      console.log(`📱 [VF-PAIEMENT] ${method} direct validé | Montant:`, montantCible);

      onPaymentComplete(method, {
        transactionId,
        uuid: 'face2face'
      }, undefined, montantCible);

    } catch (err) {
      console.error(`❌ [ENCAISSEMENT] Erreur ${method} direct:`, err);
      setError(err instanceof Error ? err.message : 'Erreur');
      paymentCompletedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Validation téléphone wallet
  const validatePhone = (phone: string, method: 'OM' | 'WAVE'): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');

    if (cleanPhone.length !== 9) {
      setTelephoneError(t('checkout.phoneRequired'));
      return false;
    }

    if (method === 'OM' && !['77', '78'].includes(cleanPhone.substring(0, 2))) {
      setTelephoneError(t('checkout.omPhoneError'));
      return false;
    }

    if (method === 'WAVE' && !['77', '78', '76', '70'].includes(cleanPhone.substring(0, 2))) {
      setTelephoneError(t('checkout.wavePhoneError'));
      return false;
    }

    setTelephoneError('');
    return true;
  };

  // Initier le paiement wallet
  const handleWalletInitiate = async (method: 'OM' | 'WAVE') => {
    if (!validatePhone(telephone, method)) return;

    setActiveWalletMethod(method);
    setIsProcessing(true);
    setError('');

    try {
      const user = authService.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      console.log(`📱 [VF-PAIEMENT] Initiation ${method} | Montant: ${montantCible} | Tel: ${telephone}`);

      const paymentContext = {
        facture: {
          id_facture: idFactureEnCours || 0,
          num_facture: numFactureEnCours || 'VFLASH',
          nom_client: 'CLIENT_ANONYME',
          tel_client: telephone.replace(/\s/g, ''),
          montant_total: montantCible,
          montant_restant: montantCible,
          nom_structure: user.nom_structure
        },
        montant_acompte: montantCible
      };

      const response = await paymentWalletService.createPayment(method, paymentContext);

      setQrCode(paymentWalletService.formatQRCode(response.qrCode));

      if (method === 'OM') {
        setOmDeeplink(response.om || null);
        setMaxitUrl(response.maxit || null);
        setPaymentUrl(null);
      } else {
        setPaymentUrl(paymentWalletService.extractPaymentUrl(response, method));
        setOmDeeplink(null);
        setMaxitUrl(null);
      }

      setStep('WALLET_QR');
      setTimeRemaining(120);
      setIsPolling(true);
      startPolling(response.uuid, method);

    } catch (err) {
      console.error('❌ [VF-PAIEMENT] Erreur wallet:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : 'Erreur');
      setStep('FAILED');
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling du statut de paiement
  const startPolling = (uuid: string, method: 'OM' | 'WAVE') => {
    console.log(`🔄 [VF-PAIEMENT] Démarrage polling ${method} | UUID: ${uuid}`);

    paymentWalletService.startPolling(
      uuid,
      (status, statusResponse) => {
        // Ne logger que les changements importants
        if (status === 'COMPLETED' || status === 'FAILED' || status === 'TIMEOUT') {
          console.log(`📊 [VF-PAIEMENT] Polling ${method} → ${status}`);
        }

        switch (status) {
          case 'COMPLETED':
            if (paymentCompletedRef.current) {
              console.warn('⚠️ [VF-PAIEMENT] Double callback COMPLETED ignoré');
              return;
            }
            paymentCompletedRef.current = true;
            setIsPolling(false);

            const transactionId = statusResponse?.data?.reference_externe || uuid;
            const responseUuid = statusResponse?.data?.uuid || uuid;
            // Récupérer le téléphone depuis la réponse API ou utiliser celui saisi
            const telFromResponse = statusResponse?.data?.telephone || statusResponse?.data?.tel_client || telephone;

            console.log(`✅ [VF-PAIEMENT] ${method} COMPLETED | TxID: ${transactionId} | Tel: ${telFromResponse}`);

            onPaymentComplete(method, {
              transactionId,
              uuid: responseUuid,
              telephone: telFromResponse
            }, undefined, montantCible);
            break;

          case 'FAILED':
            setIsPolling(false);
            setError(t('checkout.paymentFailed'));
            setStep('FAILED');
            if (onPaymentFailed) {
              onPaymentFailed(t('checkout.paymentFailed'));
            }
            break;

          case 'TIMEOUT':
            handleTimeout();
            break;
        }
      },
      120000
    );
  };

  // Retry après échec ou timeout
  const handleRetry = () => {
    paymentWalletService.stopPolling();
    setStep('SELECT_METHOD');
    setError('');
    setTimeRemaining(120);
    setIsPolling(false);
    paymentCompletedRef.current = false;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Styles responsive
  const cardHeight = isCompact ? 'h-28' : 'h-40';
  const iconSize = isCompact ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = isCompact ? 'text-xs' : 'text-sm';
  const inputPadding = isCompact ? 'py-2 px-3' : 'py-3 px-4';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl w-full ${isCompact ? 'max-w-sm max-h-[95vh] overflow-y-auto' : 'max-w-md'} shadow-2xl overflow-hidden`}
        >
          {/* Header compact */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 sm:p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl">
                  <Calculator className={isCompact ? 'w-5 h-5' : 'w-6 h-6'} />
                </div>
                <div>
                  <h2 className={`font-bold ${isCompact ? 'text-base' : 'text-lg'}`}>{t('checkout.title')}</h2>
                  <p className={`text-white/90 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                    {trancheEnCours
                      ? t('checkout.remainingToCollect', { amount: montantCible.toLocaleString('fr-FR') })
                      : formatAmount(montantTotal)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-3 sm:p-4">

            {/* ÉTAPE: Sélection méthode - Grille 3x1 Flip Cards */}
            {step === 'SELECT_METHOD' && (
              <div className="space-y-3">
                <p className={`text-center text-gray-600 ${textSize} mb-3`}>
                  {t('checkout.chooseMethod')}
                </p>

                {/* Case "Paiement multimode" — contrôlée par le parent, survit aux resetModal() entre tranches */}
                {onMultiModeChange && (
                  <label className={`flex items-center justify-center gap-2 cursor-pointer select-none ${textSize}`}>
                    <input
                      type="checkbox"
                      checked={multiMode}
                      onChange={(e) => onMultiModeChange(e.target.checked)}
                      className="w-4 h-4 accent-green-600 cursor-pointer"
                    />
                    <span className="font-medium text-gray-700">{t('checkout.multiMode')}</span>
                    <span className="text-gray-400">· {t('checkout.multiModeHint')}</span>
                  </label>
                )}

                {/* Grille 3 colonnes Flip Cards */}
                <div className={`grid grid-cols-3 ${isCompact ? 'gap-2' : 'gap-4'}`}>
                  {/* CASH Card */}
                  <div style={{ perspective: '1000px' }}>
                    <div
                      className={`${cardHeight} relative`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.6s',
                        transform: flippedCards.has('CASH') ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                      onClick={() => !flippedCards.has('CASH') && toggleFlip('CASH')}
                    >
                      {/* Front */}
                      <div
                        className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center cursor-pointer shadow-lg border-2 border-green-300 vf-touch-target"
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', top: 0, left: 0 }}
                      >
                        <div className={`${iconSize} bg-white/30 rounded-full flex items-center justify-center mb-1`}>
                          <Banknote className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} color="white" />
                        </div>
                        <span className={`font-bold text-white ${textSize}`}>CASH</span>
                      </div>

                      {/* Back */}
                      <div
                        className={`bg-green-50 rounded-xl ${isCompact ? 'p-1.5' : 'p-3'} flex flex-col justify-center border-2 border-green-300`}
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', top: 0, left: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleFlip('CASH')}
                          className={`absolute ${isCompact ? 'top-0.5 right-0.5' : 'top-1 right-1'} text-gray-400 hover:text-gray-600 z-10`}
                        >
                          <X className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} />
                        </button>
                        <input
                          type="number"
                          value={montantRecu}
                          onChange={(e) => {
                            const val = e.target.value;
                            const maxAllowed = montantCible * 10; // Max 10x le montant de la tranche
                            if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= maxAllowed)) {
                              setMontantRecu(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const recu = parseFloat(montantRecu) || 0;
                              if (multiMode ? recu > 0 : recu >= montantCible) {
                                handleCashValidate();
                              }
                            }
                          }}
                          placeholder="Reçu"
                          min={0}
                          max={montantCible * 10}
                          className={`w-full ${isCompact ? 'py-1 px-1 text-[11px]' : 'py-2 px-3 text-base'} border border-green-300 rounded-lg text-center font-semibold mb-1`}
                          autoFocus={flippedCards.has('CASH')}
                        />
                        {/* Label monnaie toujours visible */}
                        <div className={`text-center font-bold ${isCompact ? 'text-[9px] mb-0.5' : 'text-xs mb-1'} ${
                          parseFloat(montantRecu) >= montantCible
                            ? 'text-amber-600'
                            : 'text-gray-400'
                        }`}>
                          {parseFloat(montantRecu) >= montantCible
                            ? t('checkout.cashChange', { amount: monnaieARendre.toLocaleString('fr-FR') })
                            : montantRecu
                              ? (multiMode
                                  ? t('checkout.trancheAmount', { amount: (parseFloat(montantRecu) || 0).toLocaleString('fr-FR') })
                                  : t('checkout.cashMissing', { amount: (montantCible - (parseFloat(montantRecu) || 0)).toLocaleString('fr-FR') }))
                              : t('checkout.cashTotal', { amount: montantCible.toLocaleString('fr-FR') })
                          }
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCashValidate}
                          disabled={isProcessing || (multiMode ? !(parseFloat(montantRecu) > 0) : parseFloat(montantRecu) < montantCible)}
                          className={`w-full ${isCompact ? 'py-1 text-[9px]' : 'py-1.5 text-sm'} bg-green-500 text-white font-bold rounded-lg disabled:opacity-50`}
                        >
                          {isProcessing ? '...' : 'OK'}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* WAVE Card */}
                  <div style={{ perspective: '1000px' }}>
                    <div
                      className={`${cardHeight} relative`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.6s',
                        transform: flippedCards.has('WAVE') ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                      onClick={() => !flippedCards.has('WAVE') && toggleFlip('WAVE')}
                    >
                      {/* Front */}
                      <div
                        className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center cursor-pointer shadow-lg border-2 border-blue-300 vf-touch-target"
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', top: 0, left: 0 }}
                      >
                        <div className={`${iconSize} bg-white rounded-full flex items-center justify-center mb-1 p-1 relative overflow-hidden`}>
                          <Image
                            src="/images/wave.png"
                            alt="Wave"
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                        <span className={`font-bold text-white ${textSize}`}>WAVE</span>
                      </div>

                      {/* Back */}
                      <div
                        className={`bg-blue-50 rounded-xl ${isCompact ? 'p-1.5' : 'p-3'} flex flex-col justify-center border-2 border-blue-300`}
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', top: 0, left: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleFlip('WAVE')}
                          className={`absolute ${isCompact ? 'top-0.5 right-0.5' : 'top-1 right-1'} text-gray-400 hover:text-gray-600 z-10`}
                        >
                          <X className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} />
                        </button>
                        {walletPaiement ? (
                          <>
                            <div className={`text-center font-bold ${isCompact ? 'text-[10px] mb-1' : 'text-xs mb-2'} text-blue-700`}>
                              {formatAmount(montantCible)}
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleWalletDirect('WAVE')}
                              disabled={isProcessing}
                              className={`w-full ${isCompact ? 'py-2 text-[10px]' : 'py-2.5 text-sm'} bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1`}
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />}
                              {t('checkout.confirm')}
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <input
                              type="tel"
                              value={telephone}
                              onChange={(e) => {
                                setTelephone(e.target.value.replace(/[^0-9]/g, ''));
                                setTelephoneError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (telephone.length === 9) {
                                    handleWalletInitiate('WAVE');
                                  }
                                }
                              }}
                              placeholder="7X XXX XX XX"
                              maxLength={9}
                              className={`w-full ${isCompact ? 'py-1 px-1 text-[11px]' : 'py-2 px-3 text-base'} border ${telephoneError ? 'border-red-300' : 'border-blue-300'} rounded-lg text-center font-semibold mb-1`}
                              autoFocus={flippedCards.has('WAVE')}
                            />
                            {telephoneError && (
                              <p className={`text-red-500 ${isCompact ? 'text-[8px]' : 'text-sm'} text-center mb-1`}>{telephoneError}</p>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleWalletInitiate('WAVE')}
                              disabled={isProcessing || telephone.length !== 9}
                              className={`w-full ${isCompact ? 'py-1 text-[9px]' : 'py-1.5 text-sm'} bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                              {isProcessing ? <Loader2 className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} /> : <QrCode className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} />}
                              QR
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* OM Card */}
                  <div style={{ perspective: '1000px' }}>
                    <div
                      className={`${cardHeight} relative`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.6s',
                        transform: flippedCards.has('OM') ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                      onClick={() => !flippedCards.has('OM') && toggleFlip('OM')}
                    >
                      {/* Front */}
                      <div
                        className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center cursor-pointer shadow-lg border-2 border-orange-300 vf-touch-target"
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', top: 0, left: 0 }}
                      >
                        <div className={`${iconSize} bg-white rounded-full flex items-center justify-center mb-1 p-1 relative overflow-hidden`}>
                          <Image
                            src="/images/om.png"
                            alt="Orange Money"
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                        <span className={`font-bold text-white ${textSize}`}>OM</span>
                      </div>

                      {/* Back */}
                      <div
                        className={`bg-orange-50 rounded-xl ${isCompact ? 'p-1.5' : 'p-3'} flex flex-col justify-center border-2 border-orange-300`}
                        style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', top: 0, left: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleFlip('OM')}
                          className={`absolute ${isCompact ? 'top-0.5 right-0.5' : 'top-1 right-1'} text-gray-400 hover:text-gray-600 z-10`}
                        >
                          <X className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} />
                        </button>
                        {walletPaiement ? (
                          <>
                            <div className={`text-center font-bold ${isCompact ? 'text-[10px] mb-1' : 'text-xs mb-2'} text-orange-700`}>
                              {formatAmount(montantCible)}
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleWalletDirect('OM')}
                              disabled={isProcessing}
                              className={`w-full ${isCompact ? 'py-2 text-[10px]' : 'py-2.5 text-sm'} bg-orange-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1`}
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />}
                              {t('checkout.confirm')}
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <input
                              type="tel"
                              value={telephone}
                              onChange={(e) => {
                                setTelephone(e.target.value.replace(/[^0-9]/g, ''));
                                setTelephoneError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (telephone.length === 9) {
                                    handleWalletInitiate('OM');
                                  }
                                }
                              }}
                              placeholder="77/78 XXX XX"
                              maxLength={9}
                              className={`w-full ${isCompact ? 'py-1 px-1 text-[11px]' : 'py-2 px-3 text-base'} border ${telephoneError ? 'border-red-300' : 'border-orange-300'} rounded-lg text-center font-semibold mb-1`}
                              autoFocus={flippedCards.has('OM')}
                            />
                            {telephoneError && (
                              <p className={`text-red-500 ${isCompact ? 'text-[8px]' : 'text-sm'} text-center mb-1`}>{telephoneError}</p>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleWalletInitiate('OM')}
                              disabled={isProcessing || telephone.length !== 9}
                              className={`w-full ${isCompact ? 'py-1 text-[9px]' : 'py-1.5 text-sm'} bg-orange-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                              {isProcessing ? <Loader2 className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} /> : <QrCode className={isCompact ? 'w-3 h-3' : 'w-5 h-5'} />}
                              QR
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Erreur globale */}
                {error && (
                  <p className="text-red-600 text-xs text-center mt-2">{error}</p>
                )}
              </div>
            )}

            {/* ÉTAPE: QR Code Wallet */}
            {step === 'WALLET_QR' && activeWalletMethod && (
              <div className="text-center space-y-3">
                {/* Timer */}
                <div className={`flex items-center justify-center gap-2 ${isCompact ? 'p-2' : 'p-3'} bg-amber-50 rounded-xl border border-amber-200`}>
                  <Clock className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} color="#d97706" />
                  <span className={`font-bold text-amber-800 ${textSize}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-xl shadow-inner border inline-block">
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className={isCompact ? 'w-36 h-36' : 'w-48 h-48'}
                    />
                  ) : (
                    <div className={`${isCompact ? 'w-36 h-36' : 'w-48 h-48'} bg-gray-100 animate-pulse rounded-lg`} />
                  )}
                </div>

                {/* Liens OM */}
                {activeWalletMethod === 'OM' && (omDeeplink || maxitUrl) && (
                  <div className="grid grid-cols-2 gap-2">
                    {omDeeplink && (
                      <a
                        href={omDeeplink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${isCompact ? 'py-2 text-xs' : 'py-3 text-sm'} bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-1`}
                      >
                        <Smartphone className="w-4 h-4" />
                        App OM
                      </a>
                    )}
                    {maxitUrl && (
                      <a
                        href={maxitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${isCompact ? 'py-2 text-xs' : 'py-3 text-sm'} bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-1`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        MaxIt
                      </a>
                    )}
                  </div>
                )}

                {/* Lien WAVE */}
                {activeWalletMethod === 'WAVE' && paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full ${isCompact ? 'py-2 text-xs' : 'py-3 text-sm'} bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      {t('checkout.openWave')}
                    </div>
                  </a>
                )}

                {/* Indicateur polling */}
                {isPolling && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className={textSize}>{t('checkout.waiting')}</span>
                  </div>
                )}

                {/* Bouton annuler */}
                <button
                  onClick={onClose}
                  className={`w-full ${isCompact ? 'py-2' : 'py-3'} bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors ${textSize}`}
                >
                  {t('checkout.cancel')}
                </button>
              </div>
            )}

            {/* ÉTAPE: Succès - Minimaliste */}
            {step === 'SUCCESS' && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3`}
                >
                  <CheckCircle className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} text-green-600`} />
                </motion.div>
                <h3 className={`font-bold text-green-800 ${isCompact ? 'text-lg' : 'text-xl'}`}>
                  {t('checkout.success')}
                </h3>
              </div>
            )}

            {/* ÉTAPE: Échec */}
            {step === 'FAILED' && (
              <div className="text-center py-6">
                <AlertCircle className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} text-red-500 mx-auto mb-3`} />
                <h3 className={`font-bold text-red-800 mb-2 ${isCompact ? 'text-base' : 'text-xl'}`}>
                  {t('checkout.failed')}
                </h3>
                <p className={`text-red-600 mb-3 ${textSize}`}>{error}</p>
                <button
                  onClick={handleRetry}
                  className={`px-4 ${isCompact ? 'py-2 text-sm' : 'py-3'} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl`}
                >
                  {t('checkout.retry')}
                </button>
              </div>
            )}

            {/* ÉTAPE: Timeout */}
            {step === 'TIMEOUT' && (
              <div className="text-center py-6">
                <Clock className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} text-amber-500 mx-auto mb-3`} />
                <h3 className={`font-bold text-amber-800 mb-2 ${isCompact ? 'text-base' : 'text-xl'}`}>
                  {t('checkout.timeout')}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={handleRetry}
                    className={`w-full ${isCompact ? 'py-2 text-sm' : 'py-3'} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl`}
                  >
                    {t('checkout.retry')}
                  </button>
                  <button
                    onClick={onClose}
                    className={`w-full ${isCompact ? 'py-2 text-sm' : 'py-3'} bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl`}
                  >
                    {t('checkout.close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
