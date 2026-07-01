/**
 * Service de gestion des Représentants (module Réseau Distribution — Stage A)
 *
 * Pattern miroir de users.service.ts mais dédié au profil REPRESENTANT.
 * Fonctions PG sous-jacentes (signatures PROD réconciliées) :
 *   - get_representants_structure(pid_structure, pactifs_seul)
 *   - create_representant(...) / modifier_representant(...)
 *   - suspendre_representant(id_structure, id_representant, id_admin)
 *   - reactiver_representant(id_structure, id_representant, id_admin)
 *   - reinitialiser_pwd_representant_auto(id_structure, id_representant, id_admin)
 *   - get_localites_disponibles()
 *
 * Gating métier : ce service n'est utilisable que si la structure a
 * `compte_distributeur=true` dans param_structure. Le filtrage UI est
 * réalisé dans les composants (cf. RepresentantsManagement).
 *
 * Cf. docs/superpowers/plans/2026-07-01-representants-stage-a.md
 */

import DatabaseService from './database.service';
import {
  RepresentantData,
  RepresentantsListResponse,
  CreateRepresentantParams,
  RepresentantOperationResponse,
  ToggleRepresentantActifParams,
  ResetPwdRepresentantParams,
  LocaliteRep,
} from '@/types/representant';

class RepresentantService {
  private static instance: RepresentantService;

  static getInstance(): RepresentantService {
    if (!this.instance) {
      this.instance = new RepresentantService();
    }
    return this.instance;
  }

  // ────────────────────────────────────────────────────────────
  // LOCALITÉS DISPONIBLES (pour dropdown)
  // ────────────────────────────────────────────────────────────

  /**
   * Récupère la liste des localités disponibles (pour dropdown création rep)
   * SELECT * FROM get_localites_disponibles()
   * Retourne : id_localite, nom_localite, nom_commune, nom_departement, nom_region
   *
   * Parser ultra-défensif : supporte 4 formats PG possibles :
   *   A. RETURNS TABLE(...) → SELECT * retourne [{ id_localite, nom_localite, ... }, ...]
   *   B. RETURNS JSON array → [{ get_localites_disponibles: [{...}, {...}] }]
   *   C. RETURNS JSON object → [{ get_localites_disponibles: { data: [...] } }]
   *   D. RETURNS SETOF record sans aliases → fallback en lisant les premières colonnes
   */
  async getLocalites(): Promise<LocaliteRep[]> {
    try {
      const query = `SELECT * FROM get_localites_disponibles();`;
      const results = await DatabaseService.query(query);
      console.log('[REPRESENTANT SERVICE] getLocalites results brut:', results);

      if (!Array.isArray(results) || results.length === 0) {
        console.warn('[REPRESENTANT SERVICE] getLocalites: results vide ou non-array');
        return [];
      }

      const first = results[0] as Record<string, unknown>;
      console.log('[REPRESENTANT SERVICE] getLocalites first row keys:', Object.keys(first));

      // Cas B/C : la clé porte le nom de la fonction
      if ('get_localites_disponibles' in first) {
        const raw = first.get_localites_disponibles;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          console.log('[REPRESENTANT SERVICE] getLocalites format B (JSON array):', parsed.length);
          return parsed as LocaliteRep[];
        }
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>;
          for (const key of ['data', 'localites', 'list', 'results', 'rows']) {
            if (Array.isArray(obj[key])) {
              console.log(
                `[REPRESENTANT SERVICE] getLocalites format C wrapper.${key}:`,
                (obj[key] as unknown[]).length
              );
              return obj[key] as LocaliteRep[];
            }
          }
        }
        console.warn('[REPRESENTANT SERVICE] getLocalites: format inattendu dans clé fonction', parsed);
        return [];
      }

      // Cas A : TABLE → results contient directement les lignes
      // Vérifier que les colonnes attendues sont présentes
      if ('id_localite' in first || 'nom_localite' in first) {
        console.log(`[REPRESENTANT SERVICE] getLocalites format A (TABLE): ${results.length} lignes`);
        return results as LocaliteRep[];
      }

      // Cas D : SETOF record sans aliases — les colonnes peuvent être nommées col1, col2, ...
      console.warn(
        '[REPRESENTANT SERVICE] getLocalites: format SETOF record sans aliases ? Premières clés :',
        Object.keys(first)
      );
      return [];
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur getLocalites:', error);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // LIST
  // ────────────────────────────────────────────────────────────

