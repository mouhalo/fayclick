/**
 * Modal de paiement pour les abonnements FayClick
 * Tarification: 100 FCFA/jour - Choix libre du nombre de jours
 * Workflow: Choix jours → Sélection méthode → QR Code → Polling → Création abonnement
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
  ChevronDown,
  ChevronUp,
  Minus,
  Plus
} from 'lucide-react';
import { SUBSCRIPTION_PRICING, DAY_PRESETS } from '@/types/subscription.types';
import {
  PaymentMethod,
  WALLET_CONFIG,
} from '@/types/payment-wallet';
import { paymentWalletService } from '@/services/payment-wallet.service';
import subscriptionService from '@/services/subscription.service';

interface ModalPaiementAbonnementProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  nomStructure: string;
  telStructure: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  comptePrive?: boolean;   // Si true, montant fixe mensualite
  mensualite?: number;     // Montant fixe pour compte privé
}

type ModalState =
  | 'SELECT_DAYS'      // Choix nombre de jours
  | 'SELECT_METHOD'    // Choix OM/WAVE/FREE
  | 'SHOWING_QR'       // Affichage QR + attente paiement
  | 'PROCESSING'       // Paiement en cours
  | 'CREATING_SUB'     // Création abonnement
  | 'SUCCESS'          // Abonnement créé
  | 'FAILED'           // Échec
  | 'TIMEOUT';         // Timeout 90s

const PRIX_JOUR = SUBSCRIPTION_PRICING.PRIX_JOUR; // 100 FCFA

export default function ModalPaiementAbonnement({
  isOpen,
  onClose,
  idStructure,
  nomStructure,
  telStructure,
  onSuccess,
  onError,
  comptePrive = false,
  mensualite = 0
}: ModalPaiementAbonnementProps) {
  // États principaux
  const [modalState, setModalState] = useState<ModalState>('SELECT_DAYS');
  const [nombreJours, setNombreJours] = useState<number>(1);
  const [selectedMethod, setSelectedMethod] = useState<Exclude<PaymentMethod, 'CASH'> | null>(null);

  // États paiement
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [omDeeplink, setOmDeeplink] = useState<string | null>(null);
  const [maxitUrl, setMaxitUrl] = useState<string | null>(null);
  const [paymentUuid, setPaymentUuid] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [error, setError] = useState<string>('');

  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(true);
  const [customInput, setCustomInput] = useState(false);

  // Montant calculé : fixe pour compte privé, sinon basé sur le nombre de jours
  const montant = comptePrive ? mensualite : nombreJours * PRIX_JOUR;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) resetModal();
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

  const handleSelectPreset = (jours: number) => {
    setNombreJours(jours);
    setCustomInput(false);
    setModalState('SELECT_METHOD');
  };

  const handleConfirmCustom = () => {
    if (nombreJours >= 1) {
      setModalState('SELECT_METHOD');
    }
  };

  const adjustDays = (delta: number) => {
    setNombreJours((prev) => Math.max(1, Math.min(365, prev + delta)));
  };

  /**
   * Sélection méthode de paiement et démarrage du workflow
   */
  const handleSelectMethod = async (method: Exclude<PaymentMethod, 'CASH'>) => {
    setSelectedMethod(method);
    setIsLoading(true);

    try {
      console.log('🚀 [SUBSCRIPTION-MODAL] Création paiement:', {
        nombreJours,
        montant,
        method
      });

      const typeAbonnement = comptePrive ? 'MENSUEL' : (nombreJours <= 1 ? 'JOURNALIER' : nombreJours <= 7 ? 'HEBDOMADAIRE' : nombreJours <= 31 ? 'MENSUEL' : 'ANNUEL');
      const paymentResponse = await paymentWalletService.createSubscriptionPaymentDirect({
        idStructure,
        typeAbonnement,
        montant,
        methode: method,
        nomStructure,
        telStructure
      });

      if (!paymentResponse || !paymentResponse.uuid) {
        throw new Error('Echec de la creation du paiement');
      }

      setPaymentUuid(paymentResponse.uuid);
      setQrCode(paymentWalletService.formatQRCode(paymentResponse.qrCode));

      if (method === 'OM') {
        setOmDeeplink(paymentResponse.om || null);
        setMaxitUrl(paymentResponse.maxit || null);
        setPaymentUrl(null);
      } else {
        setPaymentUrl(paymentWalletService.extractPaymentUrl(paymentResponse, method));
        setOmDeeplink(null);
        setMaxitUrl(null);
      }

      setModalState('SHOWING_QR');
      setTimeRemaining(90);
      startPolling(paymentResponse.uuid, comptePrive ? 30 : nombreJours, method);

    } catch (err) {
      console.error('❌ [SUBSCRIPTION-MODAL] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation du paiement');
      setModalState('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Polling du statut de paiement
   */
  const startPolling = (
    uuid: string,
    jours: number,
    method: Exclude<PaymentMethod, 'CASH'>
  ) => {
    paymentWalletService.startPolling(
      uuid,
      async (status, statusResponse) => {
        switch (status) {
          case 'PROCESSING':
            setModalState('PROCESSING');
            break;
          case 'COMPLETED':
            await handlePaymentCompleted(uuid, jours, method, statusResponse);
            break;
          case 'FAILED':
            setModalState('FAILED');
            setError('Le paiement a echoue');
            setTimeout(() => { onError('Paiement echoue'); onClose(); }, 3000);
            break;
          case 'TIMEOUT':
            handleTimeout();
            break;
        }
      },
      90000
    );
  };

  /**
   * Paiement complété → créer l'abonnement via renouveler_abonnement avec nombre_jours
   */
  const handlePaymentCompleted = async (
    uuid: string,
    jours: number,
    method: Exclude<PaymentMethod, 'CASH'>,
    statusResponse?: any
  ) => {
    setModalState('CREATING_SUB');

    try {
      // Déterminer le type effectif selon le nombre de jours
      const typeAbonnement = jours <= 1 ? 'JOURNALIER' as const
        : jours <= 7 ? 'HEBDOMADAIRE' as const
        : jours <= 31 ? 'MENSUEL' as const
        : jours <= 93 ? 'TRIMESTRIEL' as const
        : jours <= 186 ? 'SEMESTRIEL' as const
        : 'ANNUEL' as const;

      // Générer ref_abonnement et numrecu (NOT NULL en BD)
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
      const refAbonnement = `ABO-${idStructure}-${timestamp}`;
      const numRecu = `REC-${idStructure}-${timestamp}`;

      console.log('🚀 [SUBSCRIPTION-MODAL] Enregistrement abonnement:', {
        uuid, jours, method, typeAbonnement, refAbonnement, numRecu
      });

      // Appel avec nombre_jours + ref + recu
      const response = await subscriptionService.renewSubscription({
        id_structure: idStructure,
        type_abonnement: typeAbonnement,
        methode: method,
        uuid_paiement: uuid,
        nombre_jours: jours,
        ref_abonnement: refAbonnement,
        numrecu: numRecu
      });

      console.log('📋 [SUBSCRIPTION-MODAL] Reponse:', JSON.stringify(response, null, 2));

      if (!response.success) {
        throw new Error(response.message || 'Echec de la creation');
      }

      setModalState('SUCCESS');
      setTimeout(() => { onSuccess(); onClose(); }, 2000);

    } catch (err) {
      console.error('❌ [SUBSCRIPTION-MODAL] Erreur creation abonnement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation');
      setModalState('FAILED');
      setTimeout(() => { onError(err instanceof Error ? err.message : 'Erreur inconnue'); onClose(); }, 3000);
    }
  };

  const handleTimeout = () => {
    setModalState('TIMEOUT');
    paymentWalletService.stopPolling();
    setTimeout(() => { onError('Temps ecoule - Paiement non confirme'); onClose(); }, 3000);
  };

  const resetModal = () => {
    setModalState(comptePrive ? 'SELECT_METHOD' : 'SELECT_DAYS');
    setNombreJours(comptePrive ? 30 : 1);
    setSelectedMethod(null);
    setQrCode('');
    setPaymentUrl(null);
    setOmDeeplink(null);
    setMaxitUrl(null);
    setPaymentUuid('');
    setTimeRemaining(90);
    setError('');
    setIsLoading(false);
    setCustomInput(false);
    paymentWalletService.stopPolling();
  };

  const handleClose = () => {
    paymentWalletService.stopPolling();
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const walletConfig = selectedMethod ? WALLET_CONFIG[selectedMethod] : null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && modalState === 'SELECT_DAYS') handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-orange-50/50" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-orange-500/5" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">
                      {modalState === 'SELECT_DAYS' && 'Activer votre abonnement'}
                      {modalState === 'SELECT_METHOD' && (comptePrive ? 'Renouveler l\'abonnement' : 'Mode de paiement')}
                      {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && 'Paiement en cours'}
                      {modalState === 'CREATING_SUB' && 'Finalisation...'}
                      {modalState === 'SUCCESS' && 'Abonnement active !'}
                      {modalState === 'FAILED' && 'Echec'}
                      {modalState === 'TIMEOUT' && 'Temps ecoule'}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">
                      {comptePrive ? `${mensualite.toLocaleString('fr-FR')} FCFA / mois` : '100 FCFA / jour'}
                    </p>
                  </div>
                </div>

                {modalState !== 'CREATING_SUB' && modalState !== 'PROCESSING' && (
                  <button
                    onClick={handleClose}
                    className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              {/* Corps */}
              <div className="p-5 md:p-6">

                {/* SELECT_DAYS : Choix nombre de jours */}
                {modalState === 'SELECT_DAYS' && (
                  <div className="space-y-4">
                    {/* Presets rapides */}
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {DAY_PRESETS.map((preset) => (
                        <button
                          key={preset.jours}
                          onClick={() => handleSelectPreset(preset.jours)}
                          className="p-3 md:p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                        >
                          <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-bold text-sm md:text-base text-gray-900">{preset.label}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm md:text-lg font-bold text-emerald-600 whitespace-nowrap">
                              {(preset.jours * PRIX_JOUR).toLocaleString('fr-FR')} FCFA
                            </span>
                            {preset.badge && (
                              <span className={`px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full flex-shrink-0 ${
                                preset.badgeColor === 'emerald'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {preset.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Séparateur */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <button
                        onClick={() => setCustomInput(!customInput)}
                        className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                      >
                        {customInput ? 'Masquer' : 'Autre durée'}
                      </button>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Saisie personnalisée */}
                    {customInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200"
                      >
                        <p className="text-sm text-gray-600 mb-3 text-center">
                          Choisissez votre nombre de jours
                        </p>

                        {/* Compteur +/- */}
                        <div className="flex items-center justify-center gap-4 mb-3">
                          <button
                            onClick={() => adjustDays(-1)}
                            disabled={nombreJours <= 1}
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-300 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <Minus className="w-5 h-5 text-gray-700" />
                          </button>

                          <div className="text-center min-w-[100px]">
                            <input
                              type="number"
                              value={nombreJours}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                setNombreJours(Math.max(1, Math.min(365, v)));
                              }}
                              className="w-20 text-center text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-emerald-400 focus:outline-none focus:border-emerald-600"
                              min={1}
                              max={365}
                            />
                            <p className="text-xs text-gray-500 mt-1">jour{nombreJours > 1 ? 's' : ''}</p>
                          </div>

                          <button
                            onClick={() => adjustDays(1)}
                            disabled={nombreJours >= 365}
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-300 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <Plus className="w-5 h-5 text-gray-700" />
                          </button>
                        </div>

                        {/* Raccourcis rapides */}
                        <div className="flex justify-center gap-2 mb-4">
                          {[3, 10, 15, 45, 90].map((j) => (
                            <button
                              key={j}
                              onClick={() => setNombreJours(j)}
                              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                                nombreJours === j
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                              }`}
                            >
                              {j}j
                            </button>
                          ))}
                        </div>

                        {/* Montant */}
                        <div className="text-center p-3 bg-white rounded-lg border border-emerald-200">
                          <p className="text-sm text-gray-500">Montant total</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            {montant.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>

                        {/* Bouton confirmer */}
                        <button
                          onClick={handleConfirmCustom}
                          className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg"
                        >
                          Continuer avec {nombreJours} jour{nombreJours > 1 ? 's' : ''} - {montant.toLocaleString('fr-FR')} FCFA
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* SELECT_METHOD : Choix méthode */}
                {modalState === 'SELECT_METHOD' && (
                  <div className="space-y-4">
                    {/* Résumé */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <p className="text-sm text-gray-600">
                        {comptePrive ? 'Abonnement mensuel (tarif fixe)' : 'Abonnement'}
                      </p>
                      {!comptePrive && (
                        <p className="text-xl font-bold text-gray-900">
                          {nombreJours} jour{nombreJours > 1 ? 's' : ''}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-emerald-600">
                        {montant.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>

                    <p className="text-sm text-gray-600">
                      Selectionnez votre mode de paiement
                    </p>

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
                            <div className="w-16 h-16 mb-3 flex items-center justify-center">
                              <img src={logoPath} alt={config.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-semibold text-gray-900 text-center">
                              {config.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
                        <span className="text-sm text-gray-600">Creation du paiement...</span>
                      </div>
                    )}

                    {!comptePrive && (
                      <button
                        onClick={() => setModalState('SELECT_DAYS')}
                        disabled={isLoading}
                        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                      >
                        ← Modifier la duree
                      </button>
                    )}
                  </div>
                )}

                {/* SHOWING_QR / PROCESSING */}
                {(modalState === 'SHOWING_QR' || modalState === 'PROCESSING') && walletConfig && (
                  <div className="space-y-4">
                    {/* Timer */}
                    <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-900">
                        Temps restant : {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* QR Code accordéon */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button
                        onClick={() => setQrExpanded(!qrExpanded)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold text-gray-900">QR Code de paiement</span>
                          {modalState === 'PROCESSING' && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                              Detecte
                            </span>
                          )}
                        </div>
                        {qrExpanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                      </button>

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
                                  <img src={qrCode} alt="QR Code" className="w-48 h-48 md:w-64 md:h-64" />
                                ) : (
                                  <div className="w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
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
                            Ouvrez votre application {walletConfig.name} et scannez ce code pour payer{' '}
                            <strong>{montant.toLocaleString('fr-FR')} FCFA</strong> ({nombreJours} jour{nombreJours > 1 ? 's' : ''}).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Liens OM */}
                    {selectedMethod === 'OM' && (omDeeplink || maxitUrl) && (
                      <div className="space-y-3">
                        {omDeeplink && (
                          <a href={omDeeplink} target="_blank" rel="noopener noreferrer"
                            className="block w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg">
                            📱 Ouvrir Orange Money
                          </a>
                        )}
                        {maxitUrl && (
                          <a href={maxitUrl} target="_blank" rel="noopener noreferrer"
                            className="block w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-center font-semibold rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg">
                            🌐 Payer via MaxIt Web
                          </a>
                        )}
                      </div>
                    )}

                    {/* Lien WAVE/FREE */}
                    {selectedMethod !== 'OM' && paymentUrl && (
                      <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                        className="block w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-center font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg">
                        Ouvrir {walletConfig.name}
                      </a>
                    )}
                  </div>
                )}

                {/* CREATING_SUB */}
                {modalState === 'CREATING_SUB' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-16 h-16 animate-spin text-emerald-600 mb-4" />
                    <p className="text-lg font-semibold text-gray-900">Activation de votre abonnement...</p>
                    <p className="text-sm text-gray-600 mt-2">Veuillez patienter</p>
                  </div>
                )}

                {/* SUCCESS */}
                {modalState === 'SUCCESS' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">Abonnement active !</p>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {nombreJours} jour{nombreJours > 1 ? 's' : ''} active{nombreJours > 1 ? 's' : ''} pour {montant.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                )}

                {/* FAILED */}
                {modalState === 'FAILED' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">Echec</p>
                    <p className="text-sm text-gray-600 mt-2 text-center">{error || 'Une erreur est survenue'}</p>
                  </div>
                )}

                {/* TIMEOUT */}
                {modalState === 'TIMEOUT' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Clock className="w-10 h-10 text-orange-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">Temps ecoule</p>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Le paiement n&apos;a pas ete confirme dans le delai imparti.
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
