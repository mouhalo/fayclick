/**
 * Modal Création/Édition Bon de Commande
 *
 * FR-021 : Sélection fournisseur (obligatoire), recherche produit, articles avec
 * prix = cout_revient (fallback prix_vente + warning), remise par article %,
 * remise globale toggle %/FCFA, description, pas d'acompte.
 *
 * Mode édition :
 *  - Refus si statut = LIVRÉ (banner d'avertissement bloquant)
 *  - Pré-remplissage depuis bonCommandeDetails.bon_commande.articles[]
 *  - Reconstitution remise % par ligne via prixOrigine = cout_revient || prix_vente
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Calculator,
  Building2,
  Search,
  Loader2,
  Package,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import bonCommandeService from '@/services/bon-commande.service';
import { produitsService } from '@/services/produits.service';
import { ModalGestionFournisseurs } from '@/components/fournisseurs/ModalGestionFournisseurs';
import type { Fournisseur } from '@/types/fournisseur';
import { Produit, ArticlePanier } from '@/types/produit';
import { BonCommande, BonCommandeComplete } from '@/types/bon-commande';
import { formatAmount } from '@/lib/utils';

interface ModalCreerBonCommandeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (idBC?: number) => void;
  /** Mode édition : BC existant à modifier */
  bonCommandeToEdit?: BonCommande | null;
  /** Détails complets (avec articles) pour pré-remplir en mode édition */
  bonCommandeDetails?: BonCommandeComplete | null;
}

interface FournisseurLocal {
  id_fournisseur: number;
  nom_fournisseur: string;
  tel_fournisseur?: string | null;
}

