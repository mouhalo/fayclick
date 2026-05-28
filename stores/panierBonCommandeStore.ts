/**
 * Store Zustand pour la gestion du panier Bon de Commande
 *
 * Source de verite : docs/dba/bon-commande-spec.md (v1.0)
 * Pattern : calque sur panierProformaStore avec 3 differences cle :
 *   1. prix_applique = cout_revient (pas prix_vente). Fallback prix_vente si cout_revient=0.
 *   2. Fournisseur (pas client). Pas de telephone obligatoire.
 *   3. Pas d'acompte / pas de reste_a_payer (un BC est un engagement, pas un paiement).
 *
 * Persistence localStorage : 'fayclick-panier-bon-commande'
 * Independant des stores panierStore et panierProformaStore.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ArticlePanier, Produit } from '@/types/produit';

// =============================================================================
// TYPES STORE
// =============================================================================

/**
 * Informations fournisseur pour un BC.
 * id_fournisseur obligatoire pour creer un BC (verifie cote service).
 */
export interface InfosFournisseur {
  id_fournisseur?: number;
  nom_fournisseur?: string;
  tel_fournisseur?: string;
  description?: string;
  date_bon_commande?: string;   // ISO date "YYYY-MM-DD"
}

/**
 * Montants calcules pour un BC (sans acompte/reste).
 */
export interface MontantsBonCommande {
  sous_total: number;
  remise: number;
  montant_net: number;
}

interface PanierBonCommandeStore {
  // Etat
  articles: ArticlePanier[];
  infosFournisseur: InfosFournisseur;
  remise: number;

  // Actions articles
  addArticle: (produit: Produit, quantity?: number) => void;
  removeArticle: (id_produit: number) => void;
  updateQuantity: (id_produit: number, quantity: number) => void;
  updatePrixArticle: (id_produit: number, prix: number) => void;
  clearPanier: () => void;

  // Actions fournisseur / montants
  updateInfosFournisseur: (infos: InfosFournisseur) => void;
  updateRemise: (remise: number) => void;
  updateRemiseArticle: (id_produit: number, remise_val: number) => void;
  clearRemisesArticles: () => void;

  // Getters calcules
  getTotalItems: () => number;
  getSousTotal: () => number;
  getMontantsBonCommande: () => MontantsBonCommande;

