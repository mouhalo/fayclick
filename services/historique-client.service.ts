/**
 * Service Historique Client Public — accès aux achats d'un client par téléphone.
 *
 * Aucune authentification requise. La sécurité est assurée par :
 *   1. Un OTP WhatsApp validé en amont côté frontend (cf. PRD § 3.3)
 *   2. La vérification PG dans `anonymiser_achat_client` qui s'assure que
 *      le téléphone correspond bien à la facture cible (anti-énumération).
 *
 * Pattern :
 *   - Singleton (cohérent avec auth.service, catalogue-public.service, etc.)
 *   - Appels SQL bruts via `databaseService.query(...)` (pas de prepared statements
 *     dans ce projet — escape manuel des quotes)
 *   - JSON PostgreSQL : toujours vérifier `typeof === 'string'` avant `JSON.parse()`
 *   - Logs : masquage du téléphone via `SecurityService.secureLog`
 *
 * Fonctions PG ciblées (déployées par le DBA en parallèle — Task #18) :
 *   - get_historique_achats_client(p_telephone, p_limit, p_offset, p_id_structure_filter)
 *   - anonymiser_achat_client(p_id_facture, p_telephone)
 *
 * Voir : docs/prd-historique-client-public-2026-05-02.md
 *
 * @module services/historique-client.service
 */

import DatabaseService from './database.service';
import SecurityService from './security.service';
import type {
  GetHistoriqueParams,
  HistoriqueAchatsResponse,
  HistoriqueAchatsData,
  AnonymiserAchatResponse,
  AnonymiserAchatData,
} from '@/types/historique';

/** Exception dédiée au module historique (statusCode HTTP-like pour la couche UI). */
export class HistoriqueClientException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'HistoriqueClientException';
  }
}

class HistoriqueClientService {
  private static instance: HistoriqueClientService;

  static getInstance(): HistoriqueClientService {
    if (!this.instance) {
      this.instance = new HistoriqueClientService();
    }
    return this.instance;
  }

  // -------------------------------------------------------------------------
  // Helpers internes
  // -------------------------------------------------------------------------

  /**
   * Valide un numéro de téléphone : 9 chiffres SN (commence par 7)
   * OU format E.164 (`+` suivi de 8 à 15 chiffres).
   *
   * Le backend matche `tel_client` en strict — c'est à l'appelant de fournir
   * la même variante que celle stockée en BD (typiquement les 9 chiffres SN).
   */
  private validateTelephone(telephone: string): string {
    if (!telephone || typeof telephone !== 'string') {
      throw new HistoriqueClientException('Téléphone requis', 400);
    }
    const trimmed = telephone.trim();
    const isSN9 = /^7\d{8}$/.test(trimmed);
    const isE164 = /^\+\d{8,15}$/.test(trimmed);
    if (!isSN9 && !isE164) {
      throw new HistoriqueClientException('Format de téléphone invalide', 400);
    }
    return trimmed;
  }

  /**
   * Masque un téléphone pour les logs (garde 3 premiers + 2 derniers).
   * Ex: "771234567" -> "771****67"
   */
  private maskTelephone(telephone: string): string {
    if (!telephone) return '';
    if (telephone.length <= 5) return '***';
    return `${telephone.slice(0, 3)}****${telephone.slice(-2)}`;
  }

