/**
 * Service pour la gestion des reçus de paiement FayClick V2
 * Utilise la méthodologie DatabaseService avec requêtes SQL et XML
 */

import { RecuDetails, RecuGenere } from '@/types/recu';
import { WalletType } from '@/components/facture/ModalPaiementWalletNew';
import DatabaseService from './database.service';
import type {
  EncaissementParMode,
  RapportEncaissements,
} from '@/types/rapport-encaissements';
import {
  MODES_PAIEMENT_PRINCIPAUX,
  type ModePaiementNormalise,
} from '@/lib/payment-methods';

/** Format attendu pour les bornes de période transmises à PostgreSQL. */
const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Fonction utilitaire pour convertir les types de wallet
function convertWalletType(wallet: string): string {
  const walletMap: { [key: string]: string } = {
    'OM': 'orange-money',
    'WAVE': 'wave',
    'FREE': 'free-money',
    'CASH': 'espèces', 
    'orange-money': 'orange-money',
    'wave': 'wave',
    'free-money': 'free-money'
  };

  return walletMap[wallet] || 'espèces';
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
  /** 0 = toute la structure (ADMIN), > 0 = les reçus de ce seul caissier */
  id_utilisateur?: number;
}

class RecuService {
  private db = DatabaseService;

  /**
   * Exécute une requête SQL via DatabaseService (JSON sql_jsonpro)
   * Retourne au format { datas: [...] } pour compatibilité interne
   */
  private async executerRequete(requeteSql: string): Promise<{ datas: any[] }> {
    const sql = requeteSql.replace(/\n/g, ' ').trim();
    console.log('🧾 [RECU-SERVICE] Exécution requête:', { requete: sql });
    const rows = await this.db.query(sql);
    return { datas: rows };
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

      // Utiliser la fonction PostgreSQL add_new_recupaiement (INSERT direct bloqué par module sécurité)
      const requeteFonction = `
        SELECT public.add_new_recupaiement(
          ${id_facture},
          ${id_structure},
          '${numRecu}',
          '${walletConverted}',
          ${montant_paye},
          ${reference_transaction ? `'${reference_transaction}'` : 'NULL'},
          ${numero_telephone ? `'${numero_telephone}'` : 'NULL'},
          '${datePaiement}'::TIMESTAMP
        )
      `;

      const insertResult = await this.executerRequete(requeteFonction);
      console.log('📤 [RECU-SERVICE] Résultat add_new_recupaiement:', insertResult);

      // Extraire le résultat JSON de la fonction PostgreSQL
      // Format réponse: {"success": true, "code": "RECEIPT_CREATED", "message": "...", "data": {"new_id": 2410}}
      let functionResponse = null;

      if (insertResult?.datas && insertResult.datas.length > 0) {
        const rawResult = insertResult.datas[0];
        // La réponse peut être dans add_new_recupaiement ou dans une autre clé
        const jsonString = rawResult.add_new_recupaiement || Object.values(rawResult)[0];

        if (typeof jsonString === 'string') {
          try {
            functionResponse = JSON.parse(jsonString);
          } catch {
            console.log('⚠️ [RECU-SERVICE] Réponse non-JSON:', jsonString);
          }
        } else if (typeof jsonString === 'object') {
          functionResponse = jsonString;
        }
      }

      if (functionResponse?.success && functionResponse?.data?.new_id) {
        console.log('✅ [RECU-SERVICE] Reçu créé avec ID:', functionResponse.data.new_id);
        return {
          success: true,
          message: 'Reçu créé avec succès',
          id_recu: functionResponse.data.new_id,
          numero_recu: numRecu
        };
      }

      // Fallback : vérifier si le reçu existe malgré une réponse inattendue
      console.log('⚠️ [RECU-SERVICE] Réponse inattendue, vérification existence du reçu');

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

      // Récupérer les données facture pour un message d'erreur plus explicite
      const factureData = factureResult?.datas?.[0];

      if (!recuResult?.datas || recuResult.datas.length === 0) {
        // Vérifier si c'est une facture non payée ou si le reçu n'a pas été généré
        if (factureData?.libelle_etat !== 'PAYEE') {
          throw new Error(`Cette facture n'est pas encore payée (statut: ${factureData?.libelle_etat || 'INCONNU'})`);
        }
        throw new Error('Aucun reçu n\'a été généré pour cette facture. Le paiement n\'a peut-être pas été enregistré correctement.');
      }

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
   * Utilise la fonction PostgreSQL get_historic_recu()
   *
   * Isolation par caissier : `id_utilisateur = 0` retourne les reçus de toute
   * la structure (ADMIN) ; une valeur > 0 restreint à ce seul utilisateur.
   *
   * Les 5 arguments sont TOUJOURS passés explicitement. La surcharge à 4
   * arguments a été conservée côté base pour rétro-compatibilité : en omettre
   * un rendrait la résolution de surcharge ambiguë, comme déjà rencontré
   * ailleurs dans le projet.
   */
  async getHistoriqueRecus(params: HistoriqueRecusParams): Promise<RecuGenere[]> {
    const { id_structure, date_debut, date_fin, limite = 50, id_utilisateur = 0 } = params;

    // Les dates partent en interpolation SQL : on refuse tout ce qui n'est pas
    // une date ISO stricte plutôt que de concaténer une chaîne arbitraire.
    if (date_debut && !FORMAT_DATE_ISO.test(date_debut)) {
      throw new Error(`Date de début invalide (format attendu YYYY-MM-DD) : ${date_debut}`);
    }
    if (date_fin && !FORMAT_DATE_ISO.test(date_fin)) {
      throw new Error(`Date de fin invalide (format attendu YYYY-MM-DD) : ${date_fin}`);
    }

    const pidUtilisateur = Number(id_utilisateur) || 0;

    try {
      // Sans bornes de dates, on passe NULL/NULL : la fonction retombe alors sur
      // son comportement « toute période », sans faire varier le nombre d'args.
      const bornes = date_debut && date_fin ? `'${date_debut}', '${date_fin}'` : 'NULL, NULL';
      const requete = `SELECT public.get_historic_recu(${id_structure}, ${bornes}, ${limite}, ${pidUtilisateur})`;

      console.log('🧾 [RECU-SERVICE] Appel get_historic_recu:', {
        id_structure,
        date_debut,
        date_fin,
        limite,
        id_utilisateur: pidUtilisateur,
        requete
      });

      const result = await this.executerRequete(requete);

      // Extraire la réponse JSON de la fonction PostgreSQL
      // Format attendu : { success, code, message, total, data: [...] }
      let functionResponse = null;

      if (result?.datas && result.datas.length > 0) {
        const rawResult = result.datas[0];
        const jsonData = rawResult.get_historic_recu || Object.values(rawResult)[0];

        if (typeof jsonData === 'string') {
          try {
            functionResponse = JSON.parse(jsonData);
          } catch {
            console.error('❌ [RECU-SERVICE] Erreur parsing JSON get_historic_recu');
          }
        } else if (typeof jsonData === 'object') {
          functionResponse = jsonData;
        }
      }

      console.log('📊 [RECU-SERVICE] Réponse get_historic_recu:', {
        success: functionResponse?.success,
        total: functionResponse?.total,
        dataLength: functionResponse?.data?.length
      });

      // Retourner le tableau data de la réponse
      return functionResponse?.data || [];

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur historique reçus:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'historique');
    }
  }

