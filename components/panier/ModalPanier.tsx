/**
 * Modal Panier - Interface complète de gestion du panier
 * Sections: Articles, Client, Remise, Validation
 * Intégration avec facture.service.ts
 * Note: Acompte = 0 par défaut pour nouvelle vente
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  ChevronDown, ChevronUp, Calculator, CreditCard, User, Edit3, XCircle
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { factureService } from '@/services/facture.service';
import { useToast } from '@/components/ui/Toast';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';
import { ModalRechercheClient } from './ModalRechercheClient';
import { Client } from '@/types/client';

export function ModalPanier() {
  const {
    articles, infosClient, remise,
    isModalOpen, setModalOpen,
    updateQuantity, removeArticle, clearPanier,
    updateInfosClient, updateRemise,
    getMontantsFacture
  } = usePanierStore();

  const { showToast } = useToast();
  const [isClientSectionOpen, setIsClientSectionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { openModal: openFactureSuccess } = useFactureSuccessStore();
  const [isModalRechercheOpen, setIsModalRechercheOpen] = useState(false);

  const montants = getMontantsFacture();

  if (!isModalOpen) return null;

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleUpdateQuantity = (id_produit: number, newQuantity: number) => {
    updateQuantity(id_produit, newQuantity);
  };

  const handleRemoveArticle = (id_produit: number) => {
    removeArticle(id_produit);
    showToast('info', 'Article supprimé', 'L\'article a été retiré du panier');
  };

  const handleSelectClient = (client: Partial<Client> & { nom_client: string; tel_client: string }) => {
    console.log('[PANIER] Client selectionne:', client);

    updateInfosClient({
      id_client: client.id_client,
      nom_client_payeur: client.nom_client,
      tel_client: client.tel_client
    });

    showToast('success', 'Client selectionne', `${client.nom_client} - ${client.tel_client}`);
  };

  const handleAnnulerPanier = () => {
    if (articles.length === 0) {
      showToast('info', 'Panier vide', 'Le panier est deja vide');
      return;
    }

    // Confirmation avant de vider
    if (window.confirm(`Voulez-vous vraiment vider le panier ?\n${articles.length} article(s) seront supprimes.`)) {
      clearPanier();
      showToast('success', 'Panier vide', 'Tous les articles ont ete supprimes');
      setModalOpen(false);
    }
  };

  const handleCommander = async () => {
    try {
      setIsLoading(true);

      // Validation minimale
      if (articles.length === 0) {
        showToast('error', 'Erreur', 'Aucun article dans le panier');
        return;
      }

      // Création de la facture (acompte = 0 par défaut pour nouvelle vente)
      const result = await factureService.createFacture(
        articles,
        infosClient,
        { remise, acompte: 0 },
        false // avec_frais
      );

      if (result.success) {
        // Succès - ouvrir le modal de succès via le store global
        console.log('✅ Facture créée avec succès, ID:', result.id_facture);

        // Fermer le modal panier et vider
        clearPanier();
        setModalOpen(false);

        // Ouvrir le modal de succès après un court délai
        setTimeout(() => {
          openFactureSuccess(result.id_facture);
        }, 300);
      } else {
        showToast('error', 'Erreur', result.message || 'Impossible de créer la facture');
      }
    } catch (error: any) {
      console.error('Erreur création facture:', error);
      showToast('error', 'Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="
                bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] 
                flex flex-col shadow-2xl border border-gray-200/50
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Mon Panier</h2>
                    <p className="text-sm text-gray-500">{articles.length} article{articles.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto">
                {/* Section Articles */}
                <div className="p-6 space-y-4">
                  {articles.map((article) => (
                    <motion.div
                      key={article.id_produit}
                      layout
                      className="
                        bg-gradient-to-r from-blue-50 to-blue-100/50
                        rounded-xl p-4 border border-blue-200/50
                      "
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 flex-1">{article.nom_produit}</h3>
                        <button
                          onClick={() => handleRemoveArticle(article.id_produit)}
                          className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-gray-600">Prix unitaire</div>
                          <div className="font-bold text-blue-600">
                            {article.prix_vente.toLocaleString('fr-FR')} FCFA
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Sous-total</div>
                          <div className="font-bold text-gray-900">
                            {(article.prix_vente * article.quantity).toLocaleString('fr-FR')} FCFA
                          </div>
                        </div>
                      </div>

                      {/* Contrôles quantité */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Quantité</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateQuantity(article.id_produit, article.quantity - 1)}
                            className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={article.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold">{article.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(article.id_produit, article.quantity + 1)}
                            className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={article.quantity >= (article.niveau_stock || 0)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {article.quantity >= (article.niveau_stock || 0) && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          Stock maximum atteint
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Section Client */}
                <div className="px-6 pb-4">
                  <button
                    onClick={() => setIsClientSectionOpen(!isClientSectionOpen)}
                    className="
                      w-full flex items-center justify-between p-4
                      bg-gray-50 rounded-xl border border-gray-200/50
                      hover:bg-gray-100 transition-colors
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-gray-900 block">
                          {infosClient.nom_client_payeur || 'CLIENT ANONYME'}
                        </span>
                        {infosClient.tel_client && (
                          <span className="text-xs text-gray-500">
                            {infosClient.tel_client}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsModalRechercheOpen(true);
                        }}
                        className="
                          w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center
                          hover:bg-blue-200 transition-colors
                        "
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </button>
                      {isClientSectionOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isClientSectionOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description (optionnelle)
                            </label>
                            <textarea
                              value={infosClient.description || ''}
                              onChange={(e) => updateInfosClient({ description: e.target.value })}
                              placeholder="Note sur la commande..."
                              rows={2}
                              className="
                                w-full px-4 py-3 rounded-xl border border-gray-300
                                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                transition-all resize-none
                              "
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Section Remise uniquement */}
                <div className="px-6 pb-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-900">Calculs</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remise (FCFA)
                      </label>
                      <input
                        type="number"
                        value={remise}
                        onChange={(e) => updateRemise(Number(e.target.value))}
                        min="0"
                        max={montants.sous_total}
                        className="
                          w-full px-3 py-2 rounded-lg border border-gray-300
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          text-sm
                        "
                      />
                    </div>

                    {/* Récapitulatif des montants */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sous-total:</span>
                        <span>{montants.sous_total.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {montants.remise > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Remise:</span>
                          <span>-{montants.remise.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>{montants.montant_net.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Boutons Annuler / Commander */}
              <div className="p-6 border-t border-gray-200/50 grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnnulerPanier}
                  disabled={isLoading || articles.length === 0}
                  className="
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white font-semibold py-4 rounded-xl
                    shadow-lg hover:shadow-xl transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                  "
                >
                  <XCircle className="w-5 h-5" />
                  Annuler
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCommander}
                  disabled={isLoading || articles.length === 0}
                  className="
                    bg-gradient-to-r from-blue-600 to-blue-700
                    text-white font-semibold py-4 rounded-xl
                    shadow-lg hover:shadow-xl transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                  "
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Commander
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Recherche Client */}
      <ModalRechercheClient
        isOpen={isModalRechercheOpen}
        onClose={() => setIsModalRechercheOpen(false)}
        onSelectClient={handleSelectClient}
        initialPhone={infosClient.tel_client || ''}
        initialName={infosClient.nom_client_payeur || ''}
      />
    </>
  );
}