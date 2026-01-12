/**
 * Service pour la gestion des Wallets (OM, WAVE, FREE)
 * Utilise les fonctions PostgreSQL get_wallet_structure() et get_soldes_wallet_structure()
 */

import database from '@/services/database.service';
import type {
  WalletSoldes,
  WalletStructureData,
  WalletTransaction,
  PaiementRecu,
  RetraitEffectue
} from '@/types/wallet.types';

class WalletService {
  /**
   * Récupère les soldes simplifiés des wallets
   * Utilise get_soldes_wallet_structure()
   */
  async getSoldesWallet(idStructure: number): Promise<WalletSoldes> {
    try {
      const query = `SELECT * FROM get_soldes_wallet_structure(${idStructure});`;
      console.log('💰 [WALLET] Récupération soldes wallet:', { idStructure, query });

      const results = await database.query(query);

      if (results && results.length > 0) {
        const data = results[0].get_soldes_wallet_structure || results[0];
        // Parser si c'est une chaîne JSON
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('💰 [WALLET] Soldes reçus:', parsed);
        return parsed;
      }

      console.warn('💰 [WALLET] Aucun solde retourné');
      return {
        solde_om: 0,
        solde_wave: 0,
        solde_free: 0,
        solde_total: 0
      };
    } catch (error) {
      console.error('❌ [WALLET] Erreur getSoldesWallet:', error);
      return {
        solde_om: 0,
        solde_wave: 0,
        solde_free: 0,
        solde_total: 0
      };
    }
  }

  /**
   * Récupère l'historique complet des wallets
   * Utilise get_wallet_structure()
   */
  async getWalletStructure(idStructure: number): Promise<WalletStructureData | null> {
    try {
      const query = `SELECT * FROM get_wallet_structure(${idStructure});`;
      console.log('📊 [WALLET] Récupération historique wallet:', { idStructure, query });

      const results = await database.query(query);

      if (results && results.length > 0) {
        const data = results[0].get_wallet_structure || results[0];
        // Parser si c'est une chaîne JSON
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('📊 [WALLET] Données wallet reçues:', {
          success: parsed.success,
          nbPaiements: parsed.historique?.paiements_recus?.length || 0,
          nbRetraits: parsed.historique?.retraits_effectues?.length || 0
        });
        return parsed;
      }

      console.warn('📊 [WALLET] Aucune donnée wallet retournée');
      return null;
    } catch (error) {
      console.error('❌ [WALLET] Erreur getWalletStructure:', error);
      return null;
    }
  }

  /**
   * Transforme les paiements reçus et retraits en transactions unifiées
   * pour affichage dans le tableau
   */
  transformToTransactions(
    paiementsRecus: PaiementRecu[],
    retraitsEffectues: RetraitEffectue[]
  ): WalletTransaction[] {
    const transactions: WalletTransaction[] = [];

    // Transformer les paiements reçus (ENTREE)
    if (Array.isArray(paiementsRecus)) {
      paiementsRecus.forEach((p) => {
        transactions.push({
          id: p.id_recu,
          date: p.date_paiement,
          telephone: p.telephone,
          sens: 'ENTREE',
          montant: p.montant_net,
          wallet: p.wallet,
          reference: p.reference,
          type: 'ENCAISSEMENT'
        });
      });
    }

    // Transformer les retraits (SORTIE) - utiliser montant_initial
    if (Array.isArray(retraitsEffectues)) {
      retraitsEffectues.forEach((r) => {
        transactions.push({
          id: r.id_versement,
          date: r.date_retrait,
          telephone: r.compte_destination,
          sens: 'SORTIE',
          montant: r.montant_initial, // Utiliser montant_initial au lieu de montant
          wallet: r.wallet,
          reference: r.reference,
          type: 'RETRAIT'
        });
      });
    }

    // Trier par date décroissante
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
  }

  /**
   * Calcule les totaux des transactions
   * Note: totalRecus sera remplacé par global.total_net dans le hook
   */
  calculateTotals(paiementsRecus: PaiementRecu[], retraitsEffectues: RetraitEffectue[]) {
    const totalRecus = Array.isArray(paiementsRecus)
      ? paiementsRecus.reduce((sum, p) => sum + (p.montant_recu || 0), 0)
      : 0;
    // Utiliser montant_initial pour les retraits
    const totalRetraits = Array.isArray(retraitsEffectues)
      ? retraitsEffectues.reduce((sum, r) => sum + (r.montant_initial || 0), 0)
      : 0;

    return {
      totalRecus,
      totalRetraits,
      soldeNet: totalRecus - totalRetraits
    };
  }
}

export const walletService = new WalletService();
export default walletService;