  /**
   * Rapport des encaissements agrégés par mode de paiement sur une période.
   *
   * Utilise la fonction PostgreSQL `get_rapport_encaissements()`, TOUJOURS
   * appelée avec ses 4 arguments positionnels : le projet a déjà rencontré des
   * résolutions de surcharge ambiguës en omettant des paramètres par défaut.
   *
   * Isolation par caissier : `idUtilisateur = 0` agrège toute la structure
   * (ADMIN) ; une valeur > 0 restreint aux encaissements de ce seul utilisateur.
   *
   * Le service garantit à l'appelant que CASH, OM, WAVE et FREE sont toujours
   * présents dans `modes` (complétés à zéro si absents du retour SQL), afin que
   * l'UI puisse afficher un wallet resté sans encaissement plutôt que de faire
   * disparaître sa carte. `AUTRES` n'est conservé que s'il est non nul.
   *
   * @param idStructure - ID de la structure
   * @param dateDebut - Borne basse incluse, format `YYYY-MM-DD`
   * @param dateFin - Borne haute incluse, format `YYYY-MM-DD`
   * @param idUtilisateur - 0 = tous (ADMIN), > 0 = un caissier précis
   */
  async getRapportEncaissements(
    idStructure: number,
    dateDebut: string,
    dateFin: string,
    idUtilisateur: number = 0
  ): Promise<RapportEncaissements> {
    // Les dates partent en interpolation SQL : on refuse tout ce qui n'est pas
    // une date ISO stricte plutôt que de concaténer une chaîne arbitraire.
    if (!FORMAT_DATE_ISO.test(dateDebut) || !FORMAT_DATE_ISO.test(dateFin)) {
      throw new Error(`Dates invalides (format attendu YYYY-MM-DD) : ${dateDebut} → ${dateFin}`);
    }

    const pidStructure = Number(idStructure);
    const pidUtilisateur = Number(idUtilisateur) || 0;

    if (!Number.isFinite(pidStructure) || pidStructure <= 0) {
      throw new Error(`ID structure invalide : ${idStructure}`);
    }

    try {
      const requete = `SELECT public.get_rapport_encaissements(${pidStructure}, '${dateDebut}', '${dateFin}', ${pidUtilisateur})`;

      console.log('💰 [RECU-SERVICE] Appel get_rapport_encaissements:', {
        idStructure: pidStructure,
        dateDebut,
        dateFin,
        idUtilisateur: pidUtilisateur
      });

      const result = await this.executerRequete(requete);

      let functionResponse: Partial<RapportEncaissements> | null = null;

      if (result?.datas && result.datas.length > 0) {
        const rawResult = result.datas[0];
        const jsonData = rawResult.get_rapport_encaissements ?? Object.values(rawResult)[0];

        // PostgreSQL peut renvoyer une chaîne JSON ou un objet déjà parsé.
        if (typeof jsonData === 'string') {
          try {
            functionResponse = JSON.parse(jsonData);
          } catch {
            console.error('❌ [RECU-SERVICE] Erreur parsing JSON get_rapport_encaissements');
          }
        } else if (jsonData && typeof jsonData === 'object') {
          functionResponse = jsonData as Partial<RapportEncaissements>;
        }
      }

      const modesRetournes = Array.isArray(functionResponse?.modes) ? functionResponse.modes : [];

      return {
        periode: functionResponse?.periode ?? { date_debut: dateDebut, date_fin: dateFin },
        id_utilisateur: functionResponse?.id_utilisateur ?? pidUtilisateur,
        modes: this.completerModesManquants(modesRetournes),
        total: functionResponse?.total ?? { nb_paiements: 0, montant_total: 0 }
      };

    } catch (error: unknown) {
      console.error('❌ [RECU-SERVICE] Erreur rapport encaissements:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Erreur lors de la récupération des encaissements'
      );
    }
  }

