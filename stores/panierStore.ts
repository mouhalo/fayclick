/**
 * Store Zustand pour la gestion du panier
 * Persistence localStorage + gestion temps réel
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ArticlePanier } from '@/types/produit';

// Interface pour les informations client
export interface InfosClient {
  id_client?: number; // 🆕 ID du client si existant (pour éviter les doublons en DB)
  nom_client_payeur?: string;
  tel_client?: string;
  description?: string;
}

// Interface pour les montants de facturation
export interface MontantsFacture {
  sous_total: number;
  remise: number;
  montant_net: number;
  acompte: number;
  reste_a_payer: number;
}

interface PanierStore {
  // État du panier
  articles: ArticlePanier[];
  infosClient: InfosClient;
  remise: number;
  acompte: number;
  
  // Actions articles
  addArticle: (produit: any, quantity?: number, prixApplique?: number) => void;
  removeArticle: (id_produit: number) => void;
  updateQuantity: (id_produit: number, quantity: number) => void;
  clearPanier: () => void;
  
  // Actions client et montants
  updateInfosClient: (infos: InfosClient) => void;
  updateRemise: (remise: number) => void;
  updateAcompte: (acompte: number) => void;
  updateRemiseArticle: (id_produit: number, remise_val: number) => void;
  clearRemisesArticles: () => void;
  
  // Getters calculés
  getTotalItems: () => number;
  getSousTotal: () => number;
  getMontantsFacture: () => MontantsFacture;
  
  // État UI
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export const usePanierStore = create<PanierStore>()(
  persist(
    (set, get) => ({
      // État initial
      articles: [],
      infosClient: {
        id_client: undefined, // Aucun client sélectionné par défaut
        nom_client_payeur: 'CLIENT_ANONYME',
        tel_client: '771234567'
      },
      remise: 0,
      acompte: 0,
      isModalOpen: false,

      // Actions articles
      addArticle: (produit, quantity = 1, prixApplique?) => {
        const articles = get().articles;
        const stockDisponible = produit.niveau_stock || 0;
        const existingIndex = articles.findIndex(a => a.id_produit === produit.id_produit);

        if (existingIndex !== -1) {
          // Produit déjà dans le panier - augmenter quantité
          const newQuantity = articles[existingIndex].quantity + quantity;

          // Vérifier stock disponible
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

        // Si le panier devient vide, réinitialiser aussi le client
        if (articles.length === 0) {
          set({
            articles: [],
            infosClient: {
              id_client: undefined,
              nom_client_payeur: 'CLIENT_ANONYME',
              tel_client: '771234567'
            },
            remise: 0,
            acompte: 0
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
            // Vérifier stock disponible
            const stockDisponible = article.niveau_stock || 0;
            if (quantity > stockDisponible) {
              return article; // Garder l'ancienne quantité
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
            id_client: undefined, // 🆕 Réinitialiser l'ID client
            nom_client_payeur: 'CLIENT_ANONYME',
            tel_client: '771234567'
          },
          remise: 0,
          acompte: 0,
          isModalOpen: false
        });
      },

      // Actions client et montants
      updateInfosClient: (infos) => {
        set({ infosClient: { ...get().infosClient, ...infos } });
      },

      updateRemise: (remise) => {
        const sousTotal = get().getSousTotal();
        if (remise > sousTotal) return; // Remise trop élevée
        if (remise < 0) return; // Remise négative
        set({ remise });
      },

      updateAcompte: (acompte) => {
        const montants = get().getMontantsFacture();
        if (acompte > montants.montant_net) return; // Acompte trop élevé
        if (acompte < 0) return; // Acompte négatif
        set({ acompte });
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

      // Getters calculés
      getTotalItems: () => {
        return get().articles.reduce((total, article) => total + article.quantity, 0);
      },

      getSousTotal: () => {
        return get().articles.reduce((total, article) => total + ((article.prix_applique ?? article.prix_vente) * article.quantity), 0);
      },

      getMontantsFacture: (): MontantsFacture => {
        const sousTotal = get().getSousTotal();
        const remiseGlobale = get().remise;
        const acompte = get().acompte;

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
        const resteAPayer = montantNet - acompte;

        return {
          sous_total: sousTotal,
          remise,
          montant_net: montantNet,
          acompte,
          reste_a_payer: resteAPayer
        };
      },

      // État UI
      setModalOpen: (open) => {
        set({ isModalOpen: open });
      }
    }),
    {
      name: 'fayclick-panier',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        articles: state.articles,
        infosClient: state.infosClient,
        remise: state.remise,
        acompte: state.acompte
      })
    }
  )
);

export default usePanierStore;