  /**
   * Liste les articles dont le cout_revient est = 0 (warning UI).
   * Ces articles utilisent prix_vente en fallback — non recommande pour un BC.
   * La Phase 5 (UI) doit afficher un badge warning sur ces lignes.
   */
  getArticlesAvecCoutManquant: () => ArticlePanier[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resout le prix unitaire applicable a un produit dans un BC.
 * - Si cout_revient > 0 : utiliser cout_revient (correct)
 * - Si cout_revient = 0 : fallback prix_vente (la UI doit afficher un warning)
 *
 * Cette resolution est appliquee a l'ajout au panier — le service consomme
 * ensuite article.prix_applique sans re-resolution.
 */
function resolvePrixBC(produit: Pick<Produit, 'cout_revient' | 'prix_vente'>): number {
  if (produit.cout_revient && produit.cout_revient > 0) return produit.cout_revient;
  return produit.prix_vente ?? 0;
}

// =============================================================================
// STORE
// =============================================================================

export const usePanierBonCommandeStore = create<PanierBonCommandeStore>()(
  persist(
    (set, get) => ({
      // Etat initial
      articles: [],
      infosFournisseur: {
        id_fournisseur: undefined,
        nom_fournisseur: '',
        tel_fournisseur: '',
        description: '',
      },
      remise: 0,

      // ======================================================================
      // ACTIONS ARTICLES
      // ======================================================================

      addArticle: (produit, quantity = 1) => {
        const articles = get().articles;
        const stockDisponible = produit.niveau_stock ?? Infinity; // BC : pas de check stock strict (on commande pour reapprovisionner)
        const existingIndex = articles.findIndex((a) => a.id_produit === produit.id_produit);

        const prixBC = resolvePrixBC(produit);

        if (existingIndex !== -1) {
          // Deja present — incrementer quantite
          const newQuantity = articles[existingIndex].quantity + quantity;

          // Note : pour un BC, on autorise des quantites > stock car on commande
          // pour reapprovisionner. Pas de blocage stock ici.
          const updatedArticles = [...articles];
          updatedArticles[existingIndex] = {
            ...updatedArticles[existingIndex],
            quantity: newQuantity,
          };
          set({ articles: updatedArticles });
        } else {
          // Nouveau produit
          const nouvelArticle: ArticlePanier = {
            ...produit,
            quantity,
            prix_applique: prixBC,
          };
          set({ articles: [...articles, nouvelArticle] });
        }

        // stockDisponible utilise uniquement pour info future — pas de blocage en mode BC
        void stockDisponible;
      },

      removeArticle: (id_produit) => {
        const articles = get().articles.filter((a) => a.id_produit !== id_produit);
        if (articles.length === 0) {
          // Panier vide -> reset complet (fournisseur + remise)
          set({
            articles: [],
            infosFournisseur: {
              id_fournisseur: undefined,
              nom_fournisseur: '',
              tel_fournisseur: '',
              description: '',
            },
            remise: 0,
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
        const articles = get().articles.map((article) =>
          article.id_produit === id_produit ? { ...article, quantity } : article
        );
        set({ articles });
      },

      /**
       * Permet a la UI Phase 5 (ModalCreerBonCommande) d'editer le prix unitaire
       * d'un article (utile quand cout_revient est faux ou absent).
       */
      updatePrixArticle: (id_produit, prix) => {
        if (prix < 0) return;
        const articles = get().articles.map((article) =>
          article.id_produit === id_produit ? { ...article, prix_applique: prix } : article
        );
        set({ articles });
      },

      clearPanier: () => {
        set({
          articles: [],
          infosFournisseur: {
            id_fournisseur: undefined,
            nom_fournisseur: '',
            tel_fournisseur: '',
            description: '',
          },
          remise: 0,
        });
      },

      // ======================================================================
      // ACTIONS FOURNISSEUR / MONTANTS
      // ======================================================================

      updateInfosFournisseur: (infos) => {
        set({ infosFournisseur: { ...get().infosFournisseur, ...infos } });
      },

      updateRemise: (remise) => {
        if (remise < 0) return;
        const sousTotal = get().getSousTotal();
        if (remise > sousTotal) return;
        set({ remise });
      },

      updateRemiseArticle: (id_produit, remise_val) => {
        const remiseMode =
          (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const articles = get().articles.map((article) => {
          if (article.id_produit !== id_produit) return article;
          let clamped: number;
          if (remiseMode === '%') {
            clamped = Math.max(0, Math.min(100, remise_val));
          } else {
            const prix = article.prix_applique ?? article.prix_vente;
            const lineTotal = prix * article.quantity;
            clamped = Math.max(0, Math.min(lineTotal, remise_val));
          }
          return { ...article, remise_article: clamped };
        });
        set({ articles });
      },

      clearRemisesArticles: () => {
        const articles = get().articles.map((a) => ({ ...a, remise_article: 0 }));
        set({ articles });
      },

      // ======================================================================
      // GETTERS CALCULES
      // ======================================================================

      getTotalItems: () => {
        return get().articles.reduce((total, a) => total + a.quantity, 0);
      },

      getSousTotal: () => {
        return get().articles.reduce((total, a) => {
          const prix = a.prix_applique ?? a.prix_vente ?? 0;
          return total + prix * a.quantity;
        }, 0);
      },

      getMontantsBonCommande: (): MontantsBonCommande => {
        const sousTotal = get().getSousTotal();
        const remiseGlobale = get().remise;

        // Remises par article (mode % ou F selon localStorage — coherent avec proforma)
        const remiseMode =
          (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
        const totalRemiseArticles = get().articles.reduce((sum, article) => {
          const remiseArt = article.remise_article ?? 0;
          if (remiseArt === 0) return sum;
          if (remiseMode === '%') {
            const prix = article.prix_applique ?? article.prix_vente ?? 0;
            return sum + Math.round((prix * article.quantity * remiseArt) / 100);
          }
          return sum + remiseArt;
        }, 0);

        const remise = totalRemiseArticles + remiseGlobale;
        const montantNet = Math.max(0, sousTotal - remise);

        return {
          sous_total: sousTotal,
          remise,
          montant_net: montantNet,
        };
      },

      getArticlesAvecCoutManquant: () => {
        return get().articles.filter((a) => !a.cout_revient || a.cout_revient <= 0);
      },
    }),
    {
      name: 'fayclick-panier-bon-commande',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        articles: state.articles,
        infosFournisseur: state.infosFournisseur,
        remise: state.remise,
      }),
    }
  )
);

export default usePanierBonCommandeStore;
