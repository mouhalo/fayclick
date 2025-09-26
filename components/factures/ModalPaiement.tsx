/**
 * Modal de paiement d'acompte pour les factures
 * Design responsive selon les standards modals de l'application
 * Intégration avec le système de paiement wallet (OM, Wave, Free)
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  Calculator,
  AlertCircle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { FactureComplete, AjouterAcompteData } from '@/types/facture';
import { factureService } from '@/services/facture.service';
import { ModalChoixPaiement } from './ModalChoixPaiement';
import { ModalPaiementQRCode } from './ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';

interface ModalPaiementProps {
  isOpen: boolean;
  onClose: () => void;
  facture: FactureComplete | null;
  onSuccess?: (nouvelleFacture: unknown) => void;
}

export function ModalPaiement({ isOpen, onClose, facture, onSuccess }: ModalPaiementProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // États principaux
  const [montantAcompte, setMontantAcompte] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // États pour les nouveaux modals
  const [showChoixPaiement, setShowChoixPaiement] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // État pour stocker les données de paiement wallet
  const [walletPaymentData, setWalletPaymentData] = useState<{
    uuid: string;
    transaction_id: string;
  } | null>(null);

  // Reset des états à l'ouverture
  useEffect(() => {
    if (isOpen && facture) {
      setMontantAcompte('');
      setError('');
      setSuccess(false);
      setShowChoixPaiement(false);
      setShowQRCode(false);
      setSelectedPaymentMethod(null);
      setWalletPaymentData(null);
    }
  }, [isOpen, facture]);

  // Calculs des montants
  const montants = useMemo(() => {
    if (!facture) return null;
    
    const montantSaisi = parseFloat(montantAcompte) || 0;
    const montantRestant = facture.facture.mt_restant;
    const nouveauRestant = Math.max(0, montantRestant - montantSaisi);
    const estSoldee = nouveauRestant === 0;
    
    return {
      montantSaisi,
      montantRestant,
      nouveauRestant,
      estSoldee,
      pourcentagePaye: montantRestant > 0 ? (montantSaisi / montantRestant) * 100 : 0
    };
  }, [facture, montantAcompte]);

  // Validation
  const validation = useMemo(() => {
    if (!facture || !montants) return { isValid: false, errors: [] };
    
    const errors: string[] = [];
    
    if (montants.montantSaisi <= 0) {
      errors.push('Le montant doit être supérieur à 0');
    }
    
    if (montants.montantSaisi > montants.montantRestant) {
      errors.push('Le montant ne peut pas dépasser le restant à payer');
    }
    
    return {
      isValid: errors.length === 0 && montants.montantSaisi > 0,
      errors
    };
  }, [facture, montants]);

  // Styles responsives
  const getModalStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-sm p-4',
        title: 'text-lg',
        subtitle: 'text-sm',
        input: 'text-base p-3',
        button: 'text-sm px-4 py-2',
        icon: 'w-5 h-5'
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-lg p-5',
        title: 'text-xl',
        subtitle: 'text-base',
        input: 'text-base p-3',
        button: 'text-base px-5 py-2.5',
        icon: 'w-5 h-5'
      };
    } else {
      return {
        container: 'max-w-lg p-6',
        title: 'text-2xl',
        subtitle: 'text-base',
        input: 'text-lg p-4',
        button: 'text-base px-6 py-3',
        icon: 'w-6 h-6'
      };
    }
  };

  const styles = getModalStyles();

  // Générer le transaction_id pour paiement CASH
  const generateCashTransactionId = (): string => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `CASH-${facture?.facture.id_structure}-${day}${month}${year}${hours}${minutes}`;
  };

  // Ouvrir le modal de choix de paiement
  const handleSubmit = async () => {
    if (!facture || !validation.isValid || !montants) return;

    // Ouvrir le modal de choix de paiement
    setShowChoixPaiement(true);
  };

  // Gérer la sélection du mode de paiement
  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowChoixPaiement(false);

    if (method === 'CASH') {
      // Paiement cash - utiliser l'ancien système avec les nouvelles données
      await processCashPayment();
    } else {
      // Paiement wallet - ouvrir le modal QR Code
      setShowQRCode(true);
    }
  };

  // Traiter le paiement cash avec les nouvelles spécifications
  const processCashPayment = async () => {
    if (!facture || !montants) return;

    setLoading(true);
    setError('');

    try {
      const acompteData: AjouterAcompteData = {
        id_structure: facture.facture.id_structure,
        id_facture: facture.facture.id_facture,
        montant_acompte: montants.montantSaisi,
        transaction_id: generateCashTransactionId(),
        uuid: 'face2face'
      };

      console.log('💰 [CASH] Enregistrement acompte avec:', {
        transaction_id: acompteData.transaction_id,
        uuid: acompteData.uuid,
        montant: acompteData.montant_acompte
      });

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(response);
        }

        // Fermer automatiquement après 2 secondes
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  // Gérer le succès du paiement wallet avec récupération des données
  const handleWalletPaymentComplete = async (paymentStatusResponse: any) => {
    if (!facture || !montants || !selectedPaymentMethod) return;

    try {
      console.log('🔄 [WALLET] Traitement paiement wallet réussi:', paymentStatusResponse);

      // Extraire UUID et transaction_id depuis la réponse
      let uuid = '';
      let transaction_id = '';

      if (paymentStatusResponse?.data?.uuid) {
        uuid = paymentStatusResponse.data.uuid;
      }

      if (paymentStatusResponse?.data?.reference_externe) {
        transaction_id = paymentStatusResponse.data.reference_externe;
      }

      console.log('💳 [WALLET] Données extraites:', {
        uuid,
        transaction_id,
        status: paymentStatusResponse?.data?.statut
      });

      // Vérifier que nous avons les données nécessaires
      if (!uuid || !transaction_id) {
        console.error('❌ [WALLET] Données manquantes:', { uuid, transaction_id });
        throw new Error('Données de paiement incomplètes (UUID ou transaction_id manquant)');
      }

      // Ajouter l'acompte avec les données de paiement wallet
      const acompteData: AjouterAcompteData = {
        id_structure: facture.facture.id_structure,
        id_facture: facture.facture.id_facture,
        montant_acompte: montants.montantSaisi,
        transaction_id: transaction_id,
        uuid: uuid
      };

      console.log('💾 [WALLET] Enregistrement acompte avec:', acompteData);

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setShowQRCode(false);
        setSuccess(true);
        if (onSuccess) {
          onSuccess(response);
        }

        // Fermer automatiquement après 2 secondes
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('❌ [WALLET] Erreur enregistrement acompte:', error);
      setShowQRCode(false);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement wallet');
    }
  };

  // Gérer l'échec du paiement wallet
  const handleWalletPaymentFailed = (error: string) => {
    console.error('❌ [WALLET] Échec du paiement wallet:', error);
    setShowQRCode(false);
    setError(error);
  };

  // Créer le contexte de paiement pour les modals wallet
  const createPaymentContext = (): PaymentContext | null => {
    if (!facture || !montants) return null;

    return {
      facture: {
        id_facture: facture.facture.id_facture,
        num_facture: facture.facture.num_facture,
        nom_client: facture.facture.nom_client,
        tel_client: facture.facture.tel_client,
        montant_total: facture.facture.montant,
        montant_restant: facture.facture.mt_restant,
        nom_structure: facture.facture.nom_structure
      },
      montant_acompte: montants.montantSaisi
    };
  };

  // Raccourcis de montant
  const getMontantRaccourcis = () => {
    if (!montants) return [];
    
    const restant = montants.montantRestant;
    const raccourcis = [];
    
    if (restant > 1000) {
      raccourcis.push(
        { label: '25%', value: Math.round(restant * 0.25) },
        { label: '50%', value: Math.round(restant * 0.5) },
        { label: '75%', value: Math.round(restant * 0.75) }
      );
    }
    
    raccourcis.push({ label: 'Tout', value: restant });
    
    return raccourcis;
  };

  if (!isOpen || !facture) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`
            bg-gradient-to-br from-white via-white to-blue-50/30 
            rounded-2xl shadow-2xl border border-white/50 
            backdrop-blur-sm w-full max-h-[90vh] overflow-y-auto
            ${styles.container}
          `}
        >
          {success ? (
            // État de succès
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </motion.div>
              
              <h2 className={`text-emerald-900 font-bold mb-2 ${styles.title}`}>
                Paiement enregistré !
              </h2>
              
              <p className={`text-emerald-700 ${styles.subtitle}`}>
                {montants?.estSoldee 
                  ? 'La facture a été entièrement payée'
                  : `Acompte de ${montants?.montantSaisi.toLocaleString('fr-FR')} FCFA ajouté`
                }
              </p>

              {/* Afficher les détails du paiement selon le mode */}
              {selectedPaymentMethod && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    Mode de paiement : {selectedPaymentMethod === 'CASH' ? 'Espèces' : selectedPaymentMethod}
                  </p>
                  {walletPaymentData && selectedPaymentMethod !== 'CASH' && (
                    <>
                      <p className="text-xs text-emerald-600 mt-1">
                        Transaction : {walletPaymentData.transaction_id}
                      </p>
                      <p className="text-xs text-emerald-600">
                        UUID : {walletPaymentData.uuid}
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === 'CASH' && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Transaction : {generateCashTransactionId()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* En-tête */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className={`text-gray-900 font-bold ${styles.title}`}>
                      Ajouter un acompte
                    </h2>
                    <p className={`text-gray-600 ${styles.subtitle}`}>
                      {facture.facture.num_facture}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Informations facture */}
              <div className="bg-blue-50/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Client</p>
                    <p className={`text-gray-900 ${styles.subtitle}`}>{facture.facture.nom_client}</p>
                  </div>
                  <div>
                    <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Montant total</p>
                    <p className={`text-gray-900 font-bold ${styles.subtitle}`}>
                      {facture.facture.montant.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div>
                    <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Déjà payé</p>
                    <p className={`text-emerald-600 font-bold ${styles.subtitle}`}>
                      {facture.facture.mt_acompte.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div>
                    <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Reste à payer</p>
                    <p className={`text-amber-600 font-bold ${styles.subtitle}`}>
                      {facture.facture.mt_restant.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>

              {/* Saisie du montant */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-gray-700 font-medium mb-2 ${styles.subtitle}`}>
                    Montant de l&apos;acompte
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={montantAcompte}
                      onChange={(e) => setMontantAcompte(e.target.value)}
                      placeholder="0"
                      className={`
                        w-full pl-10 pr-16 border border-gray-200 rounded-xl 
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        bg-white/70 backdrop-blur-sm
                        ${styles.input}
                      `}
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      FCFA
                    </span>
                  </div>
                </div>

                {/* Raccourcis de montant */}
                <div className="flex flex-wrap gap-2">
                  {getMontantRaccourcis().map((raccourci) => (
                    <button
                      key={raccourci.label}
                      onClick={() => setMontantAcompte(raccourci.value.toString())}
                      className={`
                        px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg 
                        hover:bg-blue-200 transition-colors
                        ${montants?.montantSaisi === raccourci.value ? 'bg-blue-200 font-medium' : ''}
                      `}
                      disabled={loading}
                    >
                      {raccourci.label}
                    </button>
                  ))}
                </div>

                {/* Aperçu des calculs */}
                {montants && montants.montantSaisi > 0 && (
                  <div className="bg-emerald-50/50 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Calculator className="w-4 h-4 text-emerald-600 mr-2" />
                      <span className={`text-emerald-800 font-medium ${styles.subtitle}`}>
                        Aperçu du paiement
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Montant à payer:</span>
                        <span className="font-medium">{montants.montantSaisi.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Nouveau restant:</span>
                        <span className="font-medium text-amber-600">
                          {montants.nouveauRestant.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      {montants.estSoldee && (
                        <div className="text-center mt-2">
                          <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Facture soldée
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages d'erreur */}
              {(error || validation.errors.length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      {error && (
                        <p className="text-red-800 text-sm font-medium">{error}</p>
                      )}
                      {validation.errors.map((err, idx) => (
                        <p key={idx} className="text-red-700 text-sm">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className={`
                    flex-1 bg-gray-100 text-gray-700 rounded-xl 
                    hover:bg-gray-200 transition-colors font-medium
                    ${styles.button}
                  `}
                  disabled={loading}
                >
                  Annuler
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={!validation.isValid || loading}
                  className={`
                    flex-1 bg-blue-500 text-white rounded-xl
                    hover:bg-blue-600 transition-colors font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                    ${styles.button}
                  `}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Traitement...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className={styles.icon} />
                      <span>
                        {montants?.estSoldee ? 'Solder la facture' : 'Ajouter l&apos;acompte'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Modal de choix du mode de paiement */}
        {facture && montants && (
          <ModalChoixPaiement
            isOpen={showChoixPaiement}
            onClose={() => setShowChoixPaiement(false)}
            onSelectMethod={handleSelectPaymentMethod}
            montantAcompte={montants.montantSaisi}
            nomClient={facture.facture.nom_client}
          />
        )}

        {/* Modal de paiement QR Code */}
        {facture && montants && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
          <ModalPaiementQRCode
            isOpen={showQRCode}
            onClose={() => setShowQRCode(false)}
            paymentMethod={selectedPaymentMethod}
            paymentContext={createPaymentContext()!}
            onPaymentComplete={handleWalletPaymentComplete}
            onPaymentFailed={handleWalletPaymentFailed}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}