  /**
   * Récupère la liste des représentants d'une structure (suspendus inclus)
   * SELECT * FROM get_representants_structure(pid_structure, false)
   */
  async getRepresentants(id_structure: number): Promise<RepresentantsListResponse> {
    try {
      const query = `SELECT * FROM get_representants_structure(${id_structure}, false);`;
      const results = await DatabaseService.query(query);
      return this.parseListResponse(results);
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur getRepresentants:', error);
      throw new Error(
        `Impossible de récupérer les représentants: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // CREATE / EDIT
  // ────────────────────────────────────────────────────────────

  /**
   * Crée ou modifie un représentant.
   * - Si `id_user` est 0 ou omis → création via create_representant (PG renvoie password_initial)
   * - Si `id_user` > 0 → modification via modifier_representant (id_user = ID du rep à modifier)
   *
   * Signature PG (PROD) — ordre exact des 10 args :
   *   (p_id_structure, p_username, p_tel_user, p_telephone_terrain,
   *    p_nom_rep, p_prenom_rep, p_email_rep,
   *    p_id_localite, p_mode_encaissement, p_id_user)
   *
   * NB : en édition, username/tel_user sont ignorés côté UPDATE PG (login non
   * modifiable) mais restent envoyés pour respecter la signature positionnelle.
   */
  async createOrEdit(
    params: CreateRepresentantParams
  ): Promise<RepresentantOperationResponse> {
    try {
      this.validateParams(params);

      const isEdit = !!params.id_user && params.id_user > 0;
      const fnName = isEdit ? 'modifier_representant' : 'create_representant';

      // Échappement strings
      const esc = (s: string | undefined) =>
        s === undefined || s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`;

      const args = [
        params.id_structure.toString(),
        esc(params.username),
        esc(params.telephone),
        esc(params.telephone_terrain),
        esc(params.nom_rep),
        esc(params.prenom_rep),
        esc(params.email_rep),
        params.id_localite.toString(),
        esc(params.mode_encaissement),
        (params.id_user ?? 0).toString(),
      ];

      const query = `SELECT * FROM ${fnName}(${args.join(', ')});`;
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, fnName);
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur createOrEdit:', error);
      throw new Error(
        `Impossible de ${params.id_user ? 'modifier' : 'créer'} le représentant: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // SUSPEND / REACTIVATE
  // ────────────────────────────────────────────────────────────

  /**
   * SELECT * FROM suspendre_representant(id_structure, id_representant, id_admin)
   * 3 args, pas de motif.
   */
  async suspendre(
    params: ToggleRepresentantActifParams
  ): Promise<RepresentantOperationResponse> {
    try {
      const { id_structure, id_representant, id_admin } = params;
      const query = `SELECT * FROM suspendre_representant(${id_structure}, ${id_representant}, ${id_admin});`;
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'suspendre_representant');
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur suspendre:', error);
      throw error;
    }
  }

  /**
   * SELECT * FROM reactiver_representant(id_structure, id_representant, id_admin)
   */
  async reactiver(
    params: ToggleRepresentantActifParams
  ): Promise<RepresentantOperationResponse> {
    try {
      const { id_structure, id_representant, id_admin } = params;
      const query = `SELECT * FROM reactiver_representant(${id_structure}, ${id_representant}, ${id_admin});`;
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'reactiver_representant');
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur reactiver:', error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────
  // RESET PWD
  // ────────────────────────────────────────────────────────────

  /**
   * SELECT * FROM reinitialiser_pwd_representant_auto(id_structure, id_representant, id_admin)
   * Génère un nouveau mot de passe automatiquement (pas d'envoi SMS ici).
   * Retourne data.new_password en clair — à révéler 1x côté UI, jamais loggé/persisté.
   */
  async resetPwd(
    params: ResetPwdRepresentantParams
  ): Promise<RepresentantOperationResponse> {
    try {
      const { id_structure, id_representant, id_admin } = params;
      const query = `SELECT * FROM reinitialiser_pwd_representant_auto(${id_structure}, ${id_representant}, ${id_admin});`;
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'reinitialiser_pwd_representant_auto');
    } catch (error) {
      console.error('[REPRESENTANT SERVICE] Erreur resetPwd:', error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────
  // VALIDATION
  // ────────────────────────────────────────────────────────────

  private validateParams(params: CreateRepresentantParams): void {
    if (!params.username || params.username.trim().length < 2) {
      throw new Error('Le username doit contenir au moins 2 caractères');
    }
    if (!params.telephone || !/^\d{9}$/.test(params.telephone)) {
      throw new Error('Le téléphone doit contenir 9 chiffres');
    }
    if (params.telephone_terrain && !/^\d{9}$/.test(params.telephone_terrain)) {
      throw new Error('Le téléphone terrain doit contenir 9 chiffres');
    }
    if (!params.nom_rep || params.nom_rep.trim().length < 2) {
      throw new Error('Le nom du représentant est requis');
    }
    if (!params.prenom_rep || params.prenom_rep.trim().length < 2) {
      throw new Error('Le prénom du représentant est requis');
    }
    if (!params.id_localite || params.id_localite <= 0) {
      throw new Error('La localité d\'affectation est obligatoire');
    }
    if (!['WALLET_STRUCTURE', 'LIBRE'].includes(params.mode_encaissement)) {
      throw new Error('Mode d\'encaissement invalide');
    }
    if (
      params.email_rep &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email_rep)
    ) {
      throw new Error('Email invalide');
    }
  }

  // ────────────────────────────────────────────────────────────
  // PARSING
  // ────────────────────────────────────────────────────────────

  /**
   * Mappe une ligne brute PG vers RepresentantData en normalisant les noms de clés.
   * PG peut renvoyer `id`/`id_user`/`id_representant` selon la fonction ; le type
   * front attend `id_representant`. Mapping non-destructif : conserve toutes les
   * autres clés brutes.
   */
  private normalizeRep(raw: unknown): RepresentantData {
    if (!raw || typeof raw !== 'object') return raw as RepresentantData;
    const r = raw as Record<string, unknown>;
    return {
      ...(r as unknown as RepresentantData),
      id_representant:
        (r.id_representant as number) ?? (r.id as number) ?? (r.id_user as number) ?? 0,
    };
  }

  private parseListResponse(results: unknown): RepresentantsListResponse {
    // Pattern PG : multiples formats possibles selon implémentation DBA
    //   A. results = [{ get_representants_structure: [<rep1>, <rep2>, ...] }]  (RETURNS JSON array)
    //   B. results = [{ get_representants_structure: '{"data": [...]}' }]      (RETURNS TEXT JSON)
    //   C. results = [{ get_representants_structure: { data: { representants: [...], total } } }] (niveau 2, format PROD)
    //   D. results = [{ ...rep1 }, { ...rep2 }]                                (RETURNS SETOF / TABLE)
    //
    // On tente d'extraire l'array dans plusieurs candidats de clés et on retourne
    // toujours { success, data: <array normalisé>, total? } pour le composant qui appelle .filter()
    if (!Array.isArray(results) || results.length === 0) {
      return { success: true, data: [] };
    }

    const first = results[0] as Record<string, unknown>;

    // Cas A/B/C : la clé porte le nom de la fonction
    if ('get_representants_structure' in first) {
      const raw = first.get_representants_structure;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // A : tableau direct
      if (Array.isArray(parsed)) {
        return { success: true, data: parsed.map((r) => this.normalizeRep(r)) };
      }

      // C : objet wrappeur — chercher la clé qui contient l'array (niveau 1 puis niveau 2)
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const arrayKeys = ['data', 'representants', 'list', 'results', 'rows'];

        // Niveau 1 : { data: [...] } ou { representants: [...] }
        for (const key of arrayKeys) {
          if (Array.isArray(obj[key])) {
            return {
              success: obj.success !== false,
              message: typeof obj.message === 'string' ? obj.message : undefined,
              data: (obj[key] as unknown[]).map((r) => this.normalizeRep(r)),
            };
          }
        }

        // Niveau 2 : { data: { representants: [...], total: N } } (format PG réel observé — PROD)
        for (const wrapperKey of arrayKeys) {
          const wrapper = obj[wrapperKey];
          if (wrapper && typeof wrapper === 'object' && !Array.isArray(wrapper)) {
            const inner = wrapper as Record<string, unknown>;
            for (const innerKey of arrayKeys) {
              if (Array.isArray(inner[innerKey])) {
                return {
                  success: obj.success !== false,
                  message: typeof obj.message === 'string' ? obj.message : undefined,
                  data: (inner[innerKey] as unknown[]).map((r) => this.normalizeRep(r)),
                  total: typeof inner.total === 'number' ? inner.total : undefined,
                };
              }
            }
          }
        }

        // Objet sans tableau identifiable → fallback safe
        console.warn('[REPRESENTANT SERVICE] Réponse JSON inattendue:', obj);
        return { success: true, data: [] };
      }

      // null/undefined/primitive
      return { success: true, data: [] };
    }

    // Cas D : SET OF / TABLE — chaque ligne est un representant
    return {
      success: true,
      data: (results as unknown[]).map((r) => this.normalizeRep(r)),
    };
  }

  private parseOperationResponse(
    results: unknown,
    fnName: string
  ): RepresentantOperationResponse {
    if (!Array.isArray(results) || results.length === 0) {
      return { success: false, message: 'Aucune réponse du serveur' };
    }
    const first = results[0] as Record<string, unknown>;

    // Cas A : la clé porte le nom de la fonction PG
    if (fnName in first) {
      const raw = first[fnName];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        return parsed as RepresentantOperationResponse;
      }
    }

    // Cas B : la fonction retourne directement les champs (TABLE)
    if ('success' in first || 'message' in first) {
      return first as unknown as RepresentantOperationResponse;
    }

    return { success: false, message: 'Format de réponse non reconnu' };
  }
}

export default RepresentantService.getInstance();
