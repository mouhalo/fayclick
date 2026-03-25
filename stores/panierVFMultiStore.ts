/**
 * Store multi-panier VenteFlash (desktop uniquement)
 * Permet jusqu'à 3 paniers simultanés avec système d'onglets
 * Isolation totale du panierStore existant
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ArticlePanier } from '@/types/produit';

const MAX_PANIERS = 3;

export interface PanierVF {
  id: number;                // Date.now() à la création (sert aussi de createdAt)
  articles: ArticlePanier[];
  remise: number;            // Remise globale en FCFA
}

export interface MontantsFactureVF {
  sous_total: number;
  remise: number;
  montant_net: number;
  acompte: number;
  reste_a_payer: number;
}

interface PanierVFMultiState {
  paniers: PanierVF[];
  activePanierId: number | null;

  // Actions paniers
  createPanier: () => number | null;
  switchPanier: (id: number) => void;
  closePanier: (id: number) => void;
  clearAll: () => void;

  // Actions sur panier actif
  addArticle: (produit: any, quantity?: number, prixApplique?: number) => void;
  removeArticle: (id_produit: number) => void;
  updateQuantity: (id_produit: number, quantity: number) => void;
  updateRemise: (remise: number) => void;
  updateRemiseArticle: (id_produit: number, remise_val: number) => void;
  clearRemisesArticles: () => void;

  // Getters
  getActivePanier: () => PanierVF | null;
  getTotalItems: () => number;
  getSousTotal: () => number;
  getMontantsFacture: () => MontantsFactureVF;
  getPanierCount: () => number;
}

/**
 * Helper : met à jour le panier actif dans la liste
 */
function updateActivePanier(
  paniers: PanierVF[],
  activePanierId: number | null,
  updater: (panier: PanierVF) => PanierVF
): PanierVF[] {
  if (activePanierId === null) return paniers;
  return paniers.map(p => p.id === activePanierId ? updater(p) : p);
}

