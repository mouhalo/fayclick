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
      const query = `SELECT * FROM get_my_factures(${id_structure}, ${id_facture})`;

      // Construire le XML pour l'API
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${query.replace(/\n/g, ' ').trim()}</requete_sql>
</request>`;

      console.log('📤 [FACTURE-PUBLIQUE] Requête:', query);
      console.log('🌐 [FACTURE-PUBLIQUE] URL:', API_CONFIG.ENDPOINT);

      // Appel direct à l'API (sans headers custom pour éviter les problèmes CORS)
      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json'
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
        factureData = firstRow.get_my_factures || firstRow;
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

  /**
   * Ajouter un acompte à une facture publique (sans authentification)
   * Utilisé quand un client paie directement via le lien public de la facture
   */
  async addAcomptePublique(params: {
    id_structure: number;
    id_facture: number;
    montant_acompte: number;
    transaction_id: string;
    uuid: string;
    mode_paiement: 'OM' | 'WAVE' | 'FREE';
    telephone: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
  }> {
    try {
      console.log('💳 [FACTURE-PUBLIQUE] Ajout acompte:', params);

      // Validation des paramètres
      if (!params.id_structure || !params.id_facture) {
        throw new FacturePubliqueException('Paramètres de facture manquants', 400);
      }

      if (!params.montant_acompte || params.montant_acompte <= 0) {
        throw new FacturePubliqueException('Montant invalide', 400);
      }

      if (!params.uuid || !params.transaction_id) {
        throw new FacturePubliqueException('Informations de paiement manquantes', 400);
      }

      // Import dynamique de l'API config
      const { API_CONFIG } = await import('@/config/env');

      // Construire la requête SQL pour add_acompte_facture (7 paramètres)
      const telephone = params.telephone || '000000000';
      const query = `SELECT * FROM add_acompte_facture(${params.id_structure}, ${params.id_facture}, ${params.montant_acompte}, '${params.transaction_id}', '${params.uuid}', '${params.mode_paiement}', '${telephone}')`;

      console.log('📤 [FACTURE-PUBLIQUE] Requête acompte:', query);

      // Construire le XML pour l'API
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${query.replace(/\n/g, ' ').trim()}</requete_sql>
</request>`;

      // Appel direct à l'API
      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json'
        },
        body: xml
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📥 [FACTURE-PUBLIQUE] Réponse acompte brute:', responseText);

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

      // Extraire le résultat de la fonction PostgreSQL
      let acompteResult;
      if (Array.isArray(data) && data.length > 0) {
        const firstRow = data[0];
        acompteResult = firstRow.add_acompte_facture || firstRow;
      } else {
        acompteResult = data;
      }

      // Parser si c'est une chaîne JSON
      if (typeof acompteResult === 'string') {
        try {
          acompteResult = JSON.parse(acompteResult);
        } catch (e) {
          console.error('Erreur parsing résultat acompte:', e);
        }
      }

      console.log('✅ [FACTURE-PUBLIQUE] Résultat acompte:', acompteResult);

      // Vérifier le succès
      if (acompteResult && acompteResult.success === false) {
        return {
          success: false,
          message: acompteResult.message || 'Échec de l\'enregistrement du paiement'
        };
      }

      return {
        success: true,
        message: 'Paiement enregistré avec succès',
        data: acompteResult
      };

    } catch (error) {
      console.error('❌ [FACTURE-PUBLIQUE] Erreur ajout acompte:', error);

      if (error instanceof FacturePubliqueException) {
        throw error;
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement'
      };
    }
  }
}

export const facturePubliqueService = FacturePubliqueService.getInstance();
export default facturePubliqueService;