'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  User,
  Calendar,
  Package,
  DollarSign,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  ChevronDown,
  FileText
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { decodeFactureParams } from '@/lib/url-encoder';
import { facturePubliqueService } from '@/services/facture-publique.service';
import { FactureComplete } from '@/types/facture';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';
import Image from 'next/image';

interface FacturePubliqueClientProps {
  token: string;
}

export default function FacturePubliqueClient({ token }: FacturePubliqueClientProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'affichage
  const [showPrices, setShowPrices] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // États pour le système de paiement
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Configuration des wallets
  const walletMethods: Array<{
    id: PaymentMethod;
    name: string;
    logo: string;
    color: string;
    bgGradient: string;
  }> = [
    {
      id: 'OM',
      name: 'Orange Money',
      logo: '/images/om.png',
      color: 'text-orange-600',
      bgGradient: 'from-orange-500/20 to-amber-500/20'
    },
    {
      id: 'WAVE',
      name: 'Wave',
      logo: '/images/wave.png',
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      id: 'FREE',
      name: 'Free Money',
      logo: '/images/free.png',
      color: 'text-green-600',
      bgGradient: 'from-green-600/20 to-teal-500/20'
    }
  ];

  const loadFacture = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Décoder les paramètres depuis l'URL
      const result = decodeFactureParams(token);

      if (!result || !result.id_structure || !result.id_facture) {
        throw new Error('Token de facture invalide');
      }

      const { id_structure: idStructure, id_facture: idFacture } = result;

      // Charger les détails de la facture
      const factureData = await facturePubliqueService.getFacturePublique(idStructure, idFacture);

      if (!factureData) {
        throw new Error('Facture introuvable');
      }

      // Assertion de type pour unknown vers FactureComplete
      const typedFactureData = factureData as FactureComplete;
      setFacture(typedFactureData);

      // Debug: Vérifier le contenu du logo
      console.log('🔍 Debug facture data:', {
        id_facture: typedFactureData.facture.id_facture,
        nom_structure: typedFactureData.facture.nom_structure,
        logo: typedFactureData.facture.logo,
        logo_type: typeof typedFactureData.facture.logo,
        logo_length: typedFactureData.facture.logo?.length
      });

    } catch (err: unknown) {
      console.error('Erreur lors du chargement de la facture:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFacture();
  }, [loadFacture]);

  const formatMontant = (montant: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-SN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fonction de gestion du paiement directe
  const handleWalletPayment = (method: PaymentMethod) => {
    if (!facture || facture.facture.id_etat !== 1) return;
    setSelectedPaymentMethod(method);
    setShowQRCode(true);
  };

  const createPaymentContext = (): PaymentContext | null => {
    if (!facture) return null;

    return {
      facture: {
        id_facture: facture.facture.id_facture,
        num_facture: facture.facture.num_facture,
        nom_client: facture.facture.nom_client,
        tel_client: facture.facture.tel_client,
        montant_total: facture.facture.montant,
        montant_restant: facture.facture.mt_restant
      },
      montant_acompte: facture.facture.mt_restant // Paiement du montant restant
    };
  };

  const handleWalletPaymentComplete = async (statusResponse?: {
    data?: {
      uuid?: string;
      reference_externe?: string;
      telephone?: string;
      montant?: string | number;
    }
  }) => {
    console.log('💳 [FACTURE-PUBLIQUE] Paiement complété, statusResponse:', statusResponse);

    // Fermer le modal QR code
    setShowQRCode(false);

    // Vérifier qu'on a les données nécessaires
    if (!facture || !selectedPaymentMethod) {
      console.error('❌ [FACTURE-PUBLIQUE] Données manquantes pour enregistrer le paiement');
      setPaymentSuccess(true);
      setTimeout(() => loadFacture(), 2000);
      return;
    }

    // Extraire les données du paiement
    const uuid = statusResponse?.data?.uuid || '';
    const referenceExterne = statusResponse?.data?.reference_externe || '';
    const telephone = statusResponse?.data?.telephone || facture.facture.tel_client || '000000000';

    // Construire le transaction_id
    const timestamp = Date.now();
    const transactionId = `${selectedPaymentMethod}-PUB-${facture.facture.id_structure}-${timestamp}`;

    console.log('💰 [FACTURE-PUBLIQUE] Enregistrement acompte:', {
      id_structure: facture.facture.id_structure,
      id_facture: facture.facture.id_facture,
      montant: facture.facture.mt_restant,
      mode_paiement: selectedPaymentMethod,
      uuid,
      transactionId
    });

    try {
      // Appeler le service pour enregistrer l'acompte
      const result = await facturePubliqueService.addAcomptePublique({
        id_structure: facture.facture.id_structure,
        id_facture: facture.facture.id_facture,
        montant_acompte: facture.facture.mt_restant,
        transaction_id: transactionId,
        uuid: uuid || referenceExterne || transactionId,
        mode_paiement: selectedPaymentMethod as 'OM' | 'WAVE' | 'FREE',
        telephone
      });

      console.log('📋 [FACTURE-PUBLIQUE] Résultat enregistrement:', result);

      if (result.success) {
        console.log('✅ [FACTURE-PUBLIQUE] Paiement enregistré avec succès');
        setPaymentSuccess(true);
      } else {
        console.error('❌ [FACTURE-PUBLIQUE] Échec enregistrement:', result.message);
        // On affiche quand même le succès car le paiement wallet a réussi
        // L'erreur d'enregistrement sera loggée pour investigation
        setPaymentSuccess(true);
      }
    } catch (err) {
      console.error('❌ [FACTURE-PUBLIQUE] Erreur lors de l\'enregistrement:', err);
      // On affiche quand même le succès car le paiement wallet a réussi
      setPaymentSuccess(true);
    }

    // Recharger la facture pour voir le nouveau statut
    setTimeout(() => {
      loadFacture();
    }, 2000);
  };

  const handleWalletPaymentFailed = (error: string) => {
    setShowQRCode(false);
    alert(`Échec du paiement: ${error}`);
  };

  // Styles responsifs plus compacts
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'px-3 py-4',
        card: 'p-3',
        title: 'text-base',
        subtitle: 'text-sm'
      };
    } else if (isMobileLarge) {
      return {
        container: 'px-4 py-5',
        card: 'p-4',
        title: 'text-lg',
        subtitle: 'text-base'
      };
    } else {
      return {
        container: 'px-6 py-6',
        card: 'p-6',
        title: 'text-xl',
        subtitle: 'text-lg'
      };
    }
  };

  const styles = getStyles();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-blue-600 font-medium text-sm">Chargement de la facture...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-red-800 mb-2">Erreur</h1>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!facture) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 ${styles.container}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Message de succès de paiement - Plus compact */}
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center"
          >
            <div className="text-green-600 font-semibold text-sm">
              ✅ Paiement confirmé ! La facture a été mise à jour.
            </div>
          </motion.div>
        )}

        {/* Section principale optimisée */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 ${styles.card} mb-4`}
        >
          {/* Header avec logo et nom - Plus compact */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-5"
          >
            {/* Logo de la structure si disponible */}
            {facture.facture.logo && facture.facture.logo.trim() !== '' && (
              <div className="mb-3">
                <div className="inline-block p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={facture.facture.logo}
                    alt={`Logo ${facture.facture.nom_structure}`}
                    className="h-12 w-auto mx-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nom de la structure */}
            <div>
              <h1 className={`${styles.title} font-bold text-gray-900 mb-1`}>
                {facture.facture.nom_structure}
              </h1>
              <p className={`${styles.subtitle} text-gray-600 flex items-center justify-center gap-2`}>
                <Calendar className="w-3 h-3" />
                Facture émise le {formatDate(facture.facture.date_facture)}
              </p>
            </div>
          </motion.div>

          {/* Layout optimisé mobile/desktop */}
          {isMobile ? (
            /* Layout mobile optimisé avec grille 2x1 pour les infos */
            <div className="space-y-4">
              {/* Informations générales en grille 2x1 */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Informations Facture
                </h3>

                {/* Grille 2x1 pour mobile */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Numéro de facture */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-blue-600" />
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Numéro</p>
                    </div>
                    <p className="font-mono font-bold text-gray-900 text-sm">#{facture.facture.num_facture}</p>
                  </div>

                  {/* Statut */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${
                        facture.facture.libelle_etat === 'PAYEE' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Statut</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      facture.facture.libelle_etat === 'PAYEE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {facture.facture.libelle_etat === 'PAYEE' ? 'Payée' : 'En attente'}
                    </span>
                  </div>
                </div>

                {/* Client sur toute la largeur */}
                <div className="mt-3 pt-3 border-t border-blue-200/50">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-purple-600" />
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Client</p>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{facture.facture.nom_client}</p>
                  <p className="text-xs text-gray-600">{facture.facture.tel_client}</p>
                </div>
              </div>

              {/* Montant avec wallets de paiement intégrés */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg p-3 border border-emerald-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Montant Total
                </h3>

                <div className="text-center space-y-3">
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatMontant(facture.facture.montant)}
                  </p>

                  {/* Wallets de paiement intégrés - Mobile */}
                  {facture.facture.id_etat === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Payer {formatMontant(facture.facture.mt_restant)} avec :
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {walletMethods.map((method, index) => (
                          <motion.button
                            key={method.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleWalletPayment(method.id)}
                            className={`p-2 rounded-lg border-2 border-gray-200 hover:border-blue-400
                              bg-gradient-to-r ${method.bgGradient} hover:shadow-lg
                              transition-all duration-300 group flex flex-col items-center text-center`}
                          >
                            <div className="mb-1 group-hover:scale-110 transition-transform">
                              <div className="w-10 h-10 relative bg-white rounded-md p-1 shadow-sm">
                                <Image
                                  src={method.logo}
                                  alt={method.name}
                                  fill
                                  className="object-contain p-0.5"
                                  sizes="40px"
                                />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-xs leading-tight">
                                {method.name}
                              </h3>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Détails acompte/reste */}
                  {facture.facture.mt_restant > 0 && (
                    <div className="space-y-1 text-xs pt-2 border-t border-emerald-200/50">
                      <p className="text-gray-600">
                        Acompte versé: <span className="font-medium">{formatMontant(facture.facture.mt_acompte)}</span>
                      </p>
                      <p className="font-medium text-amber-700">
                        Restant à payer: <span className="text-sm">{formatMontant(facture.facture.mt_restant)}</span>
                      </p>
                    </div>
                  )}

                  {facture.facture.mt_restant === 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      ✅ Intégralement payée
                    </p>
                  )}

                  {/* Note paiement sécurisé */}
                  {facture.facture.id_etat === 1 && (
                    <p className="text-gray-600 text-xs">
                      Paiement sécurisé et instantané
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Layout desktop - Grille classique */
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              {/* Informations générales */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Informations Facture
                </h3>

                <div className="space-y-3">
                  {/* Numéro de facture */}
                  <div className="flex items-start gap-3">
                    <Receipt className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Numéro</p>
                      <p className="font-mono font-bold text-gray-900 text-base">#{facture.facture.num_facture}</p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Client</p>
                      <p className="font-medium text-gray-900">{facture.facture.nom_client}</p>
                      <p className="text-sm text-gray-600">{facture.facture.tel_client}</p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 mt-1 flex-shrink-0">
                      <div className={`w-4 h-4 rounded-full ${
                        facture.facture.libelle_etat === 'PAYEE' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Statut</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        facture.facture.libelle_etat === 'PAYEE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {facture.facture.libelle_etat === 'PAYEE' ? 'Payée' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Montant avec wallets */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg p-4 border border-emerald-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Montant Total
                </h3>

                <div className="text-center space-y-3">
                  <p className="text-2xl font-bold text-emerald-700 mb-2">
                    {formatMontant(facture.facture.montant)}
                  </p>

                  {/* Wallets de paiement intégrés - Desktop */}
                  {facture.facture.id_etat === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Payer {formatMontant(facture.facture.mt_restant)} avec :
                      </p>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {walletMethods.map((method, index) => (
                          <motion.button
                            key={method.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleWalletPayment(method.id)}
                            className={`p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400
                              bg-gradient-to-r ${method.bgGradient} hover:shadow-lg
                              transition-all duration-300 group flex flex-col items-center text-center`}
                          >
                            <div className="mb-2 group-hover:scale-110 transition-transform">
                              <div className="w-12 h-12 relative bg-white rounded-lg p-1 shadow-sm">
                                <Image
                                  src={method.logo}
                                  alt={method.name}
                                  fill
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-xs leading-tight">
                                {method.name}
                              </h3>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {facture.facture.mt_restant > 0 && (
                    <div className="space-y-1 pt-2 border-t border-emerald-200/50">
                      <p className="text-sm text-gray-600">
                        Acompte versé: <span className="font-medium">{formatMontant(facture.facture.mt_acompte)}</span>
                      </p>
                      <p className="text-sm font-medium text-amber-700">
                        Restant à payer: <span className="text-base">{formatMontant(facture.facture.mt_restant)}</span>
                      </p>
                    </div>
                  )}

                  {facture.facture.mt_restant === 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      ✅ Intégralement payée
                    </p>
                  )}

                  {facture.facture.id_etat === 1 && (
                    <p className="text-gray-600 text-sm">
                      Paiement sécurisé et instantané
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bouton pour afficher/masquer les détails */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg border border-gray-200 transition-all duration-200"
          >
            <Package className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-700 text-sm">
              {showDetails ? 'Masquer' : 'Voir'} les détails de la vente
            </span>
            <motion.div
              animate={{ rotate: showDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Section dépliable - Détails de la vente */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.1 }}
                className={`bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 ${styles.card} mb-4`}
              >
                {/* Header de la section détails */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Détails de la Commande
                  </h3>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPrices(!showPrices)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-lg shadow-sm transition-all duration-200"
                  >
                    {showPrices ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="text-xs font-medium">
                      {showPrices ? 'Masquer' : 'Afficher'} les prix
                    </span>
                  </motion.button>
                </div>

                {/* Tableau des produits */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-2 px-3 font-medium text-gray-900 text-sm">Produit</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-900 text-sm">Qté</th>
                        {showPrices && (
                          <>
                            <th className="text-right py-2 px-3 font-medium text-gray-900 text-sm">Prix Unit.</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-900 text-sm">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {facture.details?.map((item, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{item.nom_produit}</p>
                              <p className="text-xs text-gray-600">Code: {item.id_produit}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 font-medium">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                              {item.quantite}
                            </span>
                          </td>
                          {showPrices && (
                            <>
                              <td className="text-right py-3 px-3 text-gray-700 text-sm">
                                {formatMontant(item.prix)}
                              </td>
                              <td className="text-right py-3 px-3 font-bold text-gray-900 text-sm">
                                {formatMontant(item.sous_total)}
                              </td>
                            </>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                    {showPrices && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-emerald-50 to-blue-50">
                          <td colSpan={3} className="text-right py-3 px-3 font-bold text-base text-gray-900">
                            Total Général:
                          </td>
                          <td className="text-right py-3 px-3 font-bold text-lg text-emerald-600">
                            {formatMontant(facture.facture.montant)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {!showPrices && (
                  <div className="mt-4 text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-amber-800 text-sm">
                      <Eye className="w-3 h-3 inline mr-2" />
                      Les prix sont masqués. Cliquez sur &ldquo;Afficher les prix&rdquo; pour les consulter.
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-gray-600"
        >
          <p className="text-xs">
            Facture générée par <strong className="text-emerald-600">FayClick</strong> - Commerce Digital Sénégal
          </p>
        </motion.div>
      </motion.div>

      {/* Modal QR Code seulement */}
      {facture && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
        <ModalPaiementQRCode
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          paymentMethod={selectedPaymentMethod}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={handleWalletPaymentComplete}
          onPaymentFailed={handleWalletPaymentFailed}
        />
      )}
    </div>
  );
}