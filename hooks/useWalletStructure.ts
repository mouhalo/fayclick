/**
 * Hook pour récupérer les données wallet d'une structure
 * Utilise get_wallet_structure() et get_soldes_wallet_structure()
 */

import { useState, useEffect, useCallback } from 'react';
import { walletService } from '@/services/wallet.service';
import type {
  WalletSoldes,
  WalletStructureData,
  WalletTransaction
} from '@/types/wallet.types';

interface UseWalletStructureReturn {
  // Soldes simplifiés
  soldes: WalletSoldes | null;
  // Données complètes
  walletData: WalletStructureData | null;
  // Transactions formatées pour le tableau
  transactions: WalletTransaction[];
  // Totaux calculés
  totaux: {
    totalRecus: number;
    totalRetraits: number;
    soldeNet: number;
  };
  // États
  isLoading: boolean;
  isLoadingSoldes: boolean;
  error: string | null;
  // Actions
  refresh: () => Promise<void>;
  refreshSoldes: () => Promise<void>;
}

export function useWalletStructure(idStructure: number): UseWalletStructureReturn {
  const [soldes, setSoldes] = useState<WalletSoldes | null>(null);
  const [walletData, setWalletData] = useState<WalletStructureData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totaux, setTotaux] = useState({ totalRecus: 0, totalRetraits: 0, soldeNet: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSoldes, setIsLoadingSoldes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger uniquement les soldes (rapide)
  const loadSoldes = useCallback(async () => {
    if (!idStructure || idStructure <= 0) return;

    setIsLoadingSoldes(true);
    try {
      const data = await walletService.getSoldesWallet(idStructure);
      setSoldes(data);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement soldes:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoadingSoldes(false);
    }
  }, [idStructure]);

  // Charger toutes les données wallet (historique complet)
  const loadWalletData = useCallback(async () => {
    if (!idStructure || idStructure <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await walletService.getWalletStructure(idStructure);

      if (data && data.success) {
        setWalletData(data);

        // Transformer en transactions
        const trans = walletService.transformToTransactions(
          data.historique.paiements_recus,
          data.historique.retraits_effectues
        );
        setTransactions(trans);

        // Calculer les totaux - utiliser global.total_net pour totalRecus
        const calculatedTotals = walletService.calculateTotals(
          data.historique.paiements_recus,
          data.historique.retraits_effectues
        );
        // Remplacer totalRecus par global.total_net (montant net après frais)
        setTotaux({
          totalRecus: data.soldes.global.total_net,
          totalRetraits: calculatedTotals.totalRetraits,
          soldeNet: data.soldes.global.total_net - calculatedTotals.totalRetraits
        });

        // Mettre à jour les soldes aussi
        setSoldes({
          solde_om: data.soldes.om.solde_disponible,
          solde_wave: data.soldes.wave.solde_disponible,
          solde_free: data.soldes.free.solde_disponible,
          solde_total: data.soldes.global.solde_disponible
        });

        setError(null);
      } else {
        setError('Données wallet non disponibles');
      }
    } catch (err) {
      console.error('Erreur chargement wallet:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [idStructure]);

  // Rafraîchir les soldes uniquement
  const refreshSoldes = useCallback(async () => {
    await loadSoldes();
  }, [loadSoldes]);

  // Rafraîchir toutes les données
  const refresh = useCallback(async () => {
    await loadWalletData();
  }, [loadWalletData]);

  // Charger les données au montage
  useEffect(() => {
    if (idStructure && idStructure > 0) {
      loadWalletData();
    }
  }, [idStructure, loadWalletData]);

  return {
    soldes,
    walletData,
    transactions,
    totaux,
    isLoading,
    isLoadingSoldes,
    error,
    refresh,
    refreshSoldes
  };
}

export default useWalletStructure;
