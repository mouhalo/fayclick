/**
 * Hook pour gérer le modal de succès de facture
 * Utilise un store Zustand pour persister l'état entre les composants
 */

import { create } from 'zustand';

interface FactureSuccessStore {
  isOpen: boolean;
  factureId: number | null;
  openModal: (factureId: number) => void;
  closeModal: () => void;
}

export const useFactureSuccessStore = create<FactureSuccessStore>((set) => ({
  isOpen: false,
  factureId: null,
  openModal: (factureId) => {
    console.log('🎉 Ouverture modal facture succès, ID:', factureId);
    set({ isOpen: true, factureId });
  },
  closeModal: () => {
    console.log('❌ Fermeture modal facture succès');
    set({ isOpen: false, factureId: null });
  },
}));

export default useFactureSuccessStore;