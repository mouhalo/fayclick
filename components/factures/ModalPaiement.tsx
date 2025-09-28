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
import { recuService } from '@/services/recu.service';
import { ModalChoixPaiement } from './ModalChoixPaiement';
import { ModalPaiementQRCode } from './ModalPaiementQRCode';
import { ModalRecuGenere } from '@/components/recu';
import { PaymentMethodSelector, PaymentMethodError } from './PaymentMethodSelector';
import { ModalConfirmationPaiement } from './ModalConfirmationPaiement';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';

interface ModalPaiementProps {
  isOpen: boolean;
  onClose: () => void;
  facture: FactureComplete | null;
  onSuccess?: (nouvelleFacture: unknown) => void;
  useIntegratedPaymentSelection?: boolean; // Nouveau prop pour activer/désactiver la sélection intégrée
}

export function ModalPaiement({
  isOpen,
  onClose,
  facture,
  onSuccess,
  useIntegratedPaymentSelection = true
}: ModalPaiementProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // États principaux
  const [montantAcompte, setMontantAcompte] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // États pour les nouveaux modals
  const [showChoixPaiement, setShowChoixPaiement] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showConfirmationPaiement, setShowConfirmationPaiement] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod | null>(null);

  // État pour le modal de reçu d'acompte
  const [modalRecuAcompte, setModalRecuAcompte] = useState<{
    isOpen: boolean;
    factureId: number | null;
    walletUsed: PaymentMethod | null;
    montantPaye: number;
    numeroRecu?: string;
    referenceTransaction?: string;
    typePaiement?: 'COMPLET' | 'ACOMPTE';
    montantFactureTotal?: number;
  }>({
    isOpen: false,
    factureId: null,
    walletUsed: null,
    montantPaye: 0
  });

  // État pour stocker les données de paiement wallet
  const [walletPaymentData, setWalletPaymentData] = useState<{
    uuid: string;
    transaction_id: string;
  } | null>(null);

  // Reset des états à l'ouverture
  useEffect(() => {
    if (isOpen && facture) {
      setMontantAcompte('');
      setSelectedPaymentMethod(null);
      setError('');
      setSuccess(false);
      setShowChoixPaiement(false);
      setShowQRCode(false);
      setShowConfirmationPaiement(false);
      setPendingPaymentMethod(null);
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

    // Pour l'ancien flow, vérifier la sélection de mode de paiement
    if (!useIntegratedPaymentSelection && !selectedPaymentMethod) {
      errors.push('Veuillez sélectionner un mode de paiement');
    }

    return {
      isValid: errors.length === 0 && montants.montantSaisi > 0 &&
        (useIntegratedPaymentSelection || selectedPaymentMethod !== null),
      errors
    };
  }, [facture, montants, selectedPaymentMethod, useIntegratedPaymentSelection]);

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

  // Afficher le modal de confirmation avant traitement (nouveau flow)
  const handleMethodAction = async (method: PaymentMethod) => {
    if (!facture || !montants) return;

    // Vérifier que le montant est valide
    if (montants.montantSaisi <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (montants.montantSaisi > montants.montantRestant) {
      setError('Le montant ne peut pas dépasser le restant à payer');
      return;
    }

    // Stocker le mode de paiement sélectionné et afficher la confirmation
    setPendingPaymentMethod(method);
    setSelectedPaymentMethod(method);
    setShowConfirmationPaiement(true);
  };

  // Traitement du paiement après confirmation
  const handleConfirmPayment = async () => {
    if (!facture || !montants || !pendingPaymentMethod) return;

    setShowConfirmationPaiement(false);

    if (pendingPaymentMethod === 'CASH') {
      // Paiement cash - traitement direct
      await processCashPayment();
    } else {
      // Paiement wallet - ouvrir le modal QR Code
      setShowQRCode(true);
    }
  };

  // Fermer le modal de confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmationPaiement(false);
    setPendingPaymentMethod(null);
    setSelectedPaymentMethod(null);
  };

  // Traitement du paiement selon le mode (ancien flow uniquement)
  const handleSubmit = async () => {
    if (!facture || !validation.isValid || !montants) return;

    // Ancien flow avec modal de choix séparé
    setShowChoixPaiement(true);
  };

  // Gérer la sélection du mode de paiement (gardé pour compatibilité avec l'ancien modal)
  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowChoixPaiement(false);

    if (method === 'CASH') {
      // Paiement cash - traitement direct
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

        // Générer automatiquement un reçu pour l'acompte cash
        try {
          console.log('🧾 [ACOMPTE-CASH] Génération reçu pour acompte cash:', {
            factureId: facture.facture.id_facture,
            montantAcompte: montants.montantSaisi,
            paymentMethod: 'CASH'
          });

          const numeroRecu = `REC-${facture.facture.id_structure}-${facture.facture.id_facture}-${Date.now()}`;
          const recuResponse = await recuService.creerRecu({
            id_facture: facture.facture.id_facture,
            id_structure: facture.facture.id_structure,
            methode_paiement: 'CASH', // Le service convertira vers free-money
            montant_paye: montants.montantSaisi, // Montant de l'acompte
            numero_recu: numeroRecu,
            reference_transaction: acompteData.transaction_id,
            numero_telephone: facture.facture.tel_client,
            date_paiement: new Date().toISOString()
          });

          if (recuResponse.success) {
            console.log('✅ [ACOMPTE-CASH] Reçu créé avec succès:', {
              id_recu: recuResponse.id_recu,
              numero_recu: recuResponse.numero_recu || numeroRecu,
              message: recuResponse.message
            });

            // Préparer et afficher le modal de reçu d'acompte cash
            setModalRecuAcompte({
              isOpen: true,
              factureId: facture.facture.id_facture,
              walletUsed: 'CASH',
              montantPaye: montants.montantSaisi,
              numeroRecu: recuResponse.numero_recu || numeroRecu,
              referenceTransaction: acompteData.transaction_id,
              typePaiement: 'ACOMPTE',
              montantFactureTotal: facture.facture.montant
            });
          }
        } catch (recuError) {
          console.error('❌ [ACOMPTE-CASH] Erreur génération reçu:', {
            error: recuError,
            message: recuError instanceof Error ? recuError.message : 'Erreur inconnue',
            factureId: facture.facture.id_facture,
            numeroRecu: numeroRecu
          });
          // Ne pas bloquer le flow principal, le reçu est optionnel
          // Mais informer l'utilisateur que le reçu n'a pas pu être généré
          console.warn('⚠️ [ACOMPTE-CASH] Le paiement a été enregistré mais le reçu n\'a pas pu être généré');
        }

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

        // Générer automatiquement un reçu pour l'acompte
        try {
          console.log('🧾 [ACOMPTE] Génération reçu pour acompte:', {
            factureId: facture.facture.id_facture,
            montantAcompte: montants.montantSaisi,
            paymentMethod: selectedPaymentMethod
          });

          const numeroRecu = `REC-${facture.facture.id_structure}-${facture.facture.id_facture}-${Date.now()}`;
          const recuResponse = await recuService.creerRecu({
            id_facture: facture.facture.id_facture,
            id_structure: facture.facture.id_structure,
            methode_paiement: selectedPaymentMethod, // Le service convertira automatiquement
            montant_paye: montants.montantSaisi, // Montant de l'acompte, pas le total
            numero_recu: numeroRecu,
            reference_transaction: transaction_id,
            numero_telephone: facture.facture.tel_client,
            date_paiement: new Date().toISOString()
          });

          if (recuResponse.success) {
            console.log('✅ [ACOMPTE] Reçu créé avec succès:', {
              id_recu: recuResponse.id_recu,
              numero_recu: recuResponse.numero_recu || numeroRecu,
              message: recuResponse.message
            });

            // Préparer et afficher le modal de reçu d'acompte
            setModalRecuAcompte({
              isOpen: true,
              factureId: facture.facture.id_facture,
              walletUsed: selectedPaymentMethod,
              montantPaye: montants.montantSaisi,
              numeroRecu: recuResponse.numero_recu || numeroRecu,
              referenceTransaction: transaction_id,
              typePaiement: 'ACOMPTE',
              montantFactureTotal: facture.facture.montant
            });
          }
        } catch (recuError) {
          console.error('❌ [ACOMPTE] Erreur génération reçu:', {
            error: recuError,
            message: recuError instanceof Error ? recuError.message : 'Erreur inconnue',
            factureId: facture.facture.id_facture,
            numeroRecu: numeroRecu
          });
          // Ne pas bloquer le flow principal, le reçu est optionnel
          console.warn('⚠️ [ACOMPTE] Le paiement a été enregistré mais le reçu n\'a pas pu être généré');
        }

        if (onSuccess) {
          onSuccess(response);
        }

        // Fermer automatiquement le modal principal après 2 secondes
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

  // Fermer le modal de reçu d'acompte
  const closeModalRecuAcompte = () => {
    setModalRecuAcompte({
      isOpen: false,
      factureId: null,
      walletUsed: null,
      montantPaye: 0,
      numeroRecu: null,
      referenceTransaction: null,
      typePaiement: undefined,
      montantFactureTotal: undefined
    });
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

  // Générer le texte dynamique du bouton selon le mode de paiement
  const getButtonText = () => {
    if (!useIntegratedPaymentSelection) {
      // Ancien flow : texte générique
      return montants?.estSoldee ? 'Solder la facture' : 'Ajouter l\'acompte';
    }

    if (!selectedPaymentMethod || !montants) return 'Sélectionner un mode de paiement';

    const action = montants.estSoldee ? 'Solder' : 'Payer';
    const montant = montants.montantSaisi.toLocaleString('fr-FR');

    switch (selectedPaymentMethod) {
      case 'CASH':
        return `${action} ${montant} FCFA en espèces`;
      case 'OM':
        return `${action} ${montant} FCFA avec Orange Money`;
      case 'WAVE':
        return `${action} ${montant} FCFA avec Wave`;
      case 'FREE':
        return `${action} ${montant} FCFA avec Free Money`;
      default:
        return `${action} ${montant} FCFA`;
    }
  };

  // Obtenir l'icône selon le mode de paiement
  const getButtonIcon = () => {
    if (!useIntegratedPaymentSelection) {
      // Ancien flow : icône générique
      return <CreditCard className={styles.icon} />;
    }

    if (!selectedPaymentMethod) return <CreditCard className={styles.icon} />;

    switch (selectedPaymentMethod) {
      case 'CASH':
        return <DollarSign className={styles.icon} />;
      default:
        return <CreditCard className={styles.icon} />;
    }
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

                {/* Actions de paiement directes (nouveau flow uniquement) */}
                {useIntegratedPaymentSelection && montants && montants.montantSaisi > 0 && (
                  <PaymentMethodSelector
                    onMethodAction={handleMethodAction}
                    onCancel={onClose}
                    size="md"
                    disabled={loading}
                    montant={montants.montantSaisi}
                  />
                )}

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

              {/* Actions - Ancien flow uniquement */}
              {!useIntegratedPaymentSelection && (
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
                        {getButtonIcon()}
                        <span>{getButtonText()}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Message d'aide pour le nouveau flow */}
              {useIntegratedPaymentSelection && (!montants || montants.montantSaisi <= 0) && (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm">
                    Saisissez un montant pour voir les options de paiement
                  </p>
                </div>
              )}
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

        {/* Modal de confirmation de paiement */}
        {facture && montants && pendingPaymentMethod && (
          <ModalConfirmationPaiement
            isOpen={showConfirmationPaiement}
            onClose={handleCancelConfirmation}
            onConfirm={handleConfirmPayment}
            facture={facture}
            montantAcompte={montants.montantSaisi}
            paymentMethod={pendingPaymentMethod}
            disabled={loading}
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

        {/* Modal de reçu d'acompte */}
        {modalRecuAcompte.isOpen && modalRecuAcompte.factureId && modalRecuAcompte.walletUsed && (
          <ModalRecuGenere
            isOpen={modalRecuAcompte.isOpen}
            onClose={closeModalRecuAcompte}
            factureId={modalRecuAcompte.factureId}
            walletUsed={modalRecuAcompte.walletUsed as any} // Conversion PaymentMethod vers WalletType
            montantPaye={modalRecuAcompte.montantPaye}
            numeroRecu={modalRecuAcompte.numeroRecu}
            dateTimePaiement={new Date().toISOString()}
            referenceTransaction={modalRecuAcompte.referenceTransaction}
            typePaiement={modalRecuAcompte.typePaiement}
            montantFactureTotal={modalRecuAcompte.montantFactureTotal}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}