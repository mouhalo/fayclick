/**
 * Panier Vente Flash Inline - Affichage intégré sous le header
 * S'affiche automatiquement quand des articles sont ajoutés
 * Client anonyme par défaut - Paiement CASH ou WALLET (OM/WAVE)
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Minus, Plus, ShoppingCart, CreditCard, XCircle, Receipt, ChevronDown
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';
import { authService } from '@/services/auth.service';
import { factureService } from '@/services/facture.service';
import database from '@/services/database.service';
import { ModalEncaissementVenteFlash } from './ModalEncaissementVenteFlash';
import { ModalRecuVenteFlash } from './ModalRecuVenteFlash';
import { PaymentMethod } from '@/types/payment-wallet';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface PanierVenteFlashInlineProps {
  /** Callback succès avec id_facture (pour charger la facture unique) */
  onSuccess?: (idFacture: number) => void;
  /** Callback affichage reçu */
  onShowRecu?: (idFacture: number, numFacture: string, montantTotal: number) => void;
}

export function PanierVenteFlashInline({
  onSuccess,
  onShowRecu
}: PanierVenteFlashInlineProps) {
  const { showToast } = useToast();
  const { isMobile, isMobileLarge } = useBreakpoint();
  const isCompact = isMobile || isMobileLarge;

  const {
    articles,
    remise,
    updateRemise,
    updateQuantity,
    removeArticle,
    clearPanier,
    getTotalItems,
    getSousTotal,
    getMontantsFacture
  } = usePanierStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEncaissementModal, setShowEncaissementModal] = useState(false);

  // État pour le nouveau modal reçu ticket
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [recuData, setRecuData] = useState<{
    idFacture: number;
    numFacture: string;
    montantTotal: number;
    methodePaiement: 'CASH' | 'OM' | 'WAVE';
    monnaieARendre: number;
    detailFacture: Array<{
      id_detail?: number;
      nom_produit: string;
      quantite: number;
      prix: number;
      sous_total: number;
    }>;
  } | null>(null);

  const totalItems = getTotalItems();
  const sousTotal = getSousTotal();
  const montants = getMontantsFacture();
  const total = montants.montant_net;

  // Ne pas afficher le panier si vide, MAIS afficher le modal reçu si actif
  if (articles.length === 0 && !showRecuModal) {
    return null;
  }

  // Si panier vide mais modal reçu actif, afficher uniquement le modal
  if (articles.length === 0 && showRecuModal && recuData) {
    return (
      <ModalRecuVenteFlash
        isOpen={showRecuModal}
        onClose={() => {
          setShowRecuModal(false);
          setRecuData(null);
        }}
        idFacture={recuData.idFacture}
        detailFacture={recuData.detailFacture}
        numFacture={recuData.numFacture}
        montantTotal={recuData.montantTotal}
        methodePaiement={recuData.methodePaiement}
        monnaieARendre={recuData.monnaieARendre}
      />
    );
  }

  /**
   * Vider le panier
   */
  const handleAnnuler = () => {
    if (confirm('Vider le panier et annuler la vente ?')) {
      clearPanier();
    }
  };

  /**
   * Ouvrir le modal d'encaissement
   */
  const handleOpenEncaissement = () => {
    if (articles.length === 0) {
      showToast('warning', 'Panier vide', 'Ajoutez des produits avant de procéder');
      return;
    }
    setShowEncaissementModal(true);
  };

  /**
   * Callback après validation du paiement dans le modal
   * IMPORTANT: Guard contre les appels multiples (polling peut rappeler plusieurs fois)
   */
  const handlePaymentComplete = async (
    method: PaymentMethod,
    transactionData: { transactionId: string; uuid: string; telephone?: string },
    monnaieARendre?: number
  ) => {
    // Guard contre les doublons - si déjà en cours, ignorer
    if (isProcessing) {
      console.warn('⚠️ [PANIER INLINE] handlePaymentComplete déjà en cours, ignoré');
      return;
    }

    const user = authService.getUser();
    if (!user) {
      showToast('error', 'Erreur', 'Utilisateur non connecté');
      return;
    }

    setIsProcessing(true);
    setShowEncaissementModal(false);

    try {
      console.log(`🛒 [VF-VENTE] === NOUVELLE VENTE ${method} ===`);
      console.log(`🛒 [VF-VENTE] Articles: ${articles.length} | Total: ${total} FCFA`);

      // Étape 1 : Créer la facture
      const factureResult = await factureService.createFacture(
        articles,
        {
          nom_client_payeur: 'CLIENT_ANONYME',
          tel_client: '000000000',
          description: `Vente Flash - ${method}`
        },
        {
          remise: remise || 0,
          acompte: 0
        },
        false
      );

      if (!factureResult.success || !factureResult.id_facture) {
        throw new Error(factureResult.message || 'Erreur création facture');
      }

      const idFacture = factureResult.id_facture;
      const numFacture = `FAC-${idFacture}`;

      console.log(`✅ [VF-VENTE] 1/2 Facture créée | ID: ${idFacture} | Num: ${numFacture}`);

      // Étape 2 : Encaissement + Reçu automatique (nouvelle signature add_acompte_facture)
      const encaissementQuery = `
        SELECT * FROM add_acompte_facture1(
          ${user.id_structure},
          ${idFacture},
          ${total},
          '${transactionData.transactionId}',
          '${transactionData.uuid}',
          '${method}',
          '${transactionData.telephone || '000000000'}'
        )
      `;

      const encaissementResults = await database.query(encaissementQuery);

      if (!encaissementResults || encaissementResults.length === 0) {
        throw new Error('Erreur enregistrement encaissement');
      }

      const encaissementResponse = encaissementResults[0].add_acompte_facture1;
      const parsedEncaissement = typeof encaissementResponse === 'string'
        ? JSON.parse(encaissementResponse)
        : encaissementResponse;

      console.log(`💰 [VF-VENTE] Réponse add_acompte_facture1:`, JSON.stringify(parsedEncaissement));

      if (!parsedEncaissement.success) {
        console.error(`❌ [VF-VENTE] Encaissement échoué | Code: ${parsedEncaissement.code} | Message: ${parsedEncaissement.message}`);
        throw new Error(parsedEncaissement.message || 'Erreur encaissement');
      }

      // Extraire les données du reçu créé automatiquement par PostgreSQL
      const recuInfo = parsedEncaissement.recus_paiement?.[0];
      const numeroRecu = recuInfo?.numero_recu || parsedEncaissement.paiement?.numero_recu;

      // Extraire les détails de la facture pour le ticket
      const detailFacture = parsedEncaissement.detail_facture || [];

      console.log(`✅ [VF-VENTE] 2/2 Acompte + Reçu créés | ${method} | ID Reçu: ${recuInfo?.id_recu || 'N/A'} | N°: ${numeroRecu || 'N/A'} | Articles: ${detailFacture.length}`);

      // Vider le panier
      clearPanier();

      // Callback succès avec id_facture (pour charger la facture unique)
      if (onSuccess) {
        onSuccess(idFacture);
      }

      // Afficher le nouveau modal reçu ticket avec détails produits
      setRecuData({
        idFacture,
        numFacture: parsedEncaissement.facture?.num_facture || numFacture,
        montantTotal: total,
        methodePaiement: method as 'CASH' | 'OM' | 'WAVE',
        monnaieARendre: monnaieARendre || 0,
        detailFacture: detailFacture.map((item: { id_detail?: number; nom_produit: string; quantite: number; prix: number; sous_total: number }) => ({
          id_detail: item.id_detail,
          nom_produit: item.nom_produit,
          quantite: item.quantite,
          prix: item.prix,
          sous_total: item.sous_total
        }))
      });
      setShowRecuModal(true);

    } catch (error) {
      console.error('❌ [PANIER INLINE] Erreur:', error);
      showToast('error', 'Erreur', error instanceof Error ? error.message : 'Erreur lors de la vente');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden"
    >
      {/* Header cliquable pour replier/déplier */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold">Panier</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
            {totalItems} article{totalItems > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{total.toLocaleString('fr-FR')} F</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </button>

      {/* Contenu dépliable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Liste des articles */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {articles.map((article) => (
                  <motion.div
                    key={article.id_produit}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-gray-50 rounded-xl p-2 border border-gray-200"
                  >
                    {/* Ligne 1: Nom produit + bouton supprimer */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 leading-tight flex-1">
                        {article.nom_produit}
                      </h4>
                      <button
                        onClick={() => removeArticle(article.id_produit)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Ligne 2: Prix unitaire + Quantité + Total */}
                    <div className="flex items-center justify-between">
                      {/* Prix unitaire */}
                      <span className="text-xs text-gray-500">
                        {article.prix_vente.toLocaleString('fr-FR')} F
                      </span>

                      {/* Contrôles quantité compacts */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(article.id_produit, article.quantity - 1)}
                          disabled={article.quantity <= 1}
                          className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{article.quantity}</span>
                        <button
                          onClick={() => updateQuantity(article.id_produit, article.quantity + 1)}
                          className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total ligne */}
                      <span className="font-bold text-sm text-gray-900 min-w-[70px] text-right">
                        {(article.prix_vente * article.quantity).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Section Remise + Totaux en ligne */}
              <div className="grid grid-cols-2 gap-3">
                {/* Remise */}
                <div className="bg-orange-50 rounded-xl p-2 border border-orange-200">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Remise (F)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={sousTotal}
                    value={remise}
                    onChange={(e) => updateRemise(Math.max(0, Math.min(sousTotal, Number(e.target.value))))}
                    className="w-full px-2 py-1.5 text-sm border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Résumé totaux */}
                <div className="bg-green-50 rounded-xl p-2 border border-green-200">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Sous-total</span>
                    <span>{sousTotal.toLocaleString('fr-FR')} F</span>
                  </div>
                  {remise > 0 && (
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Remise</span>
                      <span>- {remise.toLocaleString('fr-FR')} F</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-green-700 pt-1 border-t border-green-200 mt-1">
                    <span>TOTAL</span>
                    <span>{total.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="grid grid-cols-2 gap-2">
                {/* Bouton Annuler */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnnuler}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                    bg-gradient-to-r from-red-500 to-red-600 text-white
                    font-semibold text-sm shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </motion.button>

                {/* Bouton Encaisser */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenEncaissement}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                    bg-gradient-to-r from-green-500 to-emerald-600 text-white
                    font-semibold text-sm shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  {isProcessing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Receipt className="w-4 h-4" />
                      </motion.div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Encaisser
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Encaissement */}
      <ModalEncaissementVenteFlash
        isOpen={showEncaissementModal}
        onClose={() => setShowEncaissementModal(false)}
        montantTotal={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Modal Reçu Ticket */}
      {recuData && (
        <ModalRecuVenteFlash
          isOpen={showRecuModal}
          onClose={() => {
            setShowRecuModal(false);
            setRecuData(null);
          }}
          idFacture={recuData.idFacture}
          numFacture={recuData.numFacture}
          montantTotal={recuData.montantTotal}
          methodePaiement={recuData.methodePaiement}
          monnaieARendre={recuData.monnaieARendre}
          detailFacture={recuData.detailFacture}
        />
      )}
    </motion.div>
  );
}
