/**
 * Modal de paiement pour les abonnements FayClick
 * Workflow: Choix formule → Sélection méthode → QR Code → Polling → Création abonnement
 * Timeout: 90 secondes (au lieu de 120 pour factures)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  QrCode,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Smartphone,
  Crown,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  SubscriptionType,
  SubscriptionFormula,
  SUBSCRIPTION_FORMULAS
} from '@/types/subscription.types';
import {
  PaymentMethod,
  PaymentContext,
  WALLET_CONFIG,
  formatAmount
} from '@/types/payment-wallet';
import { paymentWalletService } from '@/services/payment-wallet.service';
import subscriptionService from '@/services/subscription.service';

interface ModalPaiementAbonnementProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  onSuccess: () => void; // Callback après création abonnement réussie
  onError: (message: string) => void;
}

type ModalState =
  | 'SELECT_FORMULA'   // Choix MENSUEL/ANNUEL
  | 'SELECT_METHOD'    // Choix OM/WAVE/FREE
  | 'SHOWING_QR'       // Affichage QR + attente paiement
  | 'PROCESSING'       // Paiement en cours (détecté par polling)
  | 'CREATING_SUB'     // Création abonnement après paiement validé
  | 'SUCCESS'          // Abonnement créé avec succès
  | 'FAILED'           // Échec paiement ou création
  | 'TIMEOUT';         // Timeout 90s

interface FormulaMontant extends SubscriptionFormula {
  montant: number;
}

export default function ModalPaiementAbonnement({
  isOpen,
  onClose,
  idStructure,
  onSuccess,
  onError
}: ModalPaiementAbonnementProps) {
  // États principaux
  const [modalState, setModalState] = useState<ModalState>('SELECT_FORMULA');
  const [selectedFormula, setSelectedFormula] = useState<SubscriptionType | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Exclude<PaymentMethod, 'CASH'> | null>(null);
  const [formulas, setFormulas] = useState<FormulaMontant[]>([]);

  // États paiement
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentUuid, setPaymentUuid] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(90); // 90 secondes pour abonnement
  const [error, setError] = useState<string>('');

  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(true); // QR Code déplié par défaut

  // Montage côté client (Portal)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Charger les montants des formules à l'ouverture
  useEffect(() => {
    if (isOpen) {
      loadFormulas();
    } else {
      // Reset à la fermeture
      resetModal();
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (modalState === 'SHOWING_QR' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [modalState, timeRemaining]);

  /**
   * Charge les formules avec leurs montants calculés
   */
  const loadFormulas = async () => {
    setIsLoading(true);
    try {
      const [montantMensuel, montantAnnuel] = await Promise.all([
        subscriptionService.calculateAmount('MENSUEL'),
        subscriptionService.calculateAmount('ANNUEL')
      ]);

      const formulasWithAmounts: FormulaMontant[] = [
        {
          ...SUBSCRIPTION_FORMULAS.MENSUEL,
          montant: montantMensuel
        },
        {
          ...SUBSCRIPTION_FORMULAS.ANNUEL,
          montant: montantAnnuel
        }
      ];

      setFormulas(formulasWithAmounts);
    } catch (err) {
      console.error('Erreur chargement formules:', err);
      setError('Impossible de charger les formules d\'abonnement');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sélection d'une formule
   */
  const handleSelectFormula = (type: SubscriptionType) => {
    setSelectedFormula(type);
    setModalState('SELECT_METHOD');
  };

  /**
   * Sélection d'une méthode de paiement et démarrage du workflow
   * Utilise createPayment() existant avec un PaymentContext adapté pour abonnement
   */
  const handleSelectMethod = async (method: Exclude<PaymentMethod, 'CASH'>) => {
    setSelectedMethod(method);
    setIsLoading(true);

    try {
      // Trouver la formule sélectionnée
      const formula = formulas.find((f) => f.type === selectedFormula);
      if (!formula) {
        throw new Error('Formule non trouvée');
      }

      console.log('🚀 [SUBSCRIPTION-MODAL] Création paiement:', {
        formula: formula.type,
        montant: formula.montant,
        method
      });

      // Créer un PaymentContext fictif pour l'abonnement
      // La méthode createPayment() existante attend une structure "facture"
      const paymentContext: PaymentContext = {
        facture: {
          id_facture: 0, // Facture virtuelle pour abonnement
          num_facture: `ABO-${idStructure}-${Date.now()}`,
          nom_client: `Structure ${idStructure}`,
          tel_client: '221000000000', // Numéro fictif
          nom_structure: `Abonnement ${formula.type}`,
          montant_total: formula.montant,
          montant_restant: formula.montant
        },
        montant_acompte: formula.montant
      };

      // Créer le paiement wallet avec la méthode existante
      const paymentResponse = await paymentWalletService.createPayment(
        method,
        paymentContext
      );

      if (!paymentResponse || !paymentResponse.uuid) {
        throw new Error('Échec de la création du paiement');
      }

      console.log('✅ [SUBSCRIPTION-MODAL] Paiement créé:', paymentResponse);

      // Stocker les infos de paiement
      setPaymentUuid(paymentResponse.uuid);
      setQrCode(paymentWalletService.formatQRCode(paymentResponse.qrCode));
      setPaymentUrl(paymentWalletService.extractPaymentUrl(paymentResponse, method));

      // Passer à l'affichage du QR
      setModalState('SHOWING_QR');
      setTimeRemaining(90);

      // Démarrer le polling
      startPolling(paymentResponse.uuid);

    } catch (err) {
      console.error('❌ [SUBSCRIPTION-MODAL] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement');
      setModalState('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Démarre le polling du statut de paiement
   */
  const startPolling = (uuid: string) => {
    console.log('🔄 [SUBSCRIPTION-MODAL] Démarrage polling:', uuid);

    paymentWalletService.startPolling(
      uuid,
      async (status, statusResponse) => {
        console.log('📊 [SUBSCRIPTION-MODAL] Statut reçu:', status, statusResponse);

        switch (status) {
          case 'PROCESSING':
            setModalState('PROCESSING');
            break;

          case 'COMPLETED':
            // Paiement validé → Créer l'abonnement
            await handlePaymentCompleted(uuid, statusResponse);
            break;

          case 'FAILED':
            setModalState('FAILED');
            setError('Le paiement a échoué');
            setTimeout(() => {
              onError('Paiement échoué');
              onClose();
            }, 3000);
            break;

          case 'TIMEOUT':
            handleTimeout();
            break;

          default:
            break;
        }
      },
      90000 // 90 secondes timeout
    );
  };

  /**
   * Gère le paiement complété et crée l'abonnement
   */
  const handlePaymentCompleted = async (uuid: string, statusResponse?: any) => {
    setModalState('CREATING_SUB');

    try {
      if (!selectedFormula || !selectedMethod) {
        throw new Error('Formule ou méthode non sélectionnée');
      }

      console.log('📝 [SUBSCRIPTION-MODAL] Création abonnement avec UUID:', uuid);

      // Créer l'abonnement avec l'UUID du paiement validé
      const response = await subscriptionService.createSubscription({
        id_structure: idStructure,
        type_abonnement: selectedFormula,
        methode: selectedMethod,
        uuid_paiement: uuid
      });

      if (!response.success) {
        throw new Error(response.message || 'Échec de la création');
      }

      console.log('✅ [SUBSCRIPTION-MODAL] Abonnement créé:', response.data);

      setModalState('SUCCESS');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('❌ [SUBSCRIPTION-MODAL] Erreur création abonnement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      setModalState('FAILED');

      setTimeout(() => {
        onError(err instanceof Error ? err.message : 'Erreur inconnue');
        onClose();
      }, 3000);
    }
  };

  /**
   * Gère le timeout (90s écoulées sans paiement)
   */
  const handleTimeout = () => {
    console.log('⏱️ [SUBSCRIPTION-MODAL] Timeout du paiement');
    setModalState('TIMEOUT');
    paymentWalletService.stopPolling();

    setTimeout(() => {
      onError('Temps écoulé - Paiement non confirmé');
      onClose();
    }, 3000);
  };

  /**
   * Réinitialise le modal
   */
  const resetModal = () => {
    setModalState('SELECT_FORMULA');
    setSelectedFormula(null);
    setSelectedMethod(null);
    setQrCode('');
    setPaymentUrl(null);
    setPaymentUuid('');
    setTimeRemaining(90);
    setError('');
    setIsLoading(false);
    paymentWalletService.stopPolling();
  };

  /**
   * Fermeture du modal
   */
  const handleClose = () => {
    paymentWalletService.stopPolling();
    onClose();
  };

  // Ne rien rendre si pas monté ou pas ouvert
  if (!mounted || !isOpen) return null;

  // Configuration wallet sélectionnée
  const walletConfig = selectedMethod ? WALLET_CONFIG[selectedMethod] : null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && modalState === 'SELECT_FORMULA') {
              handleClose();
            }
          }}
        >
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Background glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-orange-50/50" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-orange-500/5" />

            {/* Contenu */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">
                      {modalState === 'SELECT_FORMULA' && 'Choisir votre abonnement'}
                      {modalState === 'SELECT_METHOD' && 'Mode de paiement'}
                      {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && 'Paiement en cours'}
                      {modalState === 'CREATING_SUB' && 'Finalisation...'}
                      {modalState === 'SUCCESS' && 'Abonnement activé !'}
                      {modalState === 'FAILED' && 'Échec'}
                      {modalState === 'TIMEOUT' && 'Temps écoulé'}
                    </h2>
                    {selectedFormula && (
                      <p className="text-xs md:text-sm text-gray-600">
                        Abonnement {selectedFormula}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bouton fermer (sauf pendant création) */}
                {modalState !== 'CREATING_SUB' && modalState !== 'PROCESSING' && (
                  <button
                    onClick={handleClose}
                    className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              {/* Corps du modal */}
              <div className="p-5 md:p-6">
                {/* SELECT_FORMULA : Choix formule */}
                {modalState === 'SELECT_FORMULA' && (
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      formulas.map((formula) => (
                        <button
                          key={formula.type}
                          onClick={() => handleSelectFormula(formula.type)}
                          className="w-full p-4 md:p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all group text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <h3 className="font-bold text-gray-900">
                                  {formula.type}
                                </h3>
                                {formula.badge && (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    formula.badgeColor === 'emerald'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {formula.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs md:text-sm text-gray-600">
                                {formula.description}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg md:text-2xl font-bold text-gray-900 whitespace-nowrap">
                                {Number(formula.montant).toLocaleString('fr-FR')}
                              </p>
                              <p className="text-xs text-gray-500">FCFA</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* SELECT_METHOD : Choix méthode */}
                {modalState === 'SELECT_METHOD' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Sélectionnez votre mode de paiement
                    </p>

                    {/* Grille 3×1 pour les wallets */}
                    <div className="grid grid-cols-3 gap-3">
                      {(['OM', 'WAVE', 'FREE'] as const).map((method) => {
                        const config = WALLET_CONFIG[method];
                        const logoPath = method === 'OM' ? '/images/om.png' : method === 'WAVE' ? '/images/wave.png' : '/images/free.png';

                        return (
                          <button
                            key={method}
                            onClick={() => handleSelectMethod(method)}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group aspect-square"
                          >
                            {/* Logo wallet */}
                            <div className="w-16 h-16 mb-3 flex items-center justify-center">
                              <img
                                src={logoPath}
                                alt={config.name}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Nom wallet */}
                            <span className="text-sm font-semibold text-gray-900 text-center">
                              {config.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setModalState('SELECT_FORMULA')}
                      className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      ← Retour aux formules
                    </button>
                  </div>
                )}

                {/* SHOWING_QR / PROCESSING : Affichage QR + polling */}
                {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && walletConfig && (
                  <div className="space-y-4">
                    {/* Timer */}
                    <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-900">
                        Temps restant : {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* QR Code - Accordéon dépliable */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Header accordéon */}
                      <button
                        onClick={() => setQrExpanded(!qrExpanded)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold text-gray-900">
                            QR Code de paiement
                          </span>
                          {modalState === 'PROCESSING' && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                              Détecté
                            </span>
                          )}
                        </div>
                        {qrExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* Contenu accordéon */}
                      <AnimatePresence>
                        {qrExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 flex justify-center bg-gray-50">
                              <div className="relative p-4 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                {qrCode ? (
                                  <img
                                    src={qrCode}
                                    alt="QR Code"
                                    className="w-64 h-64 md:w-72 md:h-72"
                                  />
                                ) : (
                                  <div className="w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Scannez le QR Code</p>
                          <p>
                            Ouvrez votre application {walletConfig.name} et scannez ce code pour payer votre abonnement.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lien paiement (si disponible) */}
                    {paymentUrl && (
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-center font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg"
                      >
                        Ouvrir {walletConfig.name}
                      </a>
                    )}
                  </div>
                )}

                {/* CREATING_SUB : Création abonnement */}
                {modalState === 'CREATING_SUB' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-16 h-16 animate-spin text-emerald-600 mb-4" />
                    <p className="text-lg font-semibold text-gray-900">
                      Activation de votre abonnement...
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Veuillez patienter
                    </p>
                  </div>
                )}

                {/* SUCCESS */}
                {modalState === 'SUCCESS' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      Abonnement activé !
                    </p>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Votre abonnement {selectedFormula} a été activé avec succès.
                    </p>
                  </div>
                )}

                {/* FAILED */}
                {modalState === 'FAILED' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      Échec
                    </p>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {error || 'Une erreur est survenue'}
                    </p>
                  </div>
                )}

                {/* TIMEOUT */}
                {modalState === 'TIMEOUT' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Clock className="w-10 h-10 text-orange-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      Temps écoulé
                    </p>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Le paiement n'a pas été confirmé dans le délai imparti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
