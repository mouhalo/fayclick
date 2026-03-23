/**
 * Service Live Shopping
 * Gestion des lives marchands (creation, suppression, consultation)
 */

import {
  CreateLiveParams,
  CreateLiveResponse,
  DeleteLiveResponse,
  ActiveLiveResponse,
  LivesActifsResponse,
} from '@/types/live';

class LiveService {
  private static instance: LiveService;
  private livesActifsCache: LivesActifsResponse | null = null;
  private livesActifsCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  static getInstance(): LiveService {
    if (!this.instance) {
      this.instance = new LiveService();
    }
    return this.instance;
  }

  /**
   * Cree un live pour une structure avec ses produits
   * Les produits selectionnes passent a presente_au_public = true
   */
  async createLive(params: CreateLiveParams): Promise<CreateLiveResponse> {
    try {
      const database = (await import('./database.service')).default;

      // Formater le tableau de produits pour PostgreSQL : ARRAY[1,2,3]
      const produitsArray = `ARRAY[${params.produit_ids.join(',')}]::INTEGER[]`;

      const escapedNom = params.nom_du_live.replace(/'/g, "''");
      const tel1 = params.tel_contact1 ? `'${params.tel_contact1}'` : 'NULL';
      const tel2 = params.tel_contact2 ? `'${params.tel_contact2}'` : 'NULL';

      const query = `SELECT * FROM create_live(
        ${params.id_structure},
        '${params.date_debut}'::TIMESTAMP,
        '${params.date_fin}'::TIMESTAMP,
        '${escapedNom}',
        ${tel1},
        ${tel2},
        ${produitsArray}
      )`;

      const results = await database.query(query);

      if (results && results.length > 0) {
        const raw = (results[0] as Record<string, unknown>).create_live;
        const response = typeof raw === 'string' ? JSON.parse(raw) : raw;
        // Invalider le cache lives actifs
        this.invalidateLivesCache();
        return response as CreateLiveResponse;
      }

      return { success: false, message: 'Aucune reponse du serveur' };
    } catch (error) {
      console.error('❌ [LIVE] Erreur createLive:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Erreur creation live' };
    }
  }

  /**
   * Supprime un live (les produits restent publics)
   */
  async deleteLive(idLive: number, idStructure: number): Promise<DeleteLiveResponse> {
    try {
      const database = (await import('./database.service')).default;
      const query = `SELECT * FROM delete_live(${idLive}, ${idStructure})`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const raw = (results[0] as Record<string, unknown>).delete_live;
        const response = typeof raw === 'string' ? JSON.parse(raw) : raw;
        this.invalidateLivesCache();
        return response as DeleteLiveResponse;
      }

      return { success: false, message: 'Aucune reponse du serveur' };
    } catch (error) {
      console.error('❌ [LIVE] Erreur deleteLive:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Erreur suppression live' };
    }
  }

  /**
   * Retourne le live actif d'une structure avec ses produits
   */
  async getActiveLive(idStructure: number): Promise<ActiveLiveResponse> {
    try {
      const database = (await import('./database.service')).default;
      const query = `SELECT * FROM get_active_live(${idStructure})`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const raw = (results[0] as Record<string, unknown>).get_active_live;
        const response = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return response as ActiveLiveResponse;
      }

      return { success: true, live: null };
    } catch (error) {
      console.error('❌ [LIVE] Erreur getActiveLive:', error);
      return { success: false, live: null, message: error instanceof Error ? error.message : 'Erreur' };
    }
  }

  /**
   * Retourne tous les lives actifs (pour marketplace badge + recherche)
   * Cache de 2 minutes
   */
  async getLivesActifs(): Promise<LivesActifsResponse> {
    try {
      const now = Date.now();
      if (this.livesActifsCache && (now - this.livesActifsCacheTimestamp) < this.CACHE_DURATION) {
        return this.livesActifsCache;
      }

      const database = (await import('./database.service')).default;
      const query = `SELECT * FROM get_lives_actifs()`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const raw = (results[0] as Record<string, unknown>).get_lives_actifs;
        const response = typeof raw === 'string' ? JSON.parse(raw) : raw;

        const result = response as LivesActifsResponse;
        this.livesActifsCache = result;
        this.livesActifsCacheTimestamp = now;
        return result;
      }

      return { success: true, total: 0, lives: [] };
    } catch (error) {
      console.error('❌ [LIVE] Erreur getLivesActifs:', error);
      return { success: true, total: 0, lives: [] };
    }
  }

  /**
   * Invalide le cache des lives actifs
   */
  invalidateLivesCache(): void {
    this.livesActifsCache = null;
    this.livesActifsCacheTimestamp = 0;
  }
}

export const liveService = LiveService.getInstance();
export default liveService;