export const usePanierVFMultiStore = create<PanierVFMultiState>()(
  persist(
    (set, get) => ({
      paniers: [],
      activePanierId: null,

      // --- Actions paniers ---

      createPanier: () => {
        const { paniers } = get();
        if (paniers.length >= MAX_PANIERS) return null;

        const id = Date.now();
        const newPanier: PanierVF = { id, articles: [], remise: 0 };
        set({
          paniers: [...paniers, newPanier],
          activePanierId: id
        });
        return id;
      },

      switchPanier: (id) => {
        const { paniers } = get();
        if (paniers.some(p => p.id === id)) {
          set({ activePanierId: id });
        }
      },

      closePanier: (id) => {
        const { paniers, activePanierId } = get();
        const remaining = paniers.filter(p => p.id !== id);

        let newActiveId: number | null = activePanierId;
        if (activePanierId === id) {
          // Activer le prochain panier disponible
          newActiveId = remaining.length > 0 ? remaining[0].id : null;
        }

        set({ paniers: remaining, activePanierId: newActiveId });
      },

      clearAll: () => {
        set({ paniers: [], activePanierId: null });
      },

      // --- Actions sur panier actif ---

      addArticle: (produit, quantity = 1, prixApplique?) => {
        let { paniers, activePanierId } = get();

        // Auto-créer un panier si aucun n'existe
        if (paniers.length === 0 || activePanierId === null) {
          const id = Date.now();
          const newPanier: PanierVF = { id, articles: [], remise: 0 };
          paniers = [...paniers, newPanier];
          activePanierId = id;
        }

        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => {
          const stockDisponible = produit.niveau_stock || 0;
          const existingIndex = panier.articles.findIndex(
            (a: ArticlePanier) => a.id_produit === produit.id_produit
          );

          if (existingIndex !== -1) {
            const newQuantity = panier.articles[existingIndex].quantity + quantity;
            if (newQuantity > stockDisponible) return panier;

            const updatedArticles = [...panier.articles];
            updatedArticles[existingIndex] = {
              ...updatedArticles[existingIndex],
              quantity: newQuantity,
              ...(prixApplique !== undefined && { prix_applique: prixApplique })
            };
            return { ...panier, articles: updatedArticles };
          } else {
            if (stockDisponible < quantity) return panier;

            const nouvelArticle: ArticlePanier = {
              ...produit,
              quantity,
              ...(prixApplique !== undefined && { prix_applique: prixApplique })
            };
            return { ...panier, articles: [...panier.articles, nouvelArticle] };
          }
        });

        set({ paniers: updatedPaniers, activePanierId });
      },

      removeArticle: (id_produit) => {
        const { paniers, activePanierId } = get();
        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => {
          const articles = panier.articles.filter(a => a.id_produit !== id_produit);
          if (articles.length === 0) {
            return { ...panier, articles: [], remise: 0 };
          }
          return { ...panier, articles };
        });
        set({ paniers: updatedPaniers });
      },

      updateQuantity: (id_produit, quantity) => {
        if (quantity <= 0) {
          get().removeArticle(id_produit);
          return;
        }

        const { paniers, activePanierId } = get();
        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => {
          const articles = panier.articles.map(article => {
            if (article.id_produit === id_produit) {
              const stockDisponible = article.niveau_stock || 0;
              if (quantity > stockDisponible) return article;
              return { ...article, quantity };
            }
            return article;
          });
          return { ...panier, articles };
        });
        set({ paniers: updatedPaniers });
      },

      updateRemise: (remise) => {
        const sousTotal = get().getSousTotal();
        if (remise > sousTotal || remise < 0) return;

        const { paniers, activePanierId } = get();
        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => ({
          ...panier, remise
        }));
        set({ paniers: updatedPaniers });
      },

      updateRemiseArticle: (id_produit, remise_val) => {
        const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const { paniers, activePanierId } = get();

        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => {
          const articles = panier.articles.map(article => {
            if (article.id_produit !== id_produit) return article;
            let clamped: number;
            if (remiseMode === '%') {
              clamped = Math.max(0, Math.min(100, remise_val));
            } else {
              const lineTotal = (article.prix_applique ?? article.prix_vente) * article.quantity;
              clamped = Math.max(0, Math.min(lineTotal, remise_val));
            }
            return { ...article, remise_article: clamped };
          });
          return { ...panier, articles };
        });
        set({ paniers: updatedPaniers });
      },

      clearRemisesArticles: () => {
        const { paniers, activePanierId } = get();
        const updatedPaniers = updateActivePanier(paniers, activePanierId, (panier) => ({
          ...panier,
          articles: panier.articles.map(a => ({ ...a, remise_article: 0 }))
        }));
        set({ paniers: updatedPaniers });
      },

      // --- Getters ---

      getActivePanier: () => {
        const { paniers, activePanierId } = get();
        if (activePanierId === null) return null;
        return paniers.find(p => p.id === activePanierId) || null;
      },

      getTotalItems: () => {
        const panier = get().getActivePanier();
        if (!panier) return 0;
        return panier.articles.reduce((total, article) => total + article.quantity, 0);
      },

      getSousTotal: () => {
        const panier = get().getActivePanier();
        if (!panier) return 0;
        return panier.articles.reduce(
          (total, article) => total + ((article.prix_applique ?? article.prix_vente) * article.quantity),
          0
        );
      },

      getMontantsFacture: (): MontantsFactureVF => {
        const panier = get().getActivePanier();
        if (!panier) return { sous_total: 0, remise: 0, montant_net: 0, acompte: 0, reste_a_payer: 0 };

        const sousTotal = get().getSousTotal();
        const remiseGlobale = panier.remise;

        const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const totalRemiseArticles = panier.articles.reduce((sum, article) => {
          const remiseArt = article.remise_article || 0;
          if (remiseArt === 0) return sum;
          if (remiseMode === '%') {
            const prix = article.prix_applique ?? article.prix_vente;
            return sum + Math.round(prix * article.quantity * remiseArt / 100);
          } else {
            return sum + remiseArt;
          }
        }, 0);

        const remise = totalRemiseArticles + remiseGlobale;
        const montantNet = sousTotal - remise;

        return {
          sous_total: sousTotal,
          remise,
          montant_net: montantNet,
          acompte: 0,
          reste_a_payer: montantNet
        };
      },

      getPanierCount: () => get().paniers.length
    }),
    {
      name: 'fayclick-paniers-vf',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        paniers: state.paniers,
        activePanierId: state.activePanierId
      })
    }
  )
);

export default usePanierVFMultiStore;
