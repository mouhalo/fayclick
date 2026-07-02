/**
 * Service de gestion des reversements (Réseau Distribution) — Stage B3.4
 *
 * Fonctions PG sous-jacentes (signatures prod actuelles) :
 *   - declarer_reversement(p_id_rep, p_montant, p_mode_paiement, p_reference DEFAULT NULL, p_commentaire DEFAULT NULL)
 *     ⚠️ PAS de p_id_structure (dérivé côté serveur à partir du représentant)
 *   - valider_reversement(p_id_reversement, p_id_admin, p_decision, p_commentaire DEFAULT NULL)
 *   - get_reversements_structure(p_id_structure, p_statut DEFAULT NULL, p_id_representant DEFAULT NULL)
 *   - get_solde_reversement_rep(p_id_rep)
 *     ⚠️ Ne renvoie JAMAIS success:false (dégrade à 0 si le rep n'est pas en mode LIBRE)
 *
 * Pattern miroir des autres services (singleton + parsing robuste + échappement SQL).
 */

import DatabaseService from './database.service';
import {
  DeclarerReversementParams,
  ValiderReversementParams,
  ReversementOperationResponse,
  ReversementsListResponse,
  ReversementData,
  SoldeReversementRep,
  StatutReversement,
} from '@/types/reversement';

const MODES_PAIEMENT_VALIDES = ['CASH', 'OM', 'WAVE', 'FREE', 'VIREMENT'];
const DECISIONS_VALIDES = ['VALIDE', 'REJETE'];

class ReversementService {
  private static instance: ReversementService;

  static getInstance(): ReversementService {
    if (!this.instance) {
      this.instance = new ReversementService();
    }
    return this.instance;
  }

  private esc(value?: string): string {
    if (!value) return 'NULL';
    return `'${value.replace(/'/g, "''")}'`;
  }

  // ────────────────────────────────────────────────────────────
  // DÉCLARATION (côté rep)
  // ────────────────────────────────────────────────────────────

