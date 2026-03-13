/**
 * ProformaSidePanel - Panneau lateral non-modal pour le panier proforma
 * Reserve au desktop (>=1024px), affiche a droite de la grille produits
 * Theme amber, client obligatoire, generation proforma
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus,
  Calculator, FileText, User, XCircle, GripVertical, X, AlertTriangle
} from 'lucide-react';
import { usePanierProformaStore } from '@/stores/panierProformaStore';
import { proformaService } from '@/services/proforma.service';
import { useToast } from '@/components/ui/Toast';
import { ModalRechercheClient } from '@/components/panier/ModalRechercheClient';
import { Client } from '@/types/client';

interface ProformaSidePanelProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ProformaSidePanel({ onSuccess, onClose }: ProformaSidePanelProps) {
  const {
    articles, infosClient, remise,
    updateQuantity, removeArticle, clearPanier,
    updateInfosClient, updateRemise, updateRemiseArticle, clearRemisesArticles,
    getMontantsProforma
  } = usePanierProformaStore();

  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalRechercheOpen, setIsModalRechercheOpen] = useState(false);

  // Mode remise : '%' (pourcentage) ou 'F' (valeur fixe)
  const [remiseMode, setRemiseMode] = useState<'%' | 'F'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vf_remise_mode') as '%' | 'F') || '%';
    }
    return '%';
  });
  const [remiseInput, setRemiseInput] = useState<number>(0);

  const montants = getMontantsProforma();
  const sousTotal = montants.sous_total;

  // Client obligatoire : verifier si un client est selectionne
  const hasClient = !!(infosClient.nom_client_payeur && infosClient.nom_client_payeur.trim() !== '');

  const handleRemiseModeChange = (mode: '%' | 'F') => {
    setRemiseMode(mode);
    localStorage.setItem('vf_remise_mode', mode);
    setRemiseInput(0);
    updateRemise(0);
    clearRemisesArticles();
  };

  const handleRemiseInputChange = (value: number) => {
    setRemiseInput(value);
    if (remiseMode === '%') {
      const pct = Math.max(0, Math.min(100, value));
      updateRemise(Math.round(sousTotal * pct / 100));
    } else {
      updateRemise(Math.max(0, Math.min(sousTotal, value)));
    }
  };

  // Recalculer la remise store si le sous-total change en mode %
  useEffect(() => {
    if (remiseMode === '%' && remiseInput > 0) {
      updateRemise(Math.round(sousTotal * Math.min(100, remiseInput) / 100));
    }
  }, [sousTotal]);

  const handleUpdateQuantity = (id_produit: number, newQuantity: number) => {
    updateQuantity(id_produit, newQuantity);
  };

  const handleRemoveArticle = (id_produit: number) => {
    removeArticle(id_produit);
    showToast('info', 'Article supprime', 'L\'article a ete retire du panier');
  };

  const handleSelectClient = (client: Partial<Client> & { nom_client: string; tel_client: string }) => {
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
    if (window.confirm(`Voulez-vous vraiment vider le panier proforma ?\n${articles.length} article(s) seront supprimes.`)) {
      clearPanier();
      showToast('success', 'Panier vide', 'Tous les articles ont ete supprimes');
    }
  };

  const handleGenererProforma = async () => {
    try {
      setIsLoading(true);

      if (articles.length === 0) {
        showToast('error', 'Erreur', 'Aucun article dans le panier');
        return;
      }

      if (!hasClient) {
        showToast('error', 'Client obligatoire', 'Veuillez selectionner un client pour la proforma');
        return;
      }

      const result = await proformaService.createProforma(
        articles,
        {
          tel_client: infosClient.tel_client || '',
          nom_client_payeur: infosClient.nom_client_payeur || '',
          description: infosClient.description
        },
        { remise }
      );

      if (result.success) {
        clearPanier();
        showToast('success', 'Proforma creee', `Proforma ${result.num_proforma || ''} generee avec succes`);
        onSuccess?.();
      } else {
        showToast('error', 'Erreur', result.message || 'Impossible de creer la proforma');
      }
    } catch (error: any) {
      console.error('Erreur creation proforma:', error);
      showToast('error', 'Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Portal pour sortir du conteneur parent et permettre le drag libre
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Contraintes de drag = viewport entier */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9999]" />

      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragElastic={0.05}
        dragMomentum={false}
        className="fixed top-2 right-2 z-[9999] w-[380px]"
        style={{ touchAction: 'none' }}
      >
        <div className="h-[calc(100vh-16px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header - zone de drag */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center gap-3 p-3 border-b border-gray-200/50 bg-gradient-to-r from-amber-50 to-amber-100/50 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">Panier Proforma</h2>
              <p className="text-xs text-gray-500">{articles.length} article{articles.length > 1 ? 's' : ''}</p>
            </div>
            <span className="text-[10px] text-gray-400">Glisser pour deplacer</span>
            {/* Bouton fermer */}
            {onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 bg-gray-200 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                title="Fermer le panier proforma"
              >
                <X className="w-3.5 h-3.5 text-gray-600 hover:text-red-600" />
              </button>
            )}
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto">
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Panier vide</p>
                <p className="text-xs mt-1">Ajoutez des produits depuis la grille</p>
              </div>
            ) : (
              <>
                {/* Bouton Client (obligatoire) */}
                <div className="px-4 pt-3 pb-1">
                  <button
                    onClick={() => setIsModalRechercheOpen(true)}
                    className={`w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                      hasClient ? 'hover:bg-amber-50' : 'bg-red-50 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      hasClient
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                        : 'bg-gradient-to-br from-red-400 to-red-500'
                    }`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      {hasClient ? (
                        <>
                          <span className="font-semibold text-gray-900 block truncate text-sm">
                            {infosClient.nom_client_payeur}
                          </span>
                          <span className="text-xs text-gray-500">{infosClient.tel_client}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-red-700 text-sm flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Client (obligatoire)
                          </span>
                          <span className="text-[10px] text-red-500">Selectionnez un client pour la proforma</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {/* Liste articles (tries par ordre alphabetique) */}
                <div className="px-4 py-2 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {[...articles].sort((a, b) => a.nom_produit.localeCompare(b.nom_produit, 'fr')).map((article) => (
                      <motion.div
                        key={article.id_produit}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg p-2.5 border border-amber-200/50"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-xs flex-1 pr-2 line-clamp-2 leading-tight">
                            {article.nom_produit}
                          </h3>
                          <button
                            onClick={() => handleRemoveArticle(article.id_produit)}
                            className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-gray-500">
                              {(article.prix_applique ?? article.prix_vente).toLocaleString('fr-FR')} x {article.quantity}
                              {article.prix_applique && article.prix_applique !== article.prix_vente && (
                                <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded">GROS</span>
                              )}
                            </div>
                            <div className="font-bold text-amber-600 text-xs">
                              {((article.prix_applique ?? article.prix_vente) * article.quantity).toLocaleString('fr-FR')} F
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateQuantity(article.id_produit, article.quantity - 1)}
                              className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              disabled={article.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={article.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= (article.niveau_stock || 0)) {
                                  handleUpdateQuantity(article.id_produit, val);
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              min={1}
                              max={article.niveau_stock || 0}
                              className="w-10 h-6 text-center font-semibold text-xs border border-gray-300 rounded-md focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(article.id_produit, article.quantity + 1)}
                              className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              disabled={article.quantity >= (article.niveau_stock || 0)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {article.quantity >= (article.niveau_stock || 0) && (
                          <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            Stock maximum atteint
                          </div>
                        )}

                        {/* Remise par article */}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Remise:</span>
                            <input
                              type="number"
                              min={0}
                              max={remiseMode === '%' ? 100 : (article.prix_applique ?? article.prix_vente) * article.quantity}
                              value={article.remise_article || 0}
                              onChange={(e) => updateRemiseArticle(article.id_produit, Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-14 h-5 text-center text-[10px] border border-gray-300 rounded focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500">{remiseMode === '%' ? '%' : 'F'}</span>
                          </div>
                          {(article.remise_article || 0) > 0 && (
                            <span className="text-[10px] font-medium text-green-600">
                              -{(remiseMode === '%'
                                ? Math.round((article.prix_applique ?? article.prix_vente) * article.quantity * (article.remise_article || 0) / 100)
                                : (article.remise_article || 0)
                              ).toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Section Remise (dans la zone scrollable) */}
                <div className="px-4 pb-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-900 text-sm">Calculs</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">Remise</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                          <button
                            onClick={() => handleRemiseModeChange('%')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${
                              remiseMode === '%'
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-amber-500 hover:bg-amber-50'
                            }`}
                          >
                            %
                          </button>
                          <button
                            onClick={() => handleRemiseModeChange('F')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${
                              remiseMode === 'F'
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-amber-500 hover:bg-amber-50'
                            }`}
                          >
                            FCFA
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={remiseInput}
                        onChange={(e) => handleRemiseInputChange(Number(e.target.value))}
                        min="0"
                        max={remiseMode === '%' ? 100 : sousTotal}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        placeholder={remiseMode === '%' ? '0 %' : '0 FCFA'}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer sticky — Recapitulatif + Boutons (toujours visible) */}
          {articles.length > 0 && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              {/* Recapitulatif des montants */}
              <div className="px-4 pt-3 pb-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">{montants.sous_total.toLocaleString('fr-FR')} F</span>
                </div>
                {montants.remise > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Remise{remiseMode === '%' ? ` (${remiseInput}%)` : ''}:</span>
                    <span>-{montants.remise.toLocaleString('fr-FR')} F</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-1.5">
                  <span>Total:</span>
                  <span className="text-amber-600">{montants.montant_net.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Avertissement client manquant */}
              {!hasClient && (
                <div className="px-4 pb-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Selectionnez un client pour generer la proforma</span>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnnulerPanier}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </motion.button>

                <motion.button
                  whileHover={{ scale: hasClient ? 1.02 : 1 }}
                  whileTap={{ scale: hasClient ? 0.98 : 1 }}
                  onClick={handleGenererProforma}
                  disabled={isLoading || !hasClient}
                  className={`text-white font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm ${
                    hasClient
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:shadow-xl'
                      : 'bg-gray-400 cursor-not-allowed'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generer Proforma
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal de Recherche Client */}
      <ModalRechercheClient
        isOpen={isModalRechercheOpen}
        onClose={() => setIsModalRechercheOpen(false)}
        onSelectClient={handleSelectClient}
        initialPhone={infosClient.tel_client || ''}
        initialName={infosClient.nom_client_payeur || ''}
      />
    </>,
    document.body
  );
}
