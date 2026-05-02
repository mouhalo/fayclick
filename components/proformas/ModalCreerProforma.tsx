/**
 * Modal de creation/edition de proforma
 * Reutilise le panierStore pour la selection produits
 * Client obligatoire, pas d'acompte
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  Calculator, User, Search, Loader2, FileCheck
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { proformaService } from '@/services/proforma.service';
import { produitsService } from '@/services/produits.service';
import { useToast } from '@/components/ui/Toast';
import { ModalRechercheClient } from '@/components/panier/ModalRechercheClient';
import { Client } from '@/types/client';
import { Produit, ArticlePanier } from '@/types/produit';
import { Proforma, ProformaDetail } from '@/types/proforma';
import { formatAmount } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ModalCreerProformaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Mode edition: proforma existante a modifier */
  editMode?: boolean;
  proformaToEdit?: Proforma | null;
  proformaDetails?: ProformaDetail[];
}

export function ModalCreerProforma({
  isOpen,
  onClose,
  onSuccess,
  editMode = false,
  proformaToEdit = null,
  proformaDetails = []
}: ModalCreerProformaProps) {
  const { structure } = useAuth();
  const { showToast } = useToast();

  // Etat local pour les articles (pas le panierStore global pour eviter conflit)
  const [articles, setArticles] = useState<ArticlePanier[]>([]);
  const [clientInfo, setClientInfo] = useState<{ id_client?: number; nom_client: string; tel_client: string }>({
    nom_client: '', tel_client: ''
  });
  const [description, setDescription] = useState('');
  const [remise, setRemise] = useState(0);
  const [remiseMode, setRemiseMode] = useState<'%' | 'F'>('%');
  const [remiseInput, setRemiseInput] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalRechercheOpen, setIsModalRechercheOpen] = useState(false);

  // Recherche produit
  const [searchProduit, setSearchProduit] = useState('');
  const [produitsSuggestion, setProduitsSuggestion] = useState<Produit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);

  // Charger les produits au montage
  useEffect(() => {
    if (isOpen) {
      loadProduits();
    }
  }, [isOpen]);

  // En mode édition, hydrater les articles une fois les produits chargés
  // (besoin du prix_vente d'origine pour reconstituer la remise par article)
  useEffect(() => {
    if (isOpen && editMode && proformaToEdit && proformaDetails.length > 0 && allProduits.length > 0) {
      loadEditData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, proformaToEdit, proformaDetails, allProduits]);

  // Reset a la fermeture
  useEffect(() => {
    if (!isOpen && !editMode) {
      setArticles([]);
      setClientInfo({ nom_client: '', tel_client: '' });
      setDescription('');
      setRemise(0);
      setRemiseInput(0);
      setProduitsSuggestion([]);
      setSearchProduit('');
    }
  }, [isOpen]);

  const loadProduits = async () => {
    try {
      const response = await produitsService.getListeProduits();
      setAllProduits(response.data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  };

  const loadEditData = () => {
    if (!proformaToEdit || !proformaDetails) return;
    setClientInfo({
      nom_client: proformaToEdit.nom_client,
      tel_client: proformaToEdit.tel_client
    });
    setDescription(proformaToEdit.description || '');
    setRemise(proformaToEdit.mt_remise);
    setRemiseInput(proformaToEdit.mt_remise);
    setRemiseMode('F');

    // Convertir details proforma en articles + reconstituer la remise par ligne
    // En option A, le prix_unitaire stocké en BD est le prix net (après remise article).
    // On retrouve le prix d'origine via allProduits pour déduire le % de remise.
    const arts = proformaDetails.map(d => {
      const prod = allProduits.find(p => p.id_produit === d.id_produit);
      const prixOrigine = prod?.prix_vente ?? d.prix_unitaire;
      const remisePct = prixOrigine > d.prix_unitaire
        ? Math.round(((prixOrigine - d.prix_unitaire) / prixOrigine) * 100)
        : 0;
      return {
        id_produit: d.id_produit,
        nom_produit: d.nom_produit,
        prix_vente: prixOrigine,
        prix_applique: prixOrigine,
        quantity: d.quantite,
        remise_article: remisePct,
        cout_revient: 0,
        id_structure: 0,
        niveau_stock: 9999,
        code_barre: '',
      } as unknown as ArticlePanier;
    });
    setArticles(arts);
  };

  // Recherche produit
  useEffect(() => {
    if (searchProduit.length >= 2) {
      const filtered = allProduits.filter(p =>
        p.nom_produit.toLowerCase().includes(searchProduit.toLowerCase()) ||
        (p.code_barre && p.code_barre.includes(searchProduit))
      );
      setProduitsSuggestion(filtered.slice(0, 10));
    } else {
      setProduitsSuggestion([]);
    }
  }, [searchProduit, allProduits]);

  // Ajouter un article
  const handleAddProduit = (produit: Produit) => {
    const existing = articles.find(a => a.id_produit === produit.id_produit);
    if (existing) {
      setArticles(prev => prev.map(a =>
        a.id_produit === produit.id_produit
          ? { ...a, quantity: a.quantity + 1 }
          : a
      ));
    } else {
      setArticles(prev => [...prev, {
        ...produit,
        quantity: 1,
        prix_applique: produit.prix_vente,
      } as ArticlePanier]);
    }
    setSearchProduit('');
    setProduitsSuggestion([]);
  };

  // Modifier quantite
  const handleUpdateQuantity = (id_produit: number, delta: number) => {
    setArticles(prev => prev.map(a => {
      if (a.id_produit === id_produit) {
        const newQty = Math.max(1, a.quantity + delta);
        return { ...a, quantity: newQty };
      }
      return a;
    }));
  };

  const handleRemoveArticle = (id_produit: number) => {
    setArticles(prev => prev.filter(a => a.id_produit !== id_produit));
  };

  // Modifier la remise (%) d'un article (clamp 0-100)
  const handleUpdateRemiseArticle = (id_produit: number, remisePct: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(remisePct) ? 0 : remisePct));
    setArticles(prev => prev.map(a =>
      a.id_produit === id_produit ? { ...a, remise_article: clamped } : a
    ));
  };

  // Selection client
  const handleSelectClient = (client: Partial<Client> & { id_client?: number; nom_client: string; tel_client: string }) => {
    setClientInfo({
      id_client: client.id_client,
      nom_client: client.nom_client,
      tel_client: client.tel_client
    });
    setIsModalRechercheOpen(false);
    showToast('success', 'Client selectionne', `${client.nom_client}`);
  };

  // Calculs montants
  // sousTotalBrut : somme prix × qty (avant toute remise)
  const sousTotalBrut = articles.reduce((total, art) => total + (art.prix_applique ?? art.prix_vente) * art.quantity, 0);
  // Total des remises par ligne (chaque article a un % indépendant)
  const totalRemisesLignes = articles.reduce((total, art) => {
    const prix = art.prix_applique ?? art.prix_vente;
    const pct = art.remise_article || 0;
    return total + Math.round(prix * art.quantity * pct / 100);
  }, 0);
  // sousTotalNet : montant après remises par ligne (base pour la remise globale)
  const sousTotalNet = sousTotalBrut - totalRemisesLignes;
  // Remise globale appliquée sur le sousTotalNet
  const remiseGlobale = remiseMode === '%'
    ? Math.round(sousTotalNet * Math.min(100, remiseInput) / 100)
    : Math.min(sousTotalNet, remiseInput);
  // Pour le résumé visuel et l'envoi backend
  const sousTotal = sousTotalBrut;
  const remiseCalculee = totalRemisesLignes + remiseGlobale;
  const montantNet = sousTotalBrut - remiseCalculee;

  // Remise
  const handleRemiseChange = (value: number) => {
    setRemiseInput(value);
  };

  // Soumission
  const handleSubmit = async () => {
    if (articles.length === 0) {
      showToast('error', 'Erreur', 'Ajoutez au moins un article');
      return;
    }
    if (!clientInfo.nom_client || !clientInfo.tel_client) {
      showToast('error', 'Client obligatoire', 'Selectionnez un client pour la proforma');
      return;
    }

    setIsLoading(true);
    try {
      // Option A : remises par ligne absorbées dans prix_applique net.
      // La remise envoyée au backend = remise globale uniquement (la part par ligne
      // est déjà soustraite via prix_applique).
      const articlesAEnvoyer = articles.map(art => {
        const prixOrigine = art.prix_applique ?? art.prix_vente;
        const remisePct = art.remise_article || 0;
        const prixNet = Math.round(prixOrigine * (1 - remisePct / 100));
        return { ...art, prix_applique: prixNet };
      });

      if (editMode && proformaToEdit) {
        // Mode edition
        const result = await proformaService.editProforma(
          proformaToEdit.id_proforma,
          articlesAEnvoyer,
          { tel_client: clientInfo.tel_client, nom_client_payeur: clientInfo.nom_client, description },
          { remise: remiseGlobale, montant: sousTotalNet }
        );
        if (result.success) {
          showToast('success', 'Proforma modifiee', result.message);
          onSuccess();
          onClose();
        } else {
          showToast('error', 'Erreur', result.message);
        }
      } else {
        // Mode creation
        const result = await proformaService.createProforma(
          articlesAEnvoyer,
          { tel_client: clientInfo.tel_client, nom_client_payeur: clientInfo.nom_client, description },
          { remise: remiseGlobale }
        );
        if (result.success) {
          showToast('success', 'Proforma creee', `${result.num_proforma} creee avec succes`);
          onSuccess();
          onClose();
        } else {
          showToast('error', 'Erreur', result.message);
        }
      }
    } catch (error: any) {
      showToast('error', 'Erreur', error.message || 'Impossible de sauvegarder la proforma');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                {editMode ? 'Modifier la proforma' : 'Nouvelle proforma'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Section Client */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1">
                    <User className="w-4 h-4" /> Client *
                  </h3>
                  <button
                    onClick={() => setIsModalRechercheOpen(true)}
                    className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    {clientInfo.nom_client ? 'Changer' : 'Rechercher'}
                  </button>
                </div>
                {clientInfo.nom_client ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                      {clientInfo.nom_client.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{clientInfo.nom_client}</p>
                      <p className="text-xs text-gray-500">{clientInfo.tel_client}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 italic">Selectionnez un client (obligatoire)</p>
                )}
              </div>

              {/* Recherche produit */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchProduit}
                    onChange={(e) => setSearchProduit(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                {/* Suggestions */}
                {produitsSuggestion.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {produitsSuggestion.map(p => (
                      <button
                        key={p.id_produit}
                        onClick={() => handleAddProduit(p)}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors flex justify-between items-center text-sm border-b border-gray-100 last:border-0"
                      >
                        <span className="truncate">{p.nom_produit}</span>
                        <span className="text-amber-600 font-medium ml-2 whitespace-nowrap">
                          {formatAmount(p.prix_vente)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste articles */}
              {articles.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" /> Articles ({articles.length})
                  </h3>
                  {articles.map(art => {
                    const prix = art.prix_applique ?? art.prix_vente;
                    const remiseArt = art.remise_article || 0;
                    const totalLigneNet = Math.round(prix * art.quantity * (1 - remiseArt / 100));
                    return (
                      <div key={art.id_produit} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{art.nom_produit}</p>
                            <p className="text-xs text-gray-500">
                              {formatAmount(prix)} x {art.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateQuantity(art.id_produit, -1)}
                              className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">{art.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(art.id_produit, 1)}
                              className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center hover:bg-amber-200 text-amber-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-gray-900 w-20 text-right">
                            {formatAmount(totalLigneNet)}
                          </p>
                          <button
                            onClick={() => handleRemoveArticle(art.id_produit)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/60">
                          <span className="text-xs text-gray-600 font-medium">Remise :</span>
                          <input
                            type="number"
                            value={remiseArt || ''}
                            onChange={(e) => handleUpdateRemiseArticle(art.id_produit, Number(e.target.value))}
                            placeholder="0"
                            min={0}
                            max={100}
                            className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-right focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <span className="text-xs text-gray-500">%</span>
                          {remiseArt > 0 && (
                            <span className="ml-auto text-xs text-orange-600">
                              −{formatAmount(Math.round(prix * art.quantity * remiseArt / 100))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Recherchez et ajoutez des produits</p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optionnel)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description de la proforma..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Remise */}
              {articles.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
                    <Calculator className="w-4 h-4" /> Remise
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => { setRemiseMode('%'); setRemiseInput(0); }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${remiseMode === '%' ? 'bg-amber-600 text-white' : 'text-gray-600'}`}
                      >
                        %
                      </button>
                      <button
                        onClick={() => { setRemiseMode('F'); setRemiseInput(0); }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${remiseMode === 'F' ? 'bg-amber-600 text-white' : 'text-gray-600'}`}
                      >
                        FCFA
                      </button>
                    </div>
                    <input
                      type="number"
                      value={remiseInput || ''}
                      onChange={(e) => handleRemiseChange(Number(e.target.value))}
                      placeholder={remiseMode === '%' ? '0 %' : '0 FCFA'}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right"
                      min={0}
                      max={remiseMode === '%' ? 100 : sousTotal}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer montants + bouton */}
            {articles.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-3xl space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total</span>
                  <span className="font-medium">{formatAmount(sousTotal)}</span>
                </div>
                {remiseCalculee > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Remise</span>
                    <span>-{formatAmount(remiseCalculee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-300 pt-2">
                  <span>Total</span>
                  <span>{formatAmount(montantNet)}</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || articles.length === 0 || !clientInfo.nom_client}
                  className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileCheck className="w-5 h-5" />
                  )}
                  {isLoading
                    ? 'Enregistrement...'
                    : editMode ? 'Modifier la proforma' : 'Creer la proforma'
                  }
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal recherche client */}
      <ModalRechercheClient
        isOpen={isModalRechercheOpen}
        onClose={() => setIsModalRechercheOpen(false)}
        onSelectClient={handleSelectClient}
        initialPhone={clientInfo.tel_client}
        initialName={clientInfo.nom_client}
      />
    </>
  );
}
