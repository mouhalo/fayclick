/**
 * Service pour la gestion des reçus de paiement FayClick V2
 * Utilise la méthodologie DatabaseService avec requêtes SQL et XML
 */

import { API_CONFIG } from '@/lib/api-config';
import { RecuDetails, RecuGenere } from '@/types/recu';
import { WalletType } from '@/components/facture/ModalPaiementWalletNew';
import { authService } from './auth.service';

// Fonction utilitaire pour convertir les types de wallet
function convertWalletType(wallet: string): string {
  const walletMap: { [key: string]: string } = {
    'OM': 'orange-money',
    'WAVE': 'wave',
    'FREE': 'free-money',
    'CASH': 'free-money', // Mapper CASH vers free-money par défaut
    'orange-money': 'orange-money',
    'wave': 'wave',
    'free-money': 'free-money'
  };

  return walletMap[wallet] || 'free-money';
}

// Interface pour les données de création de reçu
export interface CreerRecuData {
  id_facture: number;
  id_structure: number;
  methode_paiement: WalletType;
  montant_paye: number;
  numero_recu?: string;
  reference_transaction?: string;
  numero_telephone?: string;
  date_paiement?: string;
}

// Interface pour la réponse de création
export interface CreerRecuResponse {
  success: boolean;
  message: string;
  numero_recu: string;
  id_recu?: number;
}

// Interface pour l'historique des reçus
export interface HistoriqueRecusParams {
  id_structure: number;
  date_debut?: string;
  date_fin?: string;
  limite?: number;
}

class RecuService {
  private baseUrl = API_CONFIG.baseUrl;
  private authService = authService;

