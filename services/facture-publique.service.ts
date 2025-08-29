/**
 * Service pour récupérer les factures publiques (sans authentification)
 */

import { FacturePublique } from '@/types/facture-publique';

export class FacturePubliqueException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'FacturePubliqueException';
  }
}

class FacturePubliqueService {
  private static instance: FacturePubliqueService;

  static getInstance(): FacturePubliqueService {
    if (!this.instance) {
      this.instance = new FacturePubliqueService();
    }
    return this.instance;
  }

  /**
   * Récupère une facture publique directement via la base de données
   */
  async getFacturePublique(id_structure: number, id_facture: number): Promise<any> {
    try {
      // Validation des paramètres
      if (!id_structure || !id_facture) {
        throw new FacturePubliqueException('Paramètres manquants', 400);
      }

      if (isNaN(id_structure) || isNaN(id_facture)) {
        throw new FacturePubliqueException('Paramètres invalides', 400);
      }

      console.log('🔍 Appel direct DB facture publique:', {
        id_structure,
        id_facture
      });

      // Import dynamique du service database
      const database = (await import('./database.service')).default;
      
      // Utiliser le service database pour appeler la fonction PostgreSQL
      const query = `SELECT * FROM get_my_facture(${id_structure}, ${id_facture})`;
      const data = await database.query(query);
      
      console.log('📦 Données reçues de la DB:', JSON.stringify(data, null, 2).substring(0, 500));
      
      // Vérifier si la requête a retourné des données
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new FacturePubliqueException('Facture introuvable', 404);
      }

      // La fonction get_my_facture retourne un objet JSON dans la première ligne
      let factureData;
      
      if (Array.isArray(data) && data.length > 0) {
        // Si c'est un tableau, prendre le premier élément
        const firstRow = data[0];
        // La colonne peut s'appeler 'get_my_facture' ou être directement l'objet
        factureData = firstRow.get_my_facture || firstRow;
      } else {
        factureData = data;
      }

      // Si les données sont encore emballées dans une chaîne JSON, les parser
      if (typeof factureData === 'string') {
        try {
          factureData = JSON.parse(factureData);
        } catch (e) {
          console.error('Erreur parsing JSON:', e);
        }
      }

      if (!factureData || !factureData.facture) {
        console.error('❌ Structure de données invalide:', factureData);
        throw new FacturePubliqueException('Format de données invalide', 500);
      }

      console.log('✅ Facture récupérée:', {
        id_facture: factureData.facture.id_facture,
        montant: factureData.facture.montant,
        etat: factureData.facture.libelle_etat
      });

      return factureData;

    } catch (error) {
      console.error('❌ Erreur récupération facture publique:', error);
      
      if (error instanceof FacturePubliqueException) {
        throw error;
      }
      
      throw new FacturePubliqueException(
        'Impossible de récupérer la facture',
        500
      );
    }
  }

  /**
   * Vérifie si une facture existe et retourne son statut
   */
  async checkFactureStatus(id_structure: number, id_facture: number): Promise<{
    exists: boolean;
    isPaid: boolean;
    montant?: number;
    restant?: number;
  }> {
    try {
      const facture = await this.getFacturePublique(id_structure, id_facture);
      
      return {
        exists: true,
        isPaid: facture.facture.id_etat !== 1,
        montant: facture.facture.montant,
        restant: facture.facture.mt_restant
      };
    } catch (error) {
      if (error instanceof FacturePubliqueException && error.statusCode === 404) {
        return {
          exists: false,
          isPaid: false
        };
      }
      throw error;
    }
  }

  /**
   * Formate l'URL de partage d'une facture avec encodage sécurisé
   */
  formatShareUrl(id_structure: number, id_facture: number): string {
    // Utiliser la fonction centralisée de url-config
    const { getFactureUrl } = require('@/lib/url-config');
    return getFactureUrl(id_structure, id_facture);
  }
}

export const facturePubliqueService = FacturePubliqueService.getInstance();
export default facturePubliqueService;