  /**
   * Échappement SQL minimal pour les strings (doublement des single quotes).
   * Le projet n'utilise PAS de prepared statements — c'est le pattern
   * appliqué partout dans services/ (cf. auth.service, catalogue-public.service, etc.).
   */
  private escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Parse le payload JSON renvoyé par une fonction PG.
   * PostgreSQL peut retourner soit un objet JSON natif, soit une chaîne JSON
   * selon la couche de transport — toujours vérifier le type.
   */
  private parsePgJson<T>(raw: unknown): T {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch (e) {
        SecurityService.secureLog('error', '[HISTORIQUE] Parsing JSON PG échoué', {
          error: e instanceof Error ? e.message : 'unknown',
        });
        throw new HistoriqueClientException('Format de réponse invalide', 500);
      }
    }
    return raw as T;
  }

  // -------------------------------------------------------------------------
  // API publique
  // -------------------------------------------------------------------------

  /**
   * Récupère l'historique paginé des achats d'un client.
   *
   * Aucune authentification requise — la sécurité est assurée par l'OTP en amont.
   * Les achats déjà anonymisés (tel_client === '771234567') sont automatiquement
   * exclus côté PG.
   *
   * @param params - Téléphone obligatoire + limit/offset/filtre boutique optionnels
   * @returns Réponse typée avec liste d'achats, boutiques distinctes, pagination
   * @throws HistoriqueClientException si validation ou erreur réseau/SQL
   *
   * @example
   * ```ts
   * const res = await historiqueClientService.getHistoriqueAchats({
   *   telephone: '771234567',
   *   limit: 20,
   *   offset: 0,
   * });
   * if (res.success && res.data) {
   *   console.log(`${res.data.achats.length} achats sur ${res.data.pagination.total}`);
   * }
   * ```
   */
  async getHistoriqueAchats(
    params: GetHistoriqueParams
  ): Promise<HistoriqueAchatsResponse> {
    try {
      // 1. Validation entrée
      const telephone = this.validateTelephone(params.telephone);
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;

      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        throw new HistoriqueClientException('Paramètre limit invalide (1..200)', 400);
      }
      if (!Number.isInteger(offset) || offset < 0) {
        throw new HistoriqueClientException('Paramètre offset invalide', 400);
      }

      const filterRaw = params.id_structure_filter;
      let filterSql: string;
      if (filterRaw === null || filterRaw === undefined) {
        filterSql = 'NULL';
      } else {
        if (!Number.isInteger(filterRaw) || filterRaw <= 0) {
          throw new HistoriqueClientException('Filtre boutique invalide', 400);
        }
        filterSql = String(filterRaw);
      }

      // 2. Construction requête (escape strict)
      const telSql = this.escapeSqlString(telephone);
      const query = `SELECT get_historique_achats_client('${telSql}', ${limit}, ${offset}, ${filterSql}) AS payload`;

      SecurityService.secureLog('log', '[HISTORIQUE] getHistoriqueAchats', {
        telephone: this.maskTelephone(telephone),
        limit,
        offset,
        id_structure_filter: filterRaw ?? null,
      });

      // 3. Appel PG
      const rows = await DatabaseService.query<{ payload: unknown }>(query);

      if (!rows || rows.length === 0) {
        // La fonction PG renvoie toujours au moins une ligne — un vide ici
        // signale plutôt un souci backend (fonction non déployée ?).
        return {
          success: false,
          message: 'Aucune réponse du serveur',
        };
      }

      const rawPayload = (rows[0] as Record<string, unknown>).payload
        ?? (rows[0] as Record<string, unknown>).get_historique_achats_client
        ?? rows[0];

      const parsed = this.parsePgJson<HistoriqueAchatsResponse>(rawPayload);

      // 4. Validation structure réponse
      if (!parsed || typeof parsed !== 'object') {
        throw new HistoriqueClientException('Format de réponse invalide', 500);
      }

      // Erreur métier remontée par la fonction PG
      if (parsed.success === false) {
        return parsed;
      }

      // Garde-fou : si success=true mais data manquant, normaliser
      if (parsed.success && !parsed.data) {
        const emptyData: HistoriqueAchatsData = {
          achats: [],
          boutiques: [],
          pagination: { total: 0, limit, offset, has_more: false },
        };
        return { success: true, data: emptyData };
      }

      return parsed;
    } catch (error) {
      if (error instanceof HistoriqueClientException) {
        throw error;
      }
      SecurityService.secureLog('error', '[HISTORIQUE] getHistoriqueAchats échec', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw new HistoriqueClientException(
        'Impossible de récupérer l\'historique',
        500
      );
    }
  }

  /**
   * Anonymise un achat client pour qu'il disparaisse de son historique.
   *
   * Côté PG :
   *   - `facture_com.tel_client` -> '771234567' (sentinelle)
   *   - `facture_com.nom_client` -> 'CLIENT_ANONYME'
   *   - `recus_paiement.numero_telephone` -> '771234567'
   *
   * Sécurité : la fonction PG vérifie que `p_telephone` correspond bien au
   * `tel_client` actuel de la facture. Un attaquant ne peut donc pas anonymiser
   * une facture qui ne lui appartient pas, même s'il connaît son `id_facture`.
   *
   * Le commerçant conserve la trace comptable (montant, articles, etc.) — seul
   * l'identifiant client est masqué.
   *
   * @param idFacture - ID de la facture à anonymiser
   * @param telephone - Téléphone du propriétaire (doit matcher la BD)
   * @throws HistoriqueClientException si validation ou erreur réseau/SQL
   *
   * @example
   * ```ts
   * const res = await historiqueClientService.anonymiserAchat(1289, '771234567');
   * if (res.success) {
   *   // Refresh la liste — l'achat n'apparaîtra plus
   * }
   * ```
   */
  async anonymiserAchat(
    idFacture: number,
    telephone: string
  ): Promise<AnonymiserAchatResponse> {
    try {
      // 1. Validation entrée
      if (!Number.isInteger(idFacture) || idFacture <= 0) {
        throw new HistoriqueClientException('ID facture invalide', 400);
      }
      const tel = this.validateTelephone(telephone);

      // 2. Construction requête
      const telSql = this.escapeSqlString(tel);
      const query = `SELECT anonymiser_achat_client(${idFacture}, '${telSql}') AS payload`;

      SecurityService.secureLog('log', '[HISTORIQUE] anonymiserAchat', {
        id_facture: idFacture,
        telephone: this.maskTelephone(tel),
      });

      // 3. Appel PG
      const rows = await DatabaseService.query<{ payload: unknown }>(query);

      if (!rows || rows.length === 0) {
        return {
          success: false,
          message: 'Aucune réponse du serveur',
        };
      }

      const rawPayload = (rows[0] as Record<string, unknown>).payload
        ?? (rows[0] as Record<string, unknown>).anonymiser_achat_client
        ?? rows[0];

      const parsed = this.parsePgJson<AnonymiserAchatResponse>(rawPayload);

      if (!parsed || typeof parsed !== 'object') {
        throw new HistoriqueClientException('Format de réponse invalide', 500);
      }

      // Normaliser : garantir présence de `message`
      if (!parsed.message) {
        parsed.message = parsed.success
          ? 'Achat anonymisé avec succès'
          : 'Anonymisation impossible';
      }

      // Si success mais data manquant, fournir un fallback minimal
      if (parsed.success && !parsed.data) {
        const fallbackData: AnonymiserAchatData = {
          id_facture: idFacture,
          id_structure: 0,
        };
        parsed.data = fallbackData;
      }

      return parsed;
    } catch (error) {
      if (error instanceof HistoriqueClientException) {
        throw error;
      }
      SecurityService.secureLog('error', '[HISTORIQUE] anonymiserAchat échec', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw new HistoriqueClientException(
        'Impossible d\'anonymiser l\'achat',
        500
      );
    }
  }
}

export const historiqueClientService = HistoriqueClientService.getInstance();
export default historiqueClientService;
