/**
 * Service pour la gestion des factures privées des commerçants
 * API: rechercher_multifacturecom au format XML
 */

import { FacturePriveeData, PaiementHistorique } from '@/types/facture-privee';
import { authService } from './auth.service';
import DatabaseService from './database.service';

export interface SupprimerFactureResponse {
  success: boolean;
  message: string;
  id_facture: number;
  details?: unknown;
}

class FacturePriveeService {
  private authService = authService;

  /**
   * Récupère les détails d'une facture privée pour un commerçant
   */
  async getFacturePrivee(idFacture: number, numFacture?: string): Promise<FacturePriveeData> {
    try {
      const numFactureParam = numFacture || '';
      const requete = `SELECT * FROM public.rechercher_multifacturecom('${numFactureParam}', ${idFacture})`;

      console.log('🔍 Appel API facture privée:', { idFacture, numFacture: numFactureParam });

      const rows = await DatabaseService.query(requete);

      if (!rows || rows.length === 0) {
        throw new Error('Facture introuvable');
      }

      const jsonData = rows[0];
      const parsedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      console.log('📦 Données parsées:', parsedData);

      // La fonction retourne un objet avec le nom de la fonction comme clé
      const functionResult = parsedData.rechercher_multifacturecom1 || parsedData.rechercher_multifacturecom || parsedData;

      if (!functionResult || !functionResult.factures || functionResult.factures.length === 0) {
        throw new Error('Aucune facture trouvée dans la réponse');
      }

      // Extraire la facture (format de rechercher_multifacturecom: { factures: [{...}] })
      const factureData = functionResult.factures[0];

      // Transformation pour correspondre au format attendu
      return {
        id_facture: factureData.id_facture,
        num_facture: factureData.num_facture,
        id_structure: factureData.id_structure,
        nom_structure: factureData.nom_structure,
        date_facture: factureData.date_facture,
        nannee: factureData.nannee,
        nmois: factureData.nmois,
        description: factureData.description,
        nom_classe: factureData.nom_classe,
        tel_client: factureData.tel_client,
        nom_client: factureData.nom_client,
        montant: factureData.montant,
        id_etat: factureData.id_etat,
        libelle_etat: factureData.libelle_etat,
        numrecu: factureData.numrecu || '',
        logo: factureData.logo,
        tms_update: factureData.tms_update,
        avec_frais: factureData.avec_frais,
        periode: factureData.periode,
        mt_reverser: factureData.mt_reverser,
        mt_remise: factureData.mt_remise || 0,
        mt_acompte: factureData.mt_acompte || 0,
        mt_restant: factureData.mt_restant || factureData.montant,
        photo_url: factureData.photo_url || '',
        details: factureData.details || []
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la facture privée:', error);
      throw new Error('Impossible de charger les détails de la facture');
    }
  }

  /**
   * Supprime une facture en utilisant la fonction PostgreSQL supprimer_facturecom
   */
  async supprimerFacture(idFacture: number, idStructure: number): Promise<SupprimerFactureResponse> {
    try {
      // Récupérer l'utilisateur actuel pour obtenir son ID
      const user = this.authService.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier d'abord l'état de la facture
      const facture = await this.getFacturePrivee(idFacture);

      if (facture.id_etat !== 1) {
        throw new Error('Seules les factures impayées peuvent être supprimées');
      }

      console.log('🗑️ Suppression facture:', {
        idStructure,
        idFacture,
        idUser: user.id
      });

      const requete = `SELECT * FROM supprimer_facturecom(${idStructure}, ${idFacture}, ${user.id})`;
      const rows = await DatabaseService.query(requete);
      console.log('📋 Réponse suppression facture:', rows);

      if (rows && rows.length > 0) {
        const result = rows[0] as Record<string, unknown>;
        if (typeof result === 'object' && result !== null && 'success' in result) {
          if (result.success === true || result.success === 'true') {
            return { success: true, message: (result.message as string) || 'Facture supprimée avec succès', id_facture: idFacture, details: result.details };
          } else {
            throw new Error((result.message as string) || 'Erreur lors de la suppression');
          }
        }
        return { success: true, message: 'Facture supprimée avec succès', id_facture: idFacture, details: result };
      }
      return { success: true, message: 'Facture supprimée avec succès', id_facture: idFacture };
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression',
        id_facture: idFacture
      };
    }
  }

  /**
   * Récupère l'historique des paiements d'une facture
   * NOTE: Temporairement désactivé pour éviter l'erreur 400
   * TODO: Implémenter la fonction PostgreSQL get_historique_paiements_facture côté backend
   */
  async getHistoriquePaiements(idFacture: number): Promise<PaiementHistorique[]> {
    try {
      console.log('📋 Récupération historique paiements pour facture:', idFacture);

      // TODO: Remplacer par la vraie fonction PostgreSQL quand elle sera disponible
      // La requête directe `SELECT * FROM paiements` cause une erreur 400
      // car la table n'existe peut-être pas ou n'est pas accessible directement

      console.log('⚠️ Historique paiements temporairement désactivé - fonction backend non implémentée');
      return [];

      /* Code à réactiver quand la fonction backend sera prête :
      const requete = `SELECT * FROM get_historique_paiements_facture(${idFacture})`;
      const xmlBody = this.construireXml(requete);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlBody
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        return [];
      }

      return data.datas?.map((paiement: unknown) => {
        const typedPaiement = paiement as {
          id_paiement: number;
          date_paiement: string;
          montant: number;
          mode_paiement?: string;
          reference?: string;
          statut?: string;
        };
        return {
          id_paiement: typedPaiement.id_paiement,
          date_paiement: typedPaiement.date_paiement,
          montant: typedPaiement.montant,
          mode_paiement: typedPaiement.mode_paiement || 'Non spécifié',
          reference: typedPaiement.reference || '',
          statut: typedPaiement.statut || 'Confirmé'
        };
      }) || [];
      */
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  }

  /**
   * Alias pour supprimerFacture - pour compatibilité avec l'interface
   */
  async deleteFacturePrivee(idFacture: number): Promise<SupprimerFactureResponse> {
    const user = this.authService.getUser();
    if (!user?.id_structure) {
      throw new Error('Utilisateur non authentifié ou sans structure');
    }
    return this.supprimerFacture(idFacture, user.id_structure);
  }

  /**
   * Génère l'URL de partage pour une facture privée
   */
  generateUrlPartage(idStructure: number, idFacture: number): string {
    // Utiliser la même logique que pour les factures publiques
    const dataToEncode = `${idStructure}-${idFacture}`;
    const token = btoa(dataToEncode)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://v2.fayclick.net';

    return `${baseUrl}/facture?token=${token}`;
  }
}

export const facturePriveeService = new FacturePriveeService();