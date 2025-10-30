/**
 * Panier Vente Flash - Workflow simplifié pour ventes rapides
 * Client anonyme par défaut - Paiement CASH immédiat
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trash2, Minus, Plus, ShoppingCart, Save, XCircle, Receipt
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';
import { authService } from '@/services/auth.service';
import { factureService } from '@/services/facture.service';
import database from '@/services/database.service';

interface PanierVenteFlashProps {
  /** Modal ouvert/fermé */
  isOpen: boolean;
  /** Callback fermeture */
  onClose: () => void;
  /** Callback succès (pour rafraîchir liste ventes) */
  onSuccess?: () => void;
  /** Callback affichage reçu */
  onShowRecu?: (idFacture: number, numFacture: string, montantTotal: number) => void;
}

export function PanierVenteFlash({
  isOpen,
  onClose,
  onSuccess,
  onShowRecu
}: PanierVenteFlashProps) {
  const { showToast } = useToast();
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

  const totalItems = getTotalItems();
  const sousTotal = getSousTotal();
  const montants = getMontantsFacture();
  const total = montants.montant_net;

  /**
   * Vider le panier et fermer
   */
  const handleAnnuler = () => {
    if (totalItems > 0) {
      if (confirm('Vider le panier et annuler la vente ?')) {
        clearPanier();
        onClose();
      }
    } else {
      onClose();
    }
  };

  /**
   * Créer facture + encaissement CASH
   */
  const handleSauvegarder = async () => {
    if (articles.length === 0) {
      showToast('warning', 'Panier vide', 'Ajoutez des produits avant de sauvegarder');
      return;
    }

    const user = authService.getUser();
    if (!user) {
      showToast('error', 'Erreur', 'Utilisateur non connecté');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💰 [PANIER VENTE FLASH] === DÉBUT CRÉATION FACTURE + ENCAISSEMENT + REÇU ===');
      console.log('📦 [PANIER VENTE FLASH] Articles:', articles.length);
      console.log('💵 [PANIER VENTE FLASH] Total:', total, 'FCFA');

      // Étape 1 : Créer la facture avec le service existant
      console.log('📝 [PANIER VENTE FLASH] Étape 1/3 : Création facture...');

      const factureResult = await factureService.createFacture(
        articles,
        {
          nom_client_payeur: 'CLIENT_ANONYME',
          tel_client: '000000000',
          description: 'Vente Flash'
        },
        {
          remise: remise || 0,
          acompte: 0 // Pas d'acompte initial, encaissement après
        },
        false // Sans frais
      );

      if (!factureResult.success || !factureResult.id_facture) {
        throw new Error(factureResult.message || 'Erreur création facture');
      }

      const idFacture = factureResult.id_facture;
      const numFacture = `FAC-${idFacture}`;

      console.log('✅ [PANIER VENTE FLASH] Facture créée:', {
        id_facture: idFacture,
        num_facture: numFacture
      });

      // Étape 2 : Enregistrer l'encaissement CASH avec add_acompte_facture
      console.log('💵 [PANIER VENTE FLASH] Étape 2/3 : Encaissement CASH...');

      // Générer transaction_id au format: CASH-{id_structure}-{timestamp}
      const transactionId = `CASH-${user.id_structure}-${Date.now()}`;

      const encaissementQuery = `
        SELECT * FROM add_acompte_facture(
          ${user.id_structure},
          ${idFacture},
          ${total},
          '${transactionId}',
          'face2face'
        )
      `;

      console.log('📤 [PANIER VENTE FLASH] Requête encaissement:', encaissementQuery);

      const encaissementResults = await database.query(encaissementQuery);

      console.log('📦 [PANIER VENTE FLASH] Résultats encaissement:', encaissementResults);

      if (!encaissementResults || encaissementResults.length === 0) {
        throw new Error('Erreur enregistrement encaissement');
      }

      const encaissementResponse = encaissementResults[0].add_acompte_facture;
      const parsedEncaissement = typeof encaissementResponse === 'string'
        ? JSON.parse(encaissementResponse)
        : encaissementResponse;

      console.log('📊 [PANIER VENTE FLASH] Réponse encaissement parsée:', parsedEncaissement);

      if (!parsedEncaissement.success) {
        throw new Error(parsedEncaissement.message || 'Erreur encaissement');
      }

      console.log('✅ [PANIER VENTE FLASH] === VENTE COMPLÉTÉE AVEC SUCCÈS ===');

      // Étape 3 : Créer le reçu de paiement
      console.log('🧾 [PANIER VENTE FLASH] Étape 3/3 : Création reçu...');

      try {
        const { recuService } = await import('@/services/recu.service');
        const numeroRecu = `REC-${user.id_structure}-${idFacture}-${Date.now()}`;

        const recuResponse = await recuService.creerRecu({
          id_facture: idFacture,
          id_structure: user.id_structure,
          methode_paiement: 'CASH',
          montant_paye: total,
          numero_recu: numeroRecu,
          reference_transaction: transactionId,
          date_paiement: new Date().toISOString()
        });

        if (recuResponse.success) {
          console.log('✅ [PANIER VENTE FLASH] Reçu créé:', recuResponse);
        } else {
          console.warn('⚠️ [PANIER VENTE FLASH] Reçu non créé mais vente OK');
        }
      } catch (recuError) {
        console.error('❌ [PANIER VENTE FLASH] Erreur création reçu:', recuError);
        // Ne pas bloquer la vente si le reçu échoue
        console.warn('⚠️ [PANIER VENTE FLASH] Vente OK mais sans reçu');
      }

      // Vider le panier
      clearPanier();

      // Afficher toast succès
      showToast('success', 'Vente enregistrée !', `Facture ${numFacture} créée et encaissée`);

      // Callback succès (rafraîchir liste)
      if (onSuccess) {
        onSuccess();
      }

      // Fermer le panier
      onClose();

      // Afficher le reçu
      if (onShowRecu) {
        setTimeout(() => {
          onShowRecu(idFacture, numFacture, total);
        }, 300);
      }

    } catch (error) {
      console.error('❌ [PANIER VENTE FLASH] Erreur:', error);
      showToast('error', 'Erreur', error instanceof Error ? error.message : 'Erreur lors de la vente');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="
              fixed right-0 top-0 bottom-0 z-[101]
              w-full max-w-md bg-white shadow-2xl
              flex flex-col
            "
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">Panier Vente Flash</h2>
                  <p className="text-sm opacity-90">{totalItems} article(s)</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Liste des articles */}
              {articles.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Panier vide</p>
                  <p className="text-sm">Scannez ou recherchez des produits</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.map((article) => (
                    <motion.div
                      key={article.id_produit}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{article.nom_produit}</h3>
                          <p className="text-sm text-gray-500">
                            {article.prix_vente.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <button
                          onClick={() => removeArticle(article.id_produit)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Contrôles quantité */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(article.id_produit, article.quantity - 1)}
                            disabled={article.quantity <= 1}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold">{article.quantity}</span>
                          <button
                            onClick={() => updateQuantity(article.id_produit, article.quantity + 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Total ligne */}
                        <div className="font-bold text-gray-900">
                          {(article.prix_vente * article.quantity).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Remise */}
              {articles.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remise (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={sousTotal}
                    value={remise}
                    onChange={(e) => updateRemise(Math.max(0, Math.min(sousTotal, Number(e.target.value))))}
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
              )}

              {/* Totaux */}
              {articles.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total</span>
                    <span className="font-medium">{sousTotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {remise > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Remise</span>
                      <span className="font-medium">- {remise.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-green-300">
                    <span>TOTAL</span>
                    <span>{total.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Boutons d'action */}
            {articles.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 grid grid-cols-2 gap-3">
                {/* Bouton Annuler */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnnuler}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-gradient-to-r from-red-500 to-red-600 text-white
                    font-semibold shadow-lg hover:shadow-xl
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  <XCircle className="w-5 h-5" />
                  Annuler
                </motion.button>

                {/* Bouton Sauvegarder */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSauvegarder}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-gradient-to-r from-green-500 to-emerald-600 text-white
                    font-semibold shadow-lg hover:shadow-xl
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
                        <Receipt className="w-5 h-5" />
                      </motion.div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Sauvegarder
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
