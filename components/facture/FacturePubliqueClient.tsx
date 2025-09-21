'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  User,
  Phone,
  Calendar,
  Package,
  DollarSign,
  CreditCard,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Building,
  FileText
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { decodeFactureParams } from '@/lib/url-encoder';
import { facturePubliqueService } from '@/services/facture-publique.service';
import { FactureComplete } from '@/types/facture';
import { ModalChoixPaiement } from '@/components/factures/ModalChoixPaiement';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';
import { factureService } from '@/services/facture.service';

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
  const [showChoixPaiement, setShowChoixPaiement] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadFacture();
  }, [token]);

  const loadFacture = async () => {
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

      setFacture(factureData);

      // Debug: Vérifier le contenu du logo
      console.log('🔍 Debug facture data:', {
        id_facture: factureData.facture.id_facture,
        nom_structure: factureData.facture.nom_structure,
        logo: factureData.facture.logo,
        logo_type: typeof factureData.facture.logo,
        logo_length: factureData.facture.logo?.length
      });

    } catch (err: any) {
      console.error('Erreur lors du chargement de la facture:', err);
      setError(err.message || 'Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  };

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

  // Fonctions de gestion du paiement
  const handlePaymentClick = () => {
    if (!facture || facture.facture.id_etat !== 1) return;
    setShowChoixPaiement(true);
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowChoixPaiement(false);

    if (method === 'CASH') {
      // Pour le contexte public, on ne peut pas traiter les paiements cash
      // Afficher un message d'information
      alert('Le paiement en espèces doit être effectué directement auprès du commerçant.');
    } else {
      // Paiement wallet - ouvrir le modal QR Code
      setShowQRCode(true);
    }
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

  const handleWalletPaymentComplete = async (uuid: string) => {
    // Pour le contexte public, on affiche juste un message de succès
    setShowQRCode(false);
    setPaymentSuccess(true);

    // Recharger la facture pour voir le nouveau statut
    setTimeout(() => {
      loadFacture();
    }, 2000);
  };

  const handleWalletPaymentFailed = (error: string) => {
    setShowQRCode(false);
    alert(`Échec du paiement: ${error}`);
  };

  // Styles responsifs
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'px-4 py-6',
        card: 'p-4',
        title: 'text-lg',
        subtitle: 'text-sm'
      };
    } else if (isMobileLarge) {
      return {
        container: 'px-6 py-8',
        card: 'p-6',
        title: 'text-xl',
        subtitle: 'text-base'
      };
    } else {
      return {
        container: 'px-8 py-10',
        card: 'p-8',
        title: 'text-2xl',
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
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-blue-600 font-medium">Chargement de la facture...</p>
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
          className="text-center max-w-md mx-auto px-6"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-800 mb-2">Erreur</h1>
          <p className="text-red-600 mb-6">{error}</p>
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
        {/* Message de succès de paiement */}
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center"
          >
            <div className="text-green-600 font-semibold">
              ✅ Paiement confirmé ! La facture a été mise à jour.
            </div>
          </motion.div>
        )}

        {/* Section principale - Données essentielles */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 ${styles.card} mb-6`}
        >
          {/* Header avec logo et nom de structure */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            {/* Logo de la structure si disponible */}
            {facture.facture.logo && facture.facture.logo.trim() !== '' && (
              <div className="mb-4">
                <div className="inline-block p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40">
                  <img
                    src={facture.facture.logo}
                    alt={`Logo ${facture.facture.nom_structure}`}
                    className="h-16 w-auto mx-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nom de la structure */}
            <div>
              <h1 className={`${styles.title} font-bold text-gray-900 mb-2`}>
                {facture.facture.nom_structure}
              </h1>
              <p className={`${styles.subtitle} text-gray-600 flex items-center justify-center gap-2`}>
                <Calendar className="w-4 h-4" />
                Facture émise le {formatDate(facture.facture.date_facture)}
              </p>
            </div>
          </motion.div>

          {/* Données essentielles en grille optimisée */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Informations générales */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Informations Facture
              </h3>

              <div className="space-y-3">
                {/* Numéro de facture */}
                <div className="flex items-start gap-3">
                  <Receipt className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Numéro</p>
                    <p className="font-mono font-bold text-gray-900 text-lg">#{facture.facture.num_facture}</p>
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
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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

            {/* Montant */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-5 border border-emerald-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Montant Total
              </h3>

              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-700 mb-2">
                  {formatMontant(facture.facture.montant)}
                </p>

                {facture.facture.mt_restant > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Acompte versé: <span className="font-medium">{formatMontant(facture.facture.mt_acompte)}</span>
                    </p>
                    <p className="text-sm font-medium text-amber-700">
                      Restant à payer: <span className="text-lg">{formatMontant(facture.facture.mt_restant)}</span>
                    </p>
                  </div>
                )}

                {facture.facture.mt_restant === 0 && (
                  <p className="text-sm text-green-600 font-medium">
                    ✅ Intégralement payée
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bouton Payer - Visible uniquement pour factures impayées */}
          {facture.facture.id_etat === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePaymentClick}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6" />
                  <span>Payer {formatMontant(facture.facture.mt_restant)}</span>
                </div>
              </motion.button>
              <p className="text-gray-600 text-sm mt-3">
                Paiement sécurisé par Orange Money, Wave ou Free Money
              </p>
            </motion.div>
          )}

          {/* Bouton pour afficher/masquer les détails */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl border border-gray-200 transition-all duration-200"
          >
            <Package className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">
              {showDetails ? 'Masquer' : 'Voir'} les détails de la vente
            </span>
            <motion.div
              animate={{ rotate: showDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-500" />
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
                className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 ${styles.card} mb-6`}
              >
                {/* Header de la section détails */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-3">
                    <Package className="w-6 h-6 text-purple-600" />
                    Détails de la Commande
                  </h3>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPrices(!showPrices)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl shadow-sm transition-all duration-200"
                  >
                    {showPrices ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    <span className="text-sm font-medium">
                      {showPrices ? 'Masquer' : 'Afficher'} les prix
                    </span>
                  </motion.button>
                </div>

                {/* Tableau des produits */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Produit</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-900">Qté</th>
                        {showPrices && (
                          <>
                            <th className="text-right py-3 px-4 font-medium text-gray-900">Prix Unit.</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-900">Total</th>
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
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{item.nom_produit}</p>
                              <p className="text-sm text-gray-600">Code: {item.id_produit}</p>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4 font-medium">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                              {item.quantite}
                            </span>
                          </td>
                          {showPrices && (
                            <>
                              <td className="text-right py-4 px-4 text-gray-700">
                                {formatMontant(item.prix)}
                              </td>
                              <td className="text-right py-4 px-4 font-bold text-gray-900">
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
                          <td colSpan={3} className="text-right py-4 px-4 font-bold text-lg text-gray-900">
                            Total Général:
                          </td>
                          <td className="text-right py-4 px-4 font-bold text-xl text-emerald-600">
                            {formatMontant(facture.facture.montant)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {!showPrices && (
                  <div className="mt-6 text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-amber-800 text-sm">
                      <Eye className="w-4 h-4 inline mr-2" />
                      Les prix sont masqués. Cliquez sur "Afficher les prix" pour les consulter.
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
          className="text-center mt-8 text-gray-600"
        >
          <p className="text-sm">
            Facture générée par <strong className="text-emerald-600">FayClick</strong> - Commerce Digital Sénégal
          </p>
        </motion.div>
      </motion.div>

      {/* Modals de paiement */}
      {facture && (
        <>
          <ModalChoixPaiement
            isOpen={showChoixPaiement}
            onClose={() => setShowChoixPaiement(false)}
            onSelectMethod={handleSelectPaymentMethod}
            montantAcompte={facture.facture.mt_restant}
            nomClient={facture.facture.nom_client}
          />

          {selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
            <ModalPaiementQRCode
              isOpen={showQRCode}
              onClose={() => setShowQRCode(false)}
              paymentMethod={selectedPaymentMethod}
              paymentContext={createPaymentContext()!}
              onPaymentComplete={handleWalletPaymentComplete}
              onPaymentFailed={handleWalletPaymentFailed}
            />
          )}
        </>
      )}
    </div>
  );
}