  async declarer(params: DeclarerReversementParams): Promise<ReversementOperationResponse> {
    if (!params.id_representant || params.id_representant <= 0) {
      throw new Error('Identifiant représentant invalide');
    }
    if (!params.montant || params.montant <= 0) {
      throw new Error('Le montant doit être strictement positif');
    }
    if (!MODES_PAIEMENT_VALIDES.includes(params.mode_paiement)) {
      throw new Error('Mode de paiement invalide');
    }

    // ⚠️ Pas de p_id_structure : declarer_reversement le dérive côté serveur
    const query = `SELECT * FROM declarer_reversement(
      ${params.id_representant},
      ${params.montant},
      '${params.mode_paiement}',
      ${this.esc(params.reference_transaction)},
      ${this.esc(params.commentaire)}
    );`;

    try {
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'declarer_reversement');
    } catch (error) {
      console.error('[REVERSEMENT] Erreur declarer:', error);
      throw new Error(
        `Impossible de déclarer le reversement: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // VALIDATION (côté admin, réutilisé plus tard)
  // ────────────────────────────────────────────────────────────

  async valider(params: ValiderReversementParams): Promise<ReversementOperationResponse> {
    if (!params.id_admin || params.id_admin <= 0) {
      throw new Error('Identifiant admin invalide');
    }
    if (!DECISIONS_VALIDES.includes(params.decision)) {
      throw new Error('Décision invalide');
    }
    if (params.decision === 'REJETE' && !params.commentaire) {
      throw new Error('Un commentaire est obligatoire pour rejeter un reversement');
    }

    const query = `SELECT * FROM valider_reversement(
      ${params.id_reversement},
      ${params.id_admin},
      '${params.decision}',
      ${this.esc(params.commentaire)}
    );`;

    try {
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'valider_reversement');
    } catch (error) {
      console.error('[REVERSEMENT] Erreur valider:', error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────
  // LIST (admin + rep)
  // ────────────────────────────────────────────────────────────

  /**
   * Liste des reversements pour une structure (admin), filtrable par statut/rep
   * @param id_structure Structure courante
   * @param filters Filtres optionnels
   */
  async list(
    id_structure: number,
    filters?: {
      statut?: StatutReversement;
      id_representant?: number;
    }
  ): Promise<ReversementsListResponse> {
    const statut = filters?.statut ? `'${filters.statut}'` : 'NULL';
    const idRep =
      filters?.id_representant !== undefined ? filters.id_representant.toString() : 'NULL';

    const query = `SELECT * FROM get_reversements_structure(${id_structure}, ${statut}, ${idRep});`;
    try {
      const results = await DatabaseService.query(query);
      return this.parseListResponse(results);
    } catch (error) {
      console.error('[REVERSEMENT] Erreur list:', error);
      throw new Error(
        `Impossible de récupérer les reversements: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // SOLDE
  // ────────────────────────────────────────────────────────────

  /**
   * Solde dû d'un représentant.
   * ⚠️ get_solde_reversement_rep ne renvoie jamais success:false : si le rep
   * n'est pas en mode_encaissement LIBRE (ou est inactif), les montants sont
   * dégradés à 0. On ne retourne null que si la réponse est absente/illisible.
   */
  async getSolde(id_rep: number): Promise<SoldeReversementRep | null> {
    const query = `SELECT * FROM get_solde_reversement_rep(${id_rep});`;
    try {
      const results = await DatabaseService.query(query);
      if (!Array.isArray(results) || results.length === 0) return null;
      const first = results[0] as Record<string, unknown>;

      let parsed: unknown = first;
      if ('get_solde_reversement_rep' in first) {
        const raw = first.get_solde_reversement_rep;
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }

      if (parsed && typeof parsed === 'object') {
        return parsed as SoldeReversementRep;
      }
      return null;
    } catch (error) {
      console.error('[REVERSEMENT] Erreur getSolde:', error);
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────
  // PARSING
  // ────────────────────────────────────────────────────────────

  /**
   * get_reversements_structure retourne { success, data: { reversements: [...], total } }
   */
  private parseListResponse(results: unknown): ReversementsListResponse {
    const empty: ReversementsListResponse = { success: true, data: { reversements: [], total: 0 } };
    if (!Array.isArray(results) || results.length === 0) return empty;

    const first = results[0] as Record<string, unknown>;
    let parsed: unknown = first;
    if ('get_reversements_structure' in first) {
      const raw = first.get_reversements_structure;
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    if (!parsed || typeof parsed !== 'object') return empty;
    const obj = parsed as Record<string, unknown>;

    // Forme attendue : { success, data: { reversements: [...], total } }
    const dataObj =
      obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj;

    let reversements: ReversementData[] = [];
    if (Array.isArray(dataObj.reversements)) {
      reversements = dataObj.reversements as ReversementData[];
    } else if (Array.isArray(obj.reversements)) {
      reversements = obj.reversements as ReversementData[];
    } else if (Array.isArray(obj.data)) {
      // Fallback défensif : ancien format data = tableau direct
      reversements = obj.data as ReversementData[];
    }

    const total =
      typeof dataObj.total === 'number'
        ? dataObj.total
        : typeof obj.total === 'number'
          ? (obj.total as number)
          : reversements.length;

    return {
      success: obj.success !== false,
      message: typeof obj.message === 'string' ? obj.message : undefined,
      data: { reversements, total },
    };
  }

  private parseOperationResponse(
    results: unknown,
    fnName: string
  ): ReversementOperationResponse {
    if (!Array.isArray(results) || results.length === 0) {
      return { success: false, message: 'Aucune réponse du serveur' };
    }
    const first = results[0] as Record<string, unknown>;
    if (fnName in first) {
      const raw = first[fnName];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        return parsed as ReversementOperationResponse;
      }
    }
    if ('success' in first || 'message' in first) {
      return first as unknown as ReversementOperationResponse;
    }
    return { success: false, message: 'Format de réponse non reconnu' };
  }
}

export default ReversementService.getInstance();
