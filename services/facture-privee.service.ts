/**
 * Service pour la gestion des factures privées des commerçants
 * API: rechercher_multifacturecom au format XML
 */

import { API_CONFIG } from '@/lib/api-config';
import { DetailFacture } from '@/types/facture-privee';

export interface FacturePriveeData {
  id_facture: number;
  num_facture: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  nannee: number;
  nmois: number;
  description: string;
  nom_classe: string;
  tel_client: string;
  nom_client: string;
  montant: number;
  id_etat: number;
  libelle_etat: 'PAYEE' | 'IMPAYEE';
  numrecu: string;
  logo: string;
  tms_update: string | null;
  avec_frais: boolean;
  periode: string;
  mt_reverser: boolean;
  mt_remise: number;
  mt_acompte: number;
  mt_restant: number;
  photo_url: string;
}

export interface PaiementHistorique {
  id_paiement: number;
  date_paiement: string;
  montant: number;
  mode_paiement: string;
  reference: string;
  statut: string;
}

export interface SupprimerFactureResponse {
  success: boolean;
  message: string;
  id_facture: number;
}

class FacturePriveeService {
  private baseUrl = API_CONFIG.baseUrl;

  /**
   * Construit le XML pour l'API
   */
  private construireXml(requeteSql: string): string {
    const sql_text = requeteSql.replace(/\n/g, ' ').trim();
    return `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${sql_text}</requete_sql>
</request>`;
  }

  /**
   * Récupère les détails d'une facture privée pour un commerçant
   */
  async getFacturePrivee(idFacture: number): Promise<FacturePriveeData> {
    try {
      const requete = `SELECT * FROM public.rechercher_multifacturecom1('', ${idFacture})`;
      const xmlBody = this.construireXml(requete);

      console.log('🔍 Appel API facture privée:', {
        idFacture,
        requete,
        url: this.baseUrl
      });

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

      console.log('📦 Réponse API:', data);

      if (data.status !== 'success' || !data.datas || data.datas.length === 0) {
        throw new Error('Facture introuvable');
      }

      // La réponse contient un objet JSON dans data.datas[0]
      const jsonData = data.datas[0];

      // Parser le JSON si c'est une chaîne
      const parsedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      console.log('📦 Données parsées:', parsedData);

      // La fonction retourne un objet avec le nom de la fonction comme clé
      const functionResult = parsedData.rechercher_multifacturecom1 || parsedData.rechercher_multifacturecom;

      if (!functionResult || !functionResult.factures || functionResult.factures.length === 0) {
        throw new Error('Aucune facture trouvée dans la réponse');
      }

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
   * Supprime une facture (uniquement si état = 1 - IMPAYEE)
   */
  async supprimerFacture(idFacture: number, idStructure: number): Promise<SupprimerFactureResponse> {
    try {
      // Vérifier d'abord l'état de la facture
      const facture = await this.getFacturePrivee(idFacture);

      if (facture.id_etat !== 1) {
        throw new Error('Seules les factures impayées peuvent être supprimées');
      }

      const requete = `DELETE FROM factures WHERE id_facture = ${idFacture} AND id_structure = ${idStructure} AND id_etat = 1`;
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

      if (data.status === 'success') {
        return {
          success: true,
          message: 'Facture supprimée avec succès',
          id_facture: idFacture
        };
      } else {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }
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
   */
  async getHistoriquePaiements(idFacture: number): Promise<PaiementHistorique[]> {
    try {
      const requete = `SELECT * FROM paiements WHERE id_facture = ${idFacture} ORDER BY date_paiement DESC`;
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

      return data.datas?.map((paiement: any) => ({
        id_paiement: paiement.id_paiement,
        date_paiement: paiement.date_paiement,
        montant: paiement.montant,
        mode_paiement: paiement.mode_paiement || 'Non spécifié',
        reference: paiement.reference || '',
        statut: paiement.statut || 'Confirmé'
      })) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
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