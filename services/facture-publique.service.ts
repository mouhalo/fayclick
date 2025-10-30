/**
 * Service pour récupérer les factures publiques (sans authentification)
 */

// Types will be imported when needed

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
  async getFacturePublique(id_structure: number, id_facture: number): Promise<unknown> {
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

      // Import dynamique de l'API config
      const { API_CONFIG } = await import('@/config/env');

      // Construire la requête SQL
      const query = `SELECT * FROM get_my_facture(${id_structure}, ${id_facture})`;

      // Construire le XML pour l'API
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${query.replace(/\n/g, ' ').trim()}</requete_sql>
</request>`;

      console.log('📤 [FACTURE-PUBLIQUE] Requête:', query);
      console.log('🌐 [FACTURE-PUBLIQUE] URL:', API_CONFIG.ENDPOINT);

      // Appel direct à l'API
      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          'User-Agent': 'FayClick-V2/1.0'
        },
        body: xml
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📥 [FACTURE-PUBLIQUE] Réponse brute:', responseText);

      let apiResponse;
      try {
        apiResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [FACTURE-PUBLIQUE] Erreur parsing JSON:', parseError);
        throw new Error('Réponse API invalide');
      }

      // Extraire les données selon le format de réponse
      let data;
      if (apiResponse.datas !== undefined) {
        data = apiResponse.datas;
      } else if (apiResponse.data !== undefined) {
        data = apiResponse.data;
      } else if (apiResponse.result?.datas !== undefined) {
        data = apiResponse.result.datas;
      } else {
        data = apiResponse;
      }
      
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

      // Assertion de type pour accéder aux propriétés
      const typedFacture = facture as {
        facture: {
          id_etat: number;
          montant: number;
          mt_restant: number;
        }
      };

      return {
        exists: true,
        isPaid: typedFacture.facture.id_etat !== 1,
        montant: typedFacture.facture.montant,
        restant: typedFacture.facture.mt_restant
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
  async formatShareUrl(id_structure: number, id_facture: number): Promise<string> {
    // Utiliser l'import ES6 plutôt que require
    const { getFactureUrl } = await import('@/lib/url-config');
    return getFactureUrl(id_structure, id_facture);
  }
}

export const facturePubliqueService = FacturePubliqueService.getInstance();
export default facturePubliqueService;