  /**
   * Construit le XML pour l'API selon la méthodologie FayClick
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
   * Exécute une requête SQL via l'API PostgreSQL
   */
  private async executerRequete(requeteSql: string): Promise<any> {
    const xmlBody = this.construireXml(requeteSql);

    console.log('🧾 [RECU-SERVICE] Exécution requête:', {
      requete: requeteSql,
      url: this.baseUrl
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/json',
        'User-Agent': 'FayClick-V2/1.0'
      },
      body: xmlBody
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Erreur SQL: ${data.error}`);
    }

    return data;
  }

  /**
   * Créer un nouveau reçu après paiement réussi
   */
  async creerRecu(recuData: CreerRecuData): Promise<CreerRecuResponse> {
    try {
      const {
        id_facture,
        id_structure,
        methode_paiement,
        montant_paye,
        numero_recu,
        reference_transaction,
        numero_telephone,
        date_paiement
      } = recuData;

      // Générer numéro de reçu si non fourni (différencier acomptes)
      const numRecu = numero_recu || `REC-ACOMPTE-${id_facture}-${Date.now()}`;
      const datePaiement = date_paiement || new Date().toISOString();
      const walletConverted = convertWalletType(methode_paiement);

      const requete = `
        INSERT INTO public.recus_paiement (
          id_facture,
          id_structure,
          numero_recu,
          methode_paiement,
          montant_paye,
          reference_transaction,
          numero_telephone,
          date_paiement,
          date_creation
        ) VALUES (
          ${id_facture},
          ${id_structure},
          '${numRecu}',
          '${walletConverted}',
          ${montant_paye},
          ${reference_transaction ? `'${reference_transaction}'` : 'NULL'},
          ${numero_telephone ? `'${numero_telephone}'` : 'NULL'},
          '${datePaiement}',
          NOW()
        ) RETURNING id_recu, numero_recu
      `;

      const result = await this.executerRequete(requete);

      if (result && result.length > 0) {
        return {
          success: true,
          message: 'Reçu créé avec succès',
          numero_recu: result[0].numero_recu,
          id_recu: result[0].id_recu
        };
      }

      throw new Error('Aucune donnée retournée lors de la création du reçu');

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur création reçu:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la création du reçu');
    }
  }

  /**
   * Récupérer un reçu public par token (idStructure et idFacture)
   */
  async getRecuPublique(idStructure: number, idFacture: number): Promise<RecuDetails> {
    try {
      const requete = `
       SELECT
          f.id_facture,
          f.num_facture,
          f.id_structure,
          f.nom_structure,
          f.date_facture,
          f.nom_client,
          f.tel_client,
          f.montant,
          f.libelle_etat ,
          f.description,
          f.mt_remise,
          f.mt_acompte,
          f.mt_restant,
          f.logo,
          r.numero_recu,
          r.methode_paiement,
          r.montant_paye,
          r.reference_transaction,
          r.numero_telephone,
          r.date_paiement
        FROM public.list_factures_com f
        LEFT JOIN public.recus_paiement r ON f.id_facture = r.id_facture
        WHERE f.id_structure = ${idStructure}
          AND f.id_facture = ${idFacture}
      `;

      const result = await this.executerRequete(requete);

      if (!result || result.length === 0) {
        throw new Error('Reçu introuvable ou facture non payée');
      }

      const recuData = result[0];

      // Récupérer les détails des articles si disponibles
      const detailsRequete = `
        SELECT
          p.nom_produit,
          d.quantite,
          d.prix,
          d.sous_total,
          p.description as description_produit
        FROM public.facture_details d
        INNER JOIN public.produits p ON d.id_produit = p.id_produit
        WHERE d.id_facture = ${idFacture}
        ORDER BY d.id_detail
      `;

      const detailsResult = await this.executerRequete(detailsRequete);

      const recuComplet: RecuDetails = {
        facture: {
          id_facture: recuData.id_facture,
          num_facture: recuData.num_facture,
          id_structure: recuData.id_structure,
          nom_structure: recuData.nom_structure,
          date_facture: recuData.date_facture,
          nom_client: recuData.nom_client,
          tel_client: recuData.tel_client,
          montant: recuData.montant,
          libelle_etat: 'PAYEE',
          numrecu: recuData.numero_recu,
          logo: recuData.logo || '',
          description: recuData.description,
          mt_remise: recuData.mt_remise,
          mt_acompte: recuData.mt_acompte,
          mt_restant: recuData.mt_restant
        },
        paiement: {
          date_paiement: recuData.date_paiement,
          methode_paiement: recuData.methode_paiement as WalletType,
          montant_paye: recuData.montant_paye,
          reference_transaction: recuData.reference_transaction,
          numero_telephone: recuData.numero_telephone
        },
        details_articles: detailsResult || []
      };

      return recuComplet;

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur récupération reçu public:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération du reçu');
    }
  }

  /**
   * Récupérer l'historique des reçus pour une structure
   */
  async getHistoriqueRecus(params: HistoriqueRecusParams): Promise<RecuGenere[]> {
    try {
      const { id_structure, date_debut, date_fin, limite = 50 } = params;

      let whereClause = `WHERE r.id_structure = ${id_structure}`;

      if (date_debut) {
        whereClause += ` AND r.date_paiement >= '${date_debut}'`;
      }

      if (date_fin) {
        whereClause += ` AND r.date_paiement <= '${date_fin}'`;
      }

      const requete = `
        SELECT
          f.id_facture,
          f.num_facture,
          r.numero_recu,
          f.id_structure,
          s.nom_structure,
          f.date_facture,
          r.date_paiement,
          f.nom_client,
          f.tel_client,
          f.montant as montant_facture,
          r.montant_paye,
          r.methode_paiement,
          r.reference_transaction,
          s.logo as logo_structure
        FROM public.recus_paiement r
        INNER JOIN public.factures f ON r.id_facture = f.id_facture
        INNER JOIN public.structures s ON r.id_structure = s.id_structure
        ${whereClause}
        ORDER BY r.date_paiement DESC
        LIMIT ${limite}
      `;

      const result = await this.executerRequete(requete);

      return result || [];

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur historique reçus:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'historique');
    }
  }

  /**
   * Vérifier si un reçu existe pour une facture
   */
  async verifierRecuExiste(idFacture: number): Promise<boolean> {
    try {
      const requete = `
        SELECT COUNT(*) as count
        FROM public.recus_paiement
        WHERE id_facture = ${idFacture}
      `;

      const result = await this.executerRequete(requete);
      return result && result.length > 0 && result[0].count > 0;

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur vérification reçu:', error);
      return false;
    }
  }

  /**
   * Générer l'URL de partage public pour un reçu
   */
  generateUrlPartage(idStructure: number, idFacture: number): string {
    // Utiliser la même logique que pour les factures mais vers /recu
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://v2.fayclick.net';
    const params = btoa(`${idStructure}:${idFacture}`);
    return `${baseUrl}/recu?token=${params}`;
  }

  /**
   * Statistiques des reçus pour une structure
   */
  async getStatistiquesRecus(idStructure: number, periode: string = '30'): Promise<{
    total_recus: number;
    montant_total: number;
    methodes_populaires: Array<{methode: string; count: number}>;
  }> {
    try {
      // Requête pour les statistiques générales
      const requeteStats = `
        SELECT
          COUNT(*) as total_recus,
          SUM(montant_paye) as montant_total
        FROM public.recus_paiement
        WHERE id_structure = ${idStructure}
          AND date_paiement >= NOW() - INTERVAL '${periode} days'
      `;

      // Requête pour les méthodes populaires
      const requeteMethodes = `
        SELECT
          methode_paiement as methode,
          COUNT(*) as count
        FROM public.recus_paiement
        WHERE id_structure = ${idStructure}
          AND date_paiement >= NOW() - INTERVAL '${periode} days'
        GROUP BY methode_paiement
        ORDER BY count DESC
        LIMIT 5
      `;

      const [statsResult, methodesResult] = await Promise.all([
        this.executerRequete(requeteStats),
        this.executerRequete(requeteMethodes)
      ]);

      return {
        total_recus: statsResult?.[0]?.total_recus || 0,
        montant_total: statsResult?.[0]?.montant_total || 0,
        methodes_populaires: methodesResult || []
      };

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur statistiques reçus:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques');
    }
  }
}

// Export de l'instance singleton
export const recuService = new RecuService();
export default recuService;