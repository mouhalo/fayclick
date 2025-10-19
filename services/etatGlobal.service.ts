/**
 * Service pour gérer l'État Global Financier (Coffre-Fort)
 * Fonction PostgreSQL: get_etat_global(pid_structure, pannee)
 */

import databaseService from './database.service';
import type { EtatGlobalData } from '@/types/etatGlobal.types';

class EtatGlobalService {
  private static instance: EtatGlobalService;

  private constructor() {
    // databaseService est déjà un singleton importé directement
  }

  public static getInstance(): EtatGlobalService {
    if (!EtatGlobalService.instance) {
      EtatGlobalService.instance = new EtatGlobalService();
    }
    return EtatGlobalService.instance;
  }

  /**
   * Récupère l'état global financier d'une structure pour une année donnée
   * @param structureId - ID de la structure
   * @param annee - Année (par défaut: année en cours)
   * @returns Données financières complètes
   */
  async getEtatGlobal(structureId: number, annee?: number): Promise<EtatGlobalData> {
    try {
      const anneeActuelle = annee || new Date().getFullYear();

      const requeteSql = `SELECT * FROM get_etat_global(${structureId}, ${anneeActuelle})`;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée financière trouvée');
      }

      return this.extractEtatGlobalData(result[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état global:', error);
      throw error;
    }
  }

  /**
   * Extrait et structure les données de l'état global
   */
  private extractEtatGlobalData(rawData: any): EtatGlobalData {
    const data = rawData.get_etat_global || rawData;

    return {
      success: true,
      structure_id: data.structure_id || 0,
      annee: data.annee || new Date().getFullYear(),
      ca_total: parseFloat(data.ca_total || 0),
      nb_ventes: parseInt(data.nb_ventes || 0, 10),
      total_charges: parseFloat(data.total_charges || 0),
      cout_achats: parseFloat(data.cout_achats || 0),
      total_charges_achats: parseFloat(data.total_charges_achats || 0),
      solde_net: parseFloat(data.solde_net || 0),
      marge_brute: parseFloat(data.marge_brute || 0),
      taux_marge: parseFloat(data.taux_marge || 0),
      details: {
        ventes: {
          chiffre_affaires: parseFloat(data.details?.ventes?.chiffre_affaires || data.ca_total || 0),
          nombre_factures: parseInt(data.details?.ventes?.nombre_factures || data.nb_ventes || 0, 10),
          panier_moyen: parseFloat(data.details?.ventes?.panier_moyen || 0)
        },
        couts: {
          cout_achats_marchandises: parseFloat(data.details?.couts?.cout_achats_marchandises || data.cout_achats || 0),
          charges_exploitation: parseFloat(data.details?.couts?.charges_exploitation || data.total_charges || 0),
          total_couts: parseFloat(data.details?.couts?.total_couts || data.total_charges_achats || 0)
        },
        rentabilite: {
          marge_brute: parseFloat(data.details?.rentabilite?.marge_brute || data.marge_brute || 0),
          resultat_net: parseFloat(data.details?.rentabilite?.resultat_net || data.solde_net || 0),
          taux_marge_nette: parseFloat(data.details?.rentabilite?.taux_marge_nette || data.taux_marge || 0),
          taux_marge_brute: parseFloat(data.details?.rentabilite?.taux_marge_brute || 0)
        }
      },
      evolution_mensuelle: data.evolution_mensuelle || [],
      top_produits_vendus: data.top_produits_vendus || []
    };
  }
}

export default EtatGlobalService;
