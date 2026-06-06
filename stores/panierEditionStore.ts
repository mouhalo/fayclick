/**
 * Store Zustand DÉDIÉ à la modification d'une vente payée du jour.
 *
 * ⚠️ ISOLATION TOTALE (PRD §7.3 — exigence bloquante) :
 * Ce store est volontairement SÉPARÉ de `panierStore` ('fayclick-panier') et de
 * `panierVFMultiStore` ('fayclick-paniers-vf'). Ouvrir une édition ne touche JAMAIS
 * le panier de vente en cours du caissier → aucune perte de données en caisse.
 *
 * ⚠️ NON PERSISTÉ (décision lead) : l'édition est une session courte. Aucun
 * localStorage pour éviter tout résidu / état périmé entre deux sessions.
 *
 * ⚠️ VALIDATION STOCK PAR DELTA :
 * La vente d'origine a déjà décrémenté le stock à sa création. En édition, un ajout
 * est autorisé si `delta_ajout ≤ niveau_stock courant`, JAMAIS sur la quantité absolue.
 * Le retrait (delta négatif) est toujours autorisé. C'est pourquoi on ne réutilise
 * pas `panierStore.addArticle` (qui bloque sur la quantité absolue).
 */

import { create } from 'zustand';
import { Produit } from '@/types/produit';
import { ArticleEdition } from '@/lib/edition-vente-helpers';

// Montants calculés d'une édition (acompte/reste non pertinents en édition payée).
export interface MontantsFactureEdition {
  sous_total: number;
  remise: number;
  montant_net: number;
}

export type OrigineVente = 'PRODUITS' | 'VENTEFLASH';

interface PanierEditionState {
  // Contexte de l'édition en cours
  editFactureId: number | null;
  numFacture: string | null;
  origine: OrigineVente;

  // Articles éditables (jeu séparé, enrichis quantiteOrigine + stockInconnu)
  articles: ArticleEdition[];
  // Remise globale (FCFA)
  remise: number;
  // Net d'origine (avant modification) pour calcul de l'écart prévisionnel
  netOrigine: number;

  // --- Cycle de vie ---
  startEdition: (params: {
    idFacture: number;
    numFacture: string;
    origine: OrigineVente;
    articles: ArticleEdition[];
    remiseOrigine: number;
  }) => void;
  clearEdition: () => void;

  // --- Actions articles (validation delta) ---
  /**
   * Augmente la quantité d'une ligne existante de `increment` (défaut 1).
   * Bloqué si stock inconnu ou si l'augmentation dépasse le stock disponible.
   * @returns true si appliqué, false si bloqué (stock insuffisant / inconnu)
   */
  incrementQuantity: (id_produit: number, increment?: number) => boolean;
  /**
   * Définit la quantité absolue d'une ligne. Bloqué si l'augmentation nette
   * (vs quantité courante) dépasse le stock disponible. Le retrait est libre.
   * @returns true si appliqué, false si bloqué
   */
  setQuantity: (id_produit: number, quantity: number) => boolean;
  /** Retire totalement une ligne (toujours autorisé) */
  removeArticle: (id_produit: number) => void;
  /**
   * Ajoute un nouvel article à l'édition (produit non présent dans la facture).
   * Validation : quantité ≤ stock disponible (article entièrement nouveau).
   * @returns true si ajouté, false si stock insuffisant
   */
  addNewArticle: (produit: Produit, quantity?: number) => boolean;
  updateRemise: (remise: number) => void;

  // --- Getters ---
  getTotalItems: () => number;
  getSousTotal: () => number;
  getMontantsFacture: () => MontantsFactureEdition;
  /** Écart prévisionnel : net courant - net d'origine (>0 complément, <0 remboursement) */
  getEcartPrevisionnel: () => number;
}

const initialState = {
  editFactureId: null as number | null,
  numFacture: null as string | null,
  origine: 'PRODUITS' as OrigineVente,
  articles: [] as ArticleEdition[],
  remise: 0,
  netOrigine: 0,
};

export const usePanierEditionStore = create<PanierEditionState>()((set, get) => ({
  ...initialState,

  startEdition: ({ idFacture, numFacture, origine, articles, remiseOrigine }) => {
    const netOrigine =
      articles.reduce(
        (total, a) => total + (a.prix_applique ?? a.prix_vente) * a.quantity,
        0
      ) - remiseOrigine;

    set({
      editFactureId: idFacture,
      numFacture,
      origine,
      articles: articles.map((a) => ({ ...a })),
      remise: remiseOrigine,
      netOrigine,
    });
  },

  clearEdition: () => {
    set({ ...initialState });
  },

  incrementQuantity: (id_produit, increment = 1) => {
    return get().setQuantity(
      id_produit,
      (get().articles.find((a) => a.id_produit === id_produit)?.quantity ?? 0) +
        increment
    );
  },

  setQuantity: (id_produit, quantity) => {
    const article = get().articles.find((a) => a.id_produit === id_produit);
    if (!article) return false;

    // Retrait total
    if (quantity <= 0) {
      get().removeArticle(id_produit);
      return true;
    }

    const deltaVsCourant = quantity - article.quantity;

    // Augmentation : valider le delta contre le stock disponible courant.
    if (deltaVsCourant > 0) {
      // Stock inconnu (produit absent du store) → fallback conservateur : interdit.
      if (article.stockInconnu) return false;
      const stockDisponible = article.niveau_stock ?? 0;
      if (deltaVsCourant > stockDisponible) return false;
    }

    // Décrémenter le stock disponible local du delta appliqué (cohérence si on
    // augmente à nouveau ensuite : on ne peut pas réutiliser le même stock).
    const nouveauStock =
      article.stockInconnu || article.niveau_stock === undefined
        ? article.niveau_stock
        : Math.max(0, (article.niveau_stock ?? 0) - deltaVsCourant);

    set({
      articles: get().articles.map((a) =>
        a.id_produit === id_produit
          ? { ...a, quantity, niveau_stock: nouveauStock }
          : a
      ),
    });
    return true;
  },

  removeArticle: (id_produit) => {
    const article = get().articles.find((a) => a.id_produit === id_produit);
    if (!article) return;

    // Restituer le stock local consommé par cette ligne au-delà de l'origine
    // (utile si on ré-ajoute le produit ensuite). On reste prudent si stock inconnu.
    set({
      articles: get().articles.filter((a) => a.id_produit !== id_produit),
    });
  },

  addNewArticle: (produit, quantity = 1) => {
    const existing = get().articles.find(
      (a) => a.id_produit === produit.id_produit
    );

    // Produit déjà présent → délègue à l'augmentation de quantité (validation delta).
    if (existing) {
      return get().incrementQuantity(produit.id_produit, quantity);
    }

    // Article entièrement nouveau : aucune quantité d'origine, valider qty ≤ stock.
    const stockDisponible = produit.niveau_stock ?? 0;
    if (quantity > stockDisponible) return false;

    const nouvelArticle: ArticleEdition = {
      ...produit,
      quantity,
      quantiteOrigine: 0,
      prix_applique: produit.prix_vente,
      remise_article: 0,
      stockInconnu: false,
      // Décrémenter le stock local de la quantité ajoutée.
      niveau_stock: Math.max(0, stockDisponible - quantity),
    };

    set({ articles: [...get().articles, nouvelArticle] });
    return true;
  },

  updateRemise: (remise) => {
    const sousTotal = get().getSousTotal();
    if (remise < 0) return;
    if (remise > sousTotal) return; // remise > sous-total interdite
    set({ remise });
  },

  getTotalItems: () =>
    get().articles.reduce((total, a) => total + a.quantity, 0),

  getSousTotal: () =>
    get().articles.reduce(
      (total, a) => total + (a.prix_applique ?? a.prix_vente) * a.quantity,
      0
    ),

  getMontantsFacture: (): MontantsFactureEdition => {
    const sousTotal = get().getSousTotal();
    const remise = get().remise;
    const montantNet = sousTotal - remise;
    return {
      sous_total: sousTotal,
      remise,
      montant_net: montantNet,
    };
  },

  getEcartPrevisionnel: () => {
    const montants = get().getMontantsFacture();
    return montants.montant_net - get().netOrigine;
  },
}));

export default usePanierEditionStore;