export function ModalCreerBonCommande({
  isOpen,
  onClose,
  onSuccess,
  bonCommandeToEdit = null,
  bonCommandeDetails = null,
}: ModalCreerBonCommandeProps) {
  const editMode = !!bonCommandeToEdit;
  const isLivre = bonCommandeToEdit?.libelle_etat === 'LIVRE';

  // État panier local (pas de Zustand pour éviter conflits multi-modals)
  const [articles, setArticles] = useState<ArticlePanier[]>([]);
  const [fournisseur, setFournisseur] = useState<FournisseurLocal | null>(null);
  const [description, setDescription] = useState('');
  const [remiseInput, setRemiseInput] = useState(0);
  const [remiseMode, setRemiseMode] = useState<'%' | 'F'>('%');
  const [isLoading, setIsLoading] = useState(false);
  const [showModalFournisseurs, setShowModalFournisseurs] = useState(false);

  // Recherche produit
  const [searchProduit, setSearchProduit] = useState('');
  const [produitsSuggestion, setProduitsSuggestion] = useState<Produit[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);

  // Chargement produits au montage
  useEffect(() => {
    if (isOpen) {
      loadProduits();
    }
  }, [isOpen]);

  // Hydratation mode édition une fois produits chargés
  useEffect(() => {
    if (isOpen && editMode && bonCommandeToEdit && bonCommandeDetails && allProduits.length > 0) {
      hydrateEditData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, bonCommandeToEdit, bonCommandeDetails, allProduits]);

  // Reset à la fermeture (mode création uniquement)
  useEffect(() => {
    if (!isOpen && !editMode) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetForm = () => {
    setArticles([]);
    setFournisseur(null);
    setDescription('');
    setRemiseInput(0);
    setRemiseMode('%');
    setSearchProduit('');
    setProduitsSuggestion([]);
  };

  const loadProduits = async () => {
    try {
      const response = await produitsService.getListeProduits();
      setAllProduits(response.data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  };

  const hydrateEditData = () => {
    if (!bonCommandeToEdit || !bonCommandeDetails) return;

    const bc = bonCommandeDetails.bon_commande;

    // Fournisseur depuis le snapshot
    setFournisseur({
      id_fournisseur: bc.fournisseur?.id_fournisseur ?? bonCommandeToEdit.id_fournisseur,
      nom_fournisseur:
        bc.fournisseur?.nom_fournisseur ?? bonCommandeToEdit.nom_fournisseur_snap ?? '',
      tel_fournisseur:
        bc.fournisseur?.tel_fournisseur ?? bonCommandeToEdit.tel_fournisseur_snap ?? '',
    });

    setDescription(bonCommandeToEdit.description || '');
    setRemiseInput(bonCommandeToEdit.mt_remise || 0);
    setRemiseMode('F'); // remise stockée en FCFA

    // Reconstituer articles : prix appliqué (= cout_revient enregistré)
    // Pour BC, prixOrigine = cout_revient (fallback prix_vente) — différent de proforma
    const arts: ArticlePanier[] = (bc.articles || []).map((d) => {
      const prod = allProduits.find((p) => p.id_produit === d.id_produit);
      const prixOrigine =
        prod?.cout_revient && prod.cout_revient > 0
          ? prod.cout_revient
          : prod?.prix_vente ?? d.cout_revient;
      const remisePct =
        prixOrigine > d.cout_revient
          ? Math.round(((prixOrigine - d.cout_revient) / prixOrigine) * 100)
          : 0;

      return {
        id_produit: d.id_produit,
        nom_produit: d.nom_produit_snap,
        prix_vente: prixOrigine,
        prix_applique: prixOrigine,
        quantity: d.quantite,
        remise_article: remisePct,
        cout_revient: prod?.cout_revient ?? d.cout_revient,
        id_structure: prod?.id_structure ?? 0,
        niveau_stock: prod?.niveau_stock ?? 9999,
        code_barre: prod?.code_barre ?? '',
      } as unknown as ArticlePanier;
    });
    setArticles(arts);
  };

  // Recherche produit (nom + code-barres, min 2 char)
  useEffect(() => {
    if (searchProduit.length >= 2) {
      const term = searchProduit.toLowerCase();
      const filtered = allProduits.filter(
        (p) =>
          p.nom_produit.toLowerCase().includes(term) ||
          (p.code_barre && p.code_barre.includes(searchProduit))
      );
      setProduitsSuggestion(filtered.slice(0, 10));
    } else {
      setProduitsSuggestion([]);
    }
  }, [searchProduit, allProduits]);

  // Sélection fournisseur (depuis ModalGestionFournisseurs)
  const handleSelectFournisseur = (f: Fournisseur) => {
    setFournisseur({
      id_fournisseur: f.id_fournisseur,
      nom_fournisseur: f.nom_fournisseur,
      tel_fournisseur: f.tel_fournisseur,
    });
    setShowModalFournisseurs(false);
    toast.success(`Fournisseur sélectionné : ${f.nom_fournisseur}`);
  };

  // Ajout produit — prix par défaut = cout_revient (fallback prix_vente)
  const handleAddProduit = (produit: Produit) => {
    const existing = articles.find((a) => a.id_produit === produit.id_produit);
    if (existing) {
      setArticles((prev) =>
        prev.map((a) =>
          a.id_produit === produit.id_produit ? { ...a, quantity: a.quantity + 1 } : a
        )
      );
    } else {
      const prixApplique =
        produit.cout_revient && produit.cout_revient > 0
          ? produit.cout_revient
          : produit.prix_vente;
      setArticles((prev) => [
        ...prev,
        {
          ...produit,
          quantity: 1,
          prix_applique: prixApplique,
        } as ArticlePanier,
      ]);
    }
    setSearchProduit('');
    setProduitsSuggestion([]);
  };

  const handleUpdateQuantity = (id_produit: number, delta: number) => {
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id_produit === id_produit) {
          const newQty = Math.max(1, a.quantity + delta);
          return { ...a, quantity: newQty };
        }
        return a;
      })
    );
  };

  const handleRemoveArticle = (id_produit: number) => {
    setArticles((prev) => prev.filter((a) => a.id_produit !== id_produit));
  };

  const handleUpdatePrixArticle = (id_produit: number, prix: number) => {
    if (prix < 0) return;
    setArticles((prev) =>
      prev.map((a) => (a.id_produit === id_produit ? { ...a, prix_applique: prix } : a))
    );
  };

  const handleUpdateRemiseArticle = (id_produit: number, remisePct: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(remisePct) ? 0 : remisePct));
    setArticles((prev) =>
      prev.map((a) => (a.id_produit === id_produit ? { ...a, remise_article: clamped } : a))
    );
  };

  // Calculs montants
  const sousTotalBrut = articles.reduce(
    (total, art) => total + (art.prix_applique ?? art.prix_vente) * art.quantity,
    0
  );
  const totalRemisesLignes = articles.reduce((total, art) => {
    const prix = art.prix_applique ?? art.prix_vente;
    const pct = art.remise_article || 0;
    return total + Math.round((prix * art.quantity * pct) / 100);
  }, 0);
  const sousTotalNet = sousTotalBrut - totalRemisesLignes;
  const remiseGlobale =
    remiseMode === '%'
      ? Math.round((sousTotalNet * Math.min(100, remiseInput)) / 100)
      : Math.min(sousTotalNet, remiseInput);
  const remiseCalculee = totalRemisesLignes + remiseGlobale;
  const montantNet = sousTotalBrut - remiseCalculee;

  // Articles avec coût manquant (warning)
  const articlesAvecCoutManquant = articles.filter(
    (a) => !a.cout_revient || a.cout_revient <= 0
  );

  const handleSubmit = async () => {
    if (articles.length === 0) {
      toast.error('Ajoutez au moins un article');
      return;
    }
    if (!fournisseur || !fournisseur.id_fournisseur) {
      toast.error('Sélectionnez un fournisseur (obligatoire)');
      return;
    }

    setIsLoading(true);
    try {
      // Absorption remises par ligne dans prix_applique
      const articlesAEnvoyer: ArticlePanier[] = articles.map((art) => {
        const prixOrigine = art.prix_applique ?? art.prix_vente;
        const remisePct = art.remise_article || 0;
        const prixNet = Math.round(prixOrigine * (1 - remisePct / 100));
        return { ...art, prix_applique: prixNet };
      });

      if (editMode && bonCommandeToEdit) {
        // Mode édition
        const result = await bonCommandeService.editBonCommande(
          bonCommandeToEdit.id_bon_commande,
          {
            articles: articlesAEnvoyer,
            fournisseurInfo: {
              id_fournisseur: fournisseur.id_fournisseur,
              description,
            },
            montants: {
              sous_total: sousTotalBrut,
              remise: remiseCalculee,
              montant_net: montantNet,
            },
          }
        );
        if (result.success) {
          toast.success(result.message || 'Bon de commande modifié');
          onSuccess(bonCommandeToEdit.id_bon_commande);
          onClose();
        } else {
          toast.error(result.message || 'Erreur modification');
        }
      } else {
        // Mode création
        const result = await bonCommandeService.createBonCommande(
          articlesAEnvoyer,
          {
            id_fournisseur: fournisseur.id_fournisseur,
            description,
          },
          { remise: remiseCalculee }
        );
        if (result.success) {
          toast.success(`${result.num_bc || 'BC'} créé avec succès`);
          onSuccess(result.id_bon_commande);
          onClose();
        } else {
          toast.error(result.message || 'Erreur création');
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de sauvegarder le bon de commande');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Mode édition refusée si BC livré
  if (editMode && isLivre) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Bon de commande livré</h3>
              <p className="text-sm text-gray-600 mb-5">
                Ce bon de commande est livré et ne peut plus être modifié.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

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
                <Package className="w-5 h-5 text-sky-600" />
                {editMode ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Section Fournisseur */}
              <div className="bg-sky-50 rounded-xl p-3 border border-sky-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-sky-800 flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> Fournisseur *
                  </h3>
                  <button
                    onClick={() => setShowModalFournisseurs(true)}
                    className="text-xs bg-sky-600 text-white px-3 py-1 rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    {fournisseur ? 'Changer' : 'Sélectionner'}
                  </button>
                </div>
                {fournisseur ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sky-200 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm">
                      {fournisseur.nom_fournisseur.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fournisseur.nom_fournisseur}
                      </p>
                      {fournisseur.tel_fournisseur && (
                        <p className="text-xs text-gray-500">{fournisseur.tel_fournisseur}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-sky-600 italic">
                    Sélectionnez un fournisseur (obligatoire)
                  </p>
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
                    placeholder="Rechercher un produit (nom ou code-barres)..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                {/* Suggestions */}
                {produitsSuggestion.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {produitsSuggestion.map((p) => {
                      const prixAchat =
                        p.cout_revient && p.cout_revient > 0 ? p.cout_revient : p.prix_vente;
                      const coutMissing = !p.cout_revient || p.cout_revient <= 0;
                      return (
                        <button
                          key={p.id_produit}
                          onClick={() => handleAddProduit(p)}
                          className="w-full text-left px-3 py-2 hover:bg-sky-50 transition-colors flex justify-between items-center text-sm border-b border-gray-100 last:border-0"
                        >
                          <span className="truncate flex items-center gap-1">
                            {coutMissing && (
                              <AlertTriangle
                                className="w-3 h-3 text-orange-500 flex-shrink-0"
                                aria-label="Coût de revient manquant"
                              />
                            )}
                            {p.nom_produit}
                          </span>
                          <span className="text-sky-600 font-medium ml-2 whitespace-nowrap">
                            {formatAmount(prixAchat)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Warning global coût manquant */}
              {articlesAvecCoutManquant.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800">
                    {articlesAvecCoutManquant.length} article{articlesAvecCoutManquant.length > 1 ? 's' : ''} sans
                    coût de revient — le prix de vente est utilisé par défaut. Vous pouvez ajuster
                    manuellement les prix ci-dessous.
                  </p>
                </div>
              )}

              {/* Liste articles */}
              {articles.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" /> Articles ({articles.length})
                  </h3>
                  {articles.map((art) => {
                    const prix = art.prix_applique ?? art.prix_vente;
                    const remiseArt = art.remise_article || 0;
                    const totalLigneNet = Math.round(prix * art.quantity * (1 - remiseArt / 100));
                    const coutMissing = !art.cout_revient || art.cout_revient <= 0;

                    return (
                      <div
                        key={art.id_produit}
                        className="bg-gray-50 rounded-xl p-2.5 border border-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                              {coutMissing && (
                                <AlertTriangle
                                  className="w-3 h-3 text-orange-500 flex-shrink-0"
                                  aria-label="Coût manquant"
                                />
                              )}
                              {art.nom_produit}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatAmount(prix)} × {art.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateQuantity(art.id_produit, -1)}
                              className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">
                              {art.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(art.id_produit, 1)}
                              className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center hover:bg-sky-200 text-sky-700"
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

                        {/* Prix éditable + remise */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/60">
                          <span className="text-xs text-gray-600 font-medium">Prix :</span>
                          <input
                            type="number"
                            value={prix || ''}
                            onChange={(e) =>
                              handleUpdatePrixArticle(art.id_produit, Number(e.target.value))
                            }
                            min={0}
                            className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-right focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-gray-600 font-medium">Remise :</span>
                          <input
                            type="number"
                            value={remiseArt || ''}
                            onChange={(e) =>
                              handleUpdateRemiseArticle(art.id_produit, Number(e.target.value))
                            }
                            placeholder="0"
                            min={0}
                            max={100}
                            className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-right focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                          <span className="text-xs text-gray-500">%</span>
                          {remiseArt > 0 && (
                            <span className="ml-auto text-xs text-orange-600">
                              −{formatAmount(Math.round((prix * art.quantity * remiseArt) / 100))}
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
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du bon de commande..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Remise globale */}
              {articles.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
                    <Calculator className="w-4 h-4" /> Remise globale
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => {
                          setRemiseMode('%');
                          setRemiseInput(0);
                        }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          remiseMode === '%' ? 'bg-sky-600 text-white' : 'text-gray-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        onClick={() => {
                          setRemiseMode('F');
                          setRemiseInput(0);
                        }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          remiseMode === 'F' ? 'bg-sky-600 text-white' : 'text-gray-600'
                        }`}
                      >
                        FCFA
                      </button>
                    </div>
                    <input
                      type="number"
                      value={remiseInput || ''}
                      onChange={(e) => setRemiseInput(Number(e.target.value))}
                      placeholder={remiseMode === '%' ? '0 %' : '0 FCFA'}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right"
                      min={0}
                      max={remiseMode === '%' ? 100 : sousTotalNet}
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
                  <span className="font-medium">{formatAmount(sousTotalBrut)}</span>
                </div>
                {remiseCalculee > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Total remises</span>
                    <span>−{formatAmount(remiseCalculee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-300 pt-2">
                  <span>Montant net</span>
                  <span>{formatAmount(montantNet)}</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || articles.length === 0 || !fournisseur}
                  className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Package className="w-5 h-5" />
                  )}
                  {isLoading
                    ? 'Enregistrement...'
                    : editMode
                    ? 'Enregistrer modifications'
                    : 'Créer Bon de Commande'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal sélection fournisseur */}
      <ModalGestionFournisseurs
        isOpen={showModalFournisseurs}
        onClose={() => setShowModalFournisseurs(false)}
        onSelectFournisseur={handleSelectFournisseur}
        selectionMode
      />
    </>
  );
}

