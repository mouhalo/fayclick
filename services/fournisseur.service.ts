/**
 * Service de gestion des Fournisseurs (EPIC 1 — comptes prives)
 *
 * Source de verite : docs/dba/fournisseur-spec.md (v1.0)
 *
 * Pattern : singleton, cache 5 min sur getListFournisseurs, invalidation apres mutations.
 * Securite : id_structure obligatoire (depuis authService.getUser()).
 * Errors  : FournisseurApiException (statusCode + originalError).
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import {
  CreateFournisseurInput,
  CreateFournisseurResponse,
  EditFournisseurInput,
  Fournisseur,
  FournisseurActionResponse,
  FournisseurListResponse,
} from '@/types/fournisseur';

export class FournisseurApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: unknown) {
    super(message);
    this.name = 'FournisseurApiException';
  }
}

class FournisseurService {
  private static instance: FournisseurService;
  private listCache: { data: FournisseurListResponse | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 min

  static getInstance(): FournisseurService {
    if (!this.instance) {
      this.instance = new FournisseurService();
    }
    return this.instance;
  }

  /**
   * Invalider le cache liste (a appeler apres chaque mutation)
   */
  invalidateCache(): void {
    this.listCache = { data: null, timestamp: 0 };
  }

  /**
   * Echapper une string SQL (anti-injection)
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Construire une expression SQL : 'valeur escapee' ou NULL
   */
  private toSqlStringOrNull(value: string | undefined | null): string {
    if (value === undefined || value === null || value === '') return 'NULL';
    return `'${this.escapeSql(value)}'`;
  }

  // ============================================================================
  // CREATE
  // ============================================================================

  /**
   * Creer un nouveau fournisseur
   * @throws FournisseurApiException si user non authentifie, nom vide, ou erreur PG
   */
  async createFournisseur(data: CreateFournisseurInput): Promise<CreateFournisseurResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new FournisseurApiException('Utilisateur non authentifie', 401);

      if (!data.nom_fournisseur || data.nom_fournisseur.trim() === '') {
        throw new FournisseurApiException('Le nom du fournisseur est obligatoire', 400);
      }

      const nom = this.toSqlStringOrNull(data.nom_fournisseur.trim());
      const tel = this.toSqlStringOrNull(data.tel_fournisseur);
      const email = this.toSqlStringOrNull(data.email_fournisseur);
      const adresse = this.toSqlStringOrNull(data.adresse);
      const ninea = this.toSqlStringOrNull(data.ninea);
      const notes = this.toSqlStringOrNull(data.notes);

      const query = `SELECT create_fournisseur(
        ${user.id_structure},
        ${nom},
        ${tel},
        ${email},
        ${adresse},
        ${ninea},
        ${notes}
      )`;

      SecurityService.secureLog('log', 'Creation fournisseur', {
        id_structure: user.id_structure,
        nom_fournisseur: data.nom_fournisseur,
      });

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new FournisseurApiException('Aucune reponse de create_fournisseur', 500);
      }

      const raw = (result[0] as Record<string, unknown>).create_fournisseur;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new FournisseurApiException(parsed.message || 'Erreur creation fournisseur', 400);
      }

      this.invalidateCache();

      SecurityService.secureLog('log', 'Fournisseur cree', {
        id_fournisseur: parsed.id_fournisseur,
      });

      return parsed as CreateFournisseurResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur creation fournisseur', error);
      if (error instanceof FournisseurApiException) throw error;
      throw new FournisseurApiException('Impossible de creer le fournisseur', 500, error);
    }
  }

  // ============================================================================
  // EDIT
  // ============================================================================

  /**
   * Modifier un fournisseur existant.
   * Tous les champs sont optionnels — NULL = inchange (COALESCE cote PG).
   * @throws FournisseurApiException si user non authentifie, acces refuse, ou erreur PG
   */
  async editFournisseur(
    idFournisseur: number,
    data: EditFournisseurInput
  ): Promise<FournisseurActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new FournisseurApiException('Utilisateur non authentifie', 401);

      // Le nom ne doit jamais etre vide string (PG attend NULL pour conserver)
      const nom = data.nom_fournisseur !== undefined && data.nom_fournisseur.trim() !== ''
        ? this.toSqlStringOrNull(data.nom_fournisseur.trim())
        : 'NULL';
      const tel = data.tel_fournisseur !== undefined ? this.toSqlStringOrNull(data.tel_fournisseur) : 'NULL';
      const email = data.email_fournisseur !== undefined ? this.toSqlStringOrNull(data.email_fournisseur) : 'NULL';
      const adresse = data.adresse !== undefined ? this.toSqlStringOrNull(data.adresse) : 'NULL';
      const ninea = data.ninea !== undefined ? this.toSqlStringOrNull(data.ninea) : 'NULL';
      const notes = data.notes !== undefined ? this.toSqlStringOrNull(data.notes) : 'NULL';

      const query = `SELECT edit_fournisseur(
        ${idFournisseur},
        ${user.id_structure},
        ${nom},
        ${tel},
        ${email},
        ${adresse},
        ${ninea},
        ${notes}
      )`;

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new FournisseurApiException('Aucune reponse de edit_fournisseur', 500);
      }

      const raw = (result[0] as Record<string, unknown>).edit_fournisseur;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new FournisseurApiException(parsed.message || 'Erreur modification fournisseur', 400);
      }

      this.invalidateCache();
      return parsed as FournisseurActionResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur edition fournisseur', error);
      if (error instanceof FournisseurApiException) throw error;
      throw new FournisseurApiException('Impossible de modifier le fournisseur', 500, error);
    }
  }

  // ============================================================================
  // DELETE (soft delete — actif=FALSE)
  // ============================================================================

  /**
   * Desactiver un fournisseur (soft delete via actif=FALSE).
   * En Phase 2, sera bloque si le fournisseur a des BC actifs (id_etat != 4).
   * @throws FournisseurApiException
   */
  async deleteFournisseur(idFournisseur: number): Promise<FournisseurActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new FournisseurApiException('Utilisateur non authentifie', 401);

      const query = `SELECT delete_fournisseur(${idFournisseur}, ${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        throw new FournisseurApiException('Aucune reponse de delete_fournisseur', 500);
      }

      const raw = (result[0] as Record<string, unknown>).delete_fournisseur;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new FournisseurApiException(parsed.message || 'Erreur suppression fournisseur', 400);
      }

      this.invalidateCache();
      return parsed as FournisseurActionResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression fournisseur', error);
      if (error instanceof FournisseurApiException) throw error;
      throw new FournisseurApiException('Impossible de supprimer le fournisseur', 500, error);
    }
  }

  // ============================================================================
  // LIST (avec cache 5 min)
  // ============================================================================

  /**
   * Lister les fournisseurs actifs de la structure courante.
   * Cache 5 min — utiliser forceRefresh=true apres une mutation manuelle.
   */
  async getListFournisseurs(forceRefresh: boolean = false): Promise<FournisseurListResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new FournisseurApiException('Utilisateur non authentifie', 401);

      // Cache check
      if (
        !forceRefresh &&
        this.listCache.data &&
        Date.now() - this.listCache.timestamp < this.CACHE_DURATION
      ) {
        return this.listCache.data;
      }

      const query = `SELECT get_list_fournisseurs(${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        const empty: FournisseurListResponse = {
          success: true,
          fournisseurs: [],
          resume: { total_fournisseurs: 0 },
        };
        this.listCache = { data: empty, timestamp: Date.now() };
        return empty;
      }

      const raw = (result[0] as Record<string, unknown>).get_list_fournisseurs;
      const parsed: FournisseurListResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Filet de securite : si PG renvoie null ou structure inattendue
      const normalized: FournisseurListResponse = {
        success: parsed?.success ?? true,
        fournisseurs: Array.isArray(parsed?.fournisseurs) ? parsed.fournisseurs : [],
        resume: parsed?.resume ?? { total_fournisseurs: 0 },
      };

      this.listCache = { data: normalized, timestamp: Date.now() };
      return normalized;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur liste fournisseurs', error);
      if (error instanceof FournisseurApiException) throw error;
      throw new FournisseurApiException('Impossible de recuperer les fournisseurs', 500, error);
    }
  }

  /**
   * Recherche locale sur le cache (insensible casse + accents).
   * Utilisable depuis ModalGestionFournisseurs (Phase 4) sans nouvel appel PG.
   */
  searchFournisseurByName(query: string): Fournisseur[] {
    if (!this.listCache.data) return [];
    const needle = this.normalizeForSearch(query);
    if (!needle) return this.listCache.data.fournisseurs;
    return this.listCache.data.fournisseurs.filter((f) =>
      this.normalizeForSearch(f.nom_fournisseur).includes(needle)
    );
  }

  private normalizeForSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritiques
      .toLowerCase()
      .trim();
  }
}

// Export singleton — l'import par defaut EST l'instance, pas la classe
export const fournisseurService = FournisseurService.getInstance();
export default fournisseurService;