  /**
   * Complète les modes principaux absents du retour SQL avec des compteurs à
   * zéro, dans un ordre d'affichage stable (CASH, OM, WAVE, FREE, puis AUTRES).
   * `AUTRES` (bucket legacy) n'est conservé que s'il porte des encaissements.
   */
  private completerModesManquants(modes: EncaissementParMode[]): EncaissementParMode[] {
    const parMode = new Map<ModePaiementNormalise, EncaissementParMode>();

    for (const entree of modes) {
      if (!entree?.mode) continue;
      parMode.set(entree.mode, {
        mode: entree.mode,
        nb_paiements: Number(entree.nb_paiements) || 0,
        montant_total: Number(entree.montant_total) || 0
      });
    }

    const resultat: EncaissementParMode[] = MODES_PAIEMENT_PRINCIPAUX.map(
      (mode) => parMode.get(mode) ?? { mode, nb_paiements: 0, montant_total: 0 }
    );

    const autres = parMode.get('AUTRES');
    if (autres && (autres.nb_paiements > 0 || autres.montant_total > 0)) {
      resultat.push(autres);
    }

    return resultat;
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
   * Génère l'URL canonique de facture publique à utiliser dans les notifications
   * WhatsApp (template `achat_confirme_ok`).
   *
   * ⚠️ Le template Meta exige une URL commençant exactement par
   * `https://fayclick.com/facture` (whitelist URL du bouton). Toute autre
   * variante (`v2.fayclick.net`, `localhost`, `/recu`, etc.) est rejetée par
   * Meta avec HTTP 400 INVALID_REQUEST.
   *
   * Comportement utilisateur final : la page `/facture?token=...` détecte
   * automatiquement si la facture est payée et redirige vers `/recu?token=...`
   * → le marchand arrive bien sur le reçu en cliquant le bouton WhatsApp.
   *
   * @param idStructure - ID de la structure
   * @param idFacture - ID de la facture
   * @returns URL canonique fixe (production), indépendante de window.location
   */
  generateUrlFactureCanonique(idStructure: number, idFacture: number): string {
    const params = btoa(`${idStructure}:${idFacture}`);
    return `https://fayclick.com/facture?token=${params}`;
  }

}

// Export de l'instance singleton
export const recuService = new RecuService();
export default recuService;