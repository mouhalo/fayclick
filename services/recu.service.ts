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
  id_recu?: number;
  numero_recu?: string;
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

    const responseText = await response.text();
    console.log('📥 [RECU-SERVICE] Réponse brute API:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [RECU-SERVICE] Erreur parsing JSON:', parseError);
      throw new Error('Réponse API invalide (non JSON)');
    }

    console.log('📊 [RECU-SERVICE] Données parsées:', {
      status: data.status,
      hasMessage: !!data.message,
      hasDatas: !!data.datas,
      datasLength: data.datas?.length,
      hasData: !!data.data,
      dataLength: data.data?.length,
      hasResult: !!data.result,
      keys: Object.keys(data)
    });

    if (data.error) {
      throw new Error(`Erreur SQL: ${data.error}`);
    }

    // Gérer différents formats de réponse de l'API
    if (data.status === 'success') {
      // Si la réponse contient un objet result avec datas
      if (data.result && data.result.datas) {
        console.log('✅ [RECU-SERVICE] Données trouvées dans result.datas');
        return data.result;
      }
      // Si la réponse contient directement datas
      if (data.datas !== undefined) {
        console.log('✅ [RECU-SERVICE] Données trouvées dans datas');
        return data;
      }
      // Si la réponse contient data
      if (data.data !== undefined) {
        console.log('✅ [RECU-SERVICE] Données trouvées dans data');
        return { datas: data.data };
      }
      // Pour les INSERT qui peuvent ne rien retourner
      console.log('⚠️ [RECU-SERVICE] Aucune donnée dans la réponse, mais status success');
      return { datas: [], status: 'success' };
    }

    // Retourner les données telles quelles si pas de status
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

      // Générer numéro de reçu si non fourni (format: REC-{id_structure}-{id_facture}-{timestamp})
      const numRecu = numero_recu || `REC-${id_structure}-${id_facture}-${Date.now()}`;
      const datePaiement = date_paiement || new Date().toISOString();
      const walletConverted = convertWalletType(methode_paiement);

      console.log('📝 [RECU-SERVICE] Création reçu avec données:', {
        id_facture,
        id_structure,
        numero_recu: numRecu,
        methode_paiement: walletConverted,
        montant_paye,
        reference_transaction,
        numero_telephone,
        date_paiement: datePaiement
      });

      // Première tentative : INSERT avec RETURNING
      const requeteInsert = `
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
        ) RETURNING id_recu
      `;

      const insertResult = await this.executerRequete(requeteInsert);
      console.log('📤 [RECU-SERVICE] Résultat INSERT:', insertResult);

      // Vérifier si on a récupéré l'ID depuis le RETURNING
      if (insertResult?.datas && insertResult.datas.length > 0 && insertResult.datas[0].id_recu) {
        console.log('✅ [RECU-SERVICE] Reçu créé avec ID:', insertResult.datas[0].id_recu);
        return {
          success: true,
          message: 'Reçu créé avec succès',
          id_recu: insertResult.datas[0].id_recu,
          numero_recu: numRecu
        };
      }

      // Si pas d'ID retourné, essayer de récupérer le reçu créé
      console.log('⚠️ [RECU-SERVICE] Pas d\'ID retourné, tentative de récupération du reçu créé');

      const requeteSelect = `
        SELECT id_recu, numero_recu
        FROM public.recus_paiement
        WHERE numero_recu = '${numRecu}'
        ORDER BY date_creation DESC
        LIMIT 1
      `;

      const selectResult = await this.executerRequete(requeteSelect);
      console.log('🔍 [RECU-SERVICE] Résultat SELECT:', selectResult);

      if (selectResult?.datas && selectResult.datas.length > 0) {
        const recu = selectResult.datas[0];
        console.log('✅ [RECU-SERVICE] Reçu trouvé après création:', recu);
        return {
          success: true,
          message: 'Reçu créé avec succès',
          id_recu: recu.id_recu,
          numero_recu: numRecu
        };
      }

      // Si toujours pas trouvé, considérer comme succès sans ID
      console.log('⚠️ [RECU-SERVICE] Reçu probablement créé mais ID non récupérable');
      return {
        success: true,
        message: 'Reçu créé (ID non disponible)',
        numero_recu: numRecu
      };

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur création reçu:', error);

      // Vérifier si le reçu existe déjà malgré l'erreur
      if (recuData.numero_recu) {
        try {
          const checkQuery = `
            SELECT id_recu FROM public.recus_paiement
            WHERE numero_recu = '${recuData.numero_recu}'
            LIMIT 1
          `;
          const checkResult = await this.executerRequete(checkQuery);
          if (checkResult?.datas && checkResult.datas.length > 0) {
            console.log('⚠️ [RECU-SERVICE] Reçu existe déjà malgré l\'erreur');
            return {
              success: true,
              message: 'Reçu existant',
              id_recu: checkResult.datas[0].id_recu,
              numero_recu: recuData.numero_recu
            };
          }
        } catch (checkError) {
          console.error('❌ [RECU-SERVICE] Erreur vérification existence:', checkError);
        }
      }

      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la création du reçu');
    }
  }

  /**
   * Récupérer un reçu public par token (idStructure et idFacture)
   */
  async getRecuPublique(idStructure: number, idFacture: number): Promise<RecuDetails> {
    try {
      // D'abord vérifier si la facture existe
      const factureRequete = `
        SELECT
          f.id_facture,
          f.num_facture,
          f.id_structure,
          f.nom_structure,
          f.date_facture,
          f.nom_client,
          f.tel_client,
          f.montant,
          f.libelle_etat,
          f.description,
          f.mt_remise,
          f.mt_acompte,
          f.mt_restant,
          f.logo
        FROM public.list_factures_com f
        WHERE f.id_structure = ${idStructure}
          AND f.id_facture = ${idFacture}
      `;

      const factureResult = await this.executerRequete(factureRequete);

      console.log('🧾 [RECU-SERVICE] Résultat facture:', factureResult);

      if (!factureResult?.datas || factureResult.datas.length === 0) {
        throw new Error('Facture introuvable');
      }

      // Maintenant chercher le reçu associé
      const recuRequete = `
        SELECT
          numero_recu,
          methode_paiement,
          montant_paye,
          reference_transaction,
          numero_telephone,
          date_paiement
        FROM public.recus_paiement
        WHERE id_facture = ${idFacture}
        ORDER BY date_paiement DESC
        LIMIT 1
      `;

      const recuResult = await this.executerRequete(recuRequete);

      console.log('🧾 [RECU-SERVICE] Résultat reçu:', recuResult);

      if (!recuResult?.datas || recuResult.datas.length === 0) {
        throw new Error('Aucun reçu trouvé pour cette facture');
      }

      const factureData = factureResult?.datas?.[0];
      const recuData = recuResult?.datas?.[0];

      console.log('🧾 [RECU-SERVICE] FactureData:', factureData);
      console.log('🧾 [RECU-SERVICE] RecuData:', recuData);

      if (!factureData) {
        throw new Error('Données facture manquantes');
      }

      if (!recuData) {
        throw new Error('Données reçu manquantes');
      }

      // Récupérer les détails des articles si disponibles
      const detailsRequete = `
        SELECT
          p.nom_produit,
          d.quantite,
          d.prix,
          (d.prix * d.quantite) as sous_total,
          p.description as description_produit
        FROM public.detail_facture_com d
        INNER JOIN public.produit_service p ON d.id_produit = p.id_produit
        WHERE d.id_facture = ${idFacture}
        ORDER BY d.id_detail
      `;

      const detailsResult = await this.executerRequete(detailsRequete);

      const recuComplet: RecuDetails = {
        facture: {
          id_facture: factureData?.id_facture || 0,
          num_facture: factureData?.num_facture || '',
          id_structure: factureData?.id_structure || 0,
          nom_structure: factureData?.nom_structure || '',
          date_facture: factureData?.date_facture || '',
          nom_client: factureData?.nom_client || '',
          tel_client: factureData?.tel_client || '',
          montant: factureData?.montant || 0,
          libelle_etat: 'PAYEE',
          numrecu: recuData?.numero_recu || '',
          logo: factureData?.logo || '',
          description: factureData?.description || '',
          mt_remise: factureData?.mt_remise || 0,
          mt_acompte: factureData?.mt_acompte || 0,
          mt_restant: factureData?.mt_restant || 0
        },
        paiement: {
          date_paiement: recuData?.date_paiement || '',
          methode_paiement: (recuData?.methode_paiement as WalletType) || 'OM',
          montant_paye: recuData?.montant_paye || 0,
          reference_transaction: recuData?.reference_transaction || '',
          numero_telephone: recuData?.numero_telephone || ''
        },
        details_articles: detailsResult?.datas || []
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

      return result?.datas || [];

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
      return result?.datas && result.datas.length > 0 && result.datas[0].count > 0;

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
        total_recus: statsResult?.datas?.[0]?.total_recus || 0,
        montant_total: statsResult?.datas?.[0]?.montant_total || 0,
        methodes_populaires: methodesResult?.datas || []
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