/**
 * Hook pour gérer le modal de succès de facture
 * Utilise un store Zustand pour persister l'état entre les composants
 */

import { create } from 'zustand';

interface PreloadedArticle {
  nom_produit: string;
  quantite: number;
  prix: number;
  sous_total: number;
}

interface FactureSuccessStore {
  isOpen: boolean;
  factureId: number | null;
  /** Articles pré-chargés depuis le panier (évite un re-fetch DB) */
  preloadedArticles: PreloadedArticle[] | null;
  openModal: (factureId: number, articles?: Array<{ nom_produit: string; quantity: number; prix_vente: number; prix_applique?: number }>) => void;
  closeModal: () => void;
}

export const useFactureSuccessStore = create<FactureSuccessStore>((set) => ({
  isOpen: false,
  factureId: null,
  preloadedArticles: null,
  openModal: (factureId, articles) => {
    console.log('🎉 Ouverture modal facture succès, ID:', factureId, articles ? `(${articles.length} articles pré-chargés)` : '');
    const preloaded = articles?.map(a => {
      const prixEffectif = a.prix_applique ?? a.prix_vente;
      return {
        nom_produit: a.nom_produit,
        quantite: a.quantity,
        prix: prixEffectif,
        sous_total: prixEffectif * a.quantity
      };
    }) || null;
    set({ isOpen: true, factureId, preloadedArticles: preloaded });
  },
  closeModal: () => {
    console.log('❌ Fermeture modal facture succès');
    set({ isOpen: false, factureId: null, preloadedArticles: null });
  },
}));

export default useFactureSuccessStore;