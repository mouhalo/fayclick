/**
 * Store Zustand pour la gestion du panier Proforma
 * Persistence localStorage separee + gestion temps reel
 * Client obligatoire (pas de CLIENT_ANONYME)
 * Pas d'acompte (les proformas n'ont pas d'acompte)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ArticlePanier } from '@/types/produit';

// Interface pour les informations client (client obligatoire pour proforma)
export interface InfosClientProforma {
  id_client?: number;
  nom_client_payeur?: string;
  tel_client?: string;
  description?: string;
}

// Interface pour les montants de proforma (sans acompte/reste_a_payer)
export interface MontantsProforma {
  sous_total: number;
  remise: number;
  montant_net: number;
}

interface PanierProformaStore {
  // Etat du panier
  articles: ArticlePanier[];
  infosClient: InfosClientProforma;
  remise: number;

  // Actions articles
  addArticle: (produit: any, quantity?: number, prixApplique?: number) => void;
  removeArticle: (id_produit: number) => void;
  updateQuantity: (id_produit: number, quantity: number) => void;
  clearPanier: () => void;

  // Actions client et montants
  updateInfosClient: (infos: InfosClientProforma) => void;
  updateRemise: (remise: number) => void;
  updateRemiseArticle: (id_produit: number, remise_val: number) => void;
  clearRemisesArticles: () => void;

  // Getters calcules
  getTotalItems: () => number;
  getSousTotal: () => number;
  getMontantsProforma: () => MontantsProforma;
}

export const usePanierProformaStore = create<PanierProformaStore>()(
  persist(
    (set, get) => ({
      // Etat initial — client vide (obligatoire pour proforma)
      articles: [],
      infosClient: {
        id_client: undefined,
        nom_client_payeur: '',
        tel_client: ''
      },
      remise: 0,

      // Actions articles
      addArticle: (produit, quantity = 1, prixApplique?) => {
        const articles = get().articles;
        const stockDisponible = produit.niveau_stock || 0;
        const existingIndex = articles.findIndex(a => a.id_produit === produit.id_produit);

        if (existingIndex !== -1) {
          // Produit deja dans le panier - augmenter quantite
          const newQuantity = articles[existingIndex].quantity + quantity;

          // Verifier stock disponible
          if (newQuantity > stockDisponible) {
            return; // Stock insuffisant
          }

          const updatedArticles = [...articles];
          updatedArticles[existingIndex] = {
            ...updatedArticles[existingIndex],
            quantity: newQuantity,
            ...(prixApplique !== undefined && { prix_applique: prixApplique })
          };

          set({ articles: updatedArticles });
        } else {
          // Nouveau produit
          if (stockDisponible < quantity) {
            return; // Stock insuffisant
          }

          const nouvelArticle: ArticlePanier = {
            ...produit,
            quantity,
            ...(prixApplique !== undefined && { prix_applique: prixApplique })
          };

          set({ articles: [...articles, nouvelArticle] });
        }
      },

      removeArticle: (id_produit) => {
        const articles = get().articles.filter(a => a.id_produit !== id_produit);

        // Si le panier devient vide, reinitialiser aussi le client
        if (articles.length === 0) {
          set({
            articles: [],
            infosClient: {
              id_client: undefined,
              nom_client_payeur: '',
              tel_client: ''
            },
            remise: 0
          });
        } else {
          set({ articles });
        }
      },

      updateQuantity: (id_produit, quantity) => {
        if (quantity <= 0) {
          get().removeArticle(id_produit);
          return;
        }

        const articles = get().articles;
        const updatedArticles = articles.map(article => {
          if (article.id_produit === id_produit) {
            // Verifier stock disponible
            const stockDisponible = article.niveau_stock || 0;
            if (quantity > stockDisponible) {
              return article; // Garder l'ancienne quantite
            }

            return {
              ...article,
              quantity
            };
          }
          return article;
        });

        set({ articles: updatedArticles });
      },

      clearPanier: () => {
        set({
          articles: [],
          infosClient: {
            id_client: undefined,
            nom_client_payeur: '',
            tel_client: ''
          },
          remise: 0
        });
      },

      // Actions client et montants
      updateInfosClient: (infos) => {
        set({ infosClient: { ...get().infosClient, ...infos } });
      },

      updateRemise: (remise) => {
        const sousTotal = get().getSousTotal();
        if (remise > sousTotal) return; // Remise trop elevee
        if (remise < 0) return; // Remise negative
        set({ remise });
      },

      updateRemiseArticle: (id_produit, remise_val) => {
        const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const articles = get().articles.map(article => {
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
        set({ articles });
      },

      clearRemisesArticles: () => {
        const articles = get().articles.map(a => ({ ...a, remise_article: 0 }));
        set({ articles });
      },

      // Getters calcules
      getTotalItems: () => {
        return get().articles.reduce((total, article) => total + article.quantity, 0);
      },

      getSousTotal: () => {
        return get().articles.reduce((total, article) => total + ((article.prix_applique ?? article.prix_vente) * article.quantity), 0);
      },

      getMontantsProforma: (): MontantsProforma => {
        const sousTotal = get().getSousTotal();
        const remiseGlobale = get().remise;

        // Calcul remises par article (mode % ou F selon localStorage)
        const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const totalRemiseArticles = get().articles.reduce((sum, article) => {
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
          montant_net: montantNet
        };
      }
    }),
    {
      name: 'fayclick-panier-proforma',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        articles: state.articles,
        infosClient: state.infosClient,
        remise: state.remise
      })
    }
  )
);

export default usePanierProformaStore;
