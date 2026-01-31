/**
 * Service de base de donnees pour FayClick V2
 * Communication JSON via sql_jsonpro (proxy Next.js /api/sql)
 */

import SecurityService from './security.service';
import { API_CONFIG, APPLICATIONS_CONFIG } from '@/config/env';

// Interface pour configurer les applications
interface ApplicationConfig {
  name: string;
  description?: string;
  defaultTimeout?: number;
}

class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  // Valider le nom de l'application
  private validerApplication(application_name: string): ApplicationConfig {
    const appConfig = APPLICATIONS_CONFIG[application_name as keyof typeof APPLICATIONS_CONFIG];
    if (!appConfig) {
      SecurityService.secureLog('warn', `Application '${application_name}' non configuree, utilisation des parametres par defaut`);
      return { name: application_name, defaultTimeout: 10000 };
    }
    return appConfig;
  }

  /**
   * Envoie une requete SQL via le proxy JSON /api/sql
   */
  async envoyerRequeteApi(application_name: string, requeteSql: string, customTimeout?: number): Promise<any[]> {
    try {
      const appConfig = this.validerApplication(application_name);
      const timeout = customTimeout || API_CONFIG.TIMEOUT;

      console.log('🚀 [DATABASE] Envoi requete JSON:', {
        application: appConfig.name,
        query: requeteSql.substring(0, 100) + (requeteSql.length > 100 ? '...' : '')
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application: appConfig.name,
          query: requeteSql,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🟢 [DATABASE] Reponse recue:', {
        status: responseData?.status,
        dataKeys: Object.keys(responseData || {}),
      });

      // Format sql_jsonpro: { status: 'success', data: { rows: [...], rowCount, duration } }
      if (responseData.status === 'success') {
        // sql_jsonpro retourne data.rows
        if (responseData.data?.rows && Array.isArray(responseData.data.rows)) {
          return responseData.data.rows;
        }
        // Fallback: ancien format avec datas
        if (responseData.datas && Array.isArray(responseData.datas)) {
          return responseData.datas;
        }
        // Fallback: data directement un tableau
        if (Array.isArray(responseData.data)) {
          return responseData.data;
        }
        return [];
      }

      if (Array.isArray(responseData)) {
        return responseData;
      }

      // Erreurs
      const errorMsg = responseData.detail || responseData.error || responseData.message;
      if (errorMsg) throw new Error(errorMsg);

      throw new Error('Format de reponse API non reconnu');

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Timeout de la requete (${customTimeout || API_CONFIG.TIMEOUT}ms)`);
        }

        const networkPatterns = ['fetch', 'Failed to fetch', 'NetworkError', 'Load failed', 'Network request failed'];
        const isNetworkError = networkPatterns.some(p => error.message.toLowerCase().includes(p.toLowerCase()));
        if (isNetworkError || (error.name === 'TypeError' && error.message.includes('fetch'))) {
          SecurityService.secureLog('error', 'Erreur reseau', { endpoint: '/api/sql', error: error.message });
          throw new Error('Impossible de contacter le serveur. Verifiez votre connexion internet.');
        }
      }

      SecurityService.secureLog('error', `Erreur API pour '${application_name}'`, {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw new Error(`Erreur base de donnees: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Methode principale: execute une requete SQL
  async query<T = unknown>(requeteSql: string, customTimeout?: number): Promise<T[]> {
    return this.envoyerRequeteApi(API_CONFIG.APPLICATION_NAME, requeteSql, customTimeout);
  }

  /**
   * Execute une fonction PostgreSQL avec parametres
   */
  async executeFunction(functionName: string, params: string[] = []): Promise<unknown[]> {
    const paramStr = params.map(p => {
      if (/^\d+$/.test(p)) return `${p}::integer`;
      if (p === 'true' || p === 'false') return `${p}::boolean`;
      const escapedParam = p.replace(/'/g, "''");
      return `'${escapedParam}'::varchar`;
    }).join(', ');
    const query = `SELECT * FROM ${functionName}(${paramStr});`;
    console.log('🔧 [DATABASE] Execution fonction:', { functionName, params: params.length });
    return this.query(query);
  }

  async connexionAgent(login: string, password: string): Promise<unknown[]> {
    return this.executeFunction('connexion_agent', [login, password]);
  }

  async checkUserCredentials(login: string, password: string): Promise<unknown[]> {
    return this.executeFunction('check_user_credentials', [login, password]);
  }

  async checkUserCredentialsFixed(login: string, password: string): Promise<unknown[]> {
    const escapedLogin = login.replace(/'/g, "''");
    const escapedPassword = password.replace(/'/g, "''");
    const query = `SELECT * FROM check_user_credentials('${escapedLogin}'::varchar, '${escapedPassword}'::varchar);`;
    return this.query(query);
  }

  async getListEvents(): Promise<unknown[]> {
    return this.executeFunction('get_list_events');
  }

  async getDashboard(structureId: string): Promise<unknown[]> {
    return this.executeFunction('get_dashboard', [structureId]);
  }

  async getStructureDetails(id_structure: number): Promise<unknown[]> {
    const query = `SELECT get_une_structure(${id_structure});`;
    try {
      const results = await this.query(query);
      if (results && results.length > 0) {
        const response = results[0] as Record<string, unknown>;
        let parsedData;
        if (response.get_une_structure) {
          parsedData = typeof response.get_une_structure === 'string'
            ? JSON.parse(response.get_une_structure)
            : response.get_une_structure;
        } else {
          parsedData = response;
        }
        if (parsedData.success && parsedData.data) {
          return [parsedData.data];
        }
        return [];
      }
      return [];
    } catch (error) {
      console.error('[DATABASE] Erreur get_une_structure:', error);
      throw error;
    }
  }

  async requestPasswordReset(login: string, telephone: string): Promise<unknown> {
    const escapedLogin = login.replace(/'/g, "''");
    const escapedTelephone = telephone.replace(/'/g, "''");
    const query = `SELECT * FROM add_demande_password('${escapedLogin}'::varchar, '${escapedTelephone}'::varchar);`;
    const results = await this.query(query);
    if (results && results.length > 0) {
      const response = results[0] as Record<string, unknown>;
      let data;
      if (response.add_demande_password) {
        const functionResult = response.add_demande_password;
        data = typeof functionResult === 'string' ? JSON.parse(functionResult) : functionResult;
      } else {
        data = typeof response === 'string' ? JSON.parse(response) : response;
      }
      return data;
    }
    throw new Error('Aucune reponse de la base de donnees');
  }

  async verifyPasswordResetCode(login: string, telephone: string, code: string): Promise<unknown> {
    const escapedLogin = login.replace(/'/g, "''");
    const escapedTelephone = telephone.replace(/'/g, "''");
    const escapedCode = code.replace(/'/g, "''");
    const query = `SELECT * FROM add_check_demande('${escapedLogin}'::varchar, '${escapedTelephone}'::varchar, '${escapedCode}'::varchar);`;
    const results = await this.query(query);
    if (results && results.length > 0) {
      const response = results[0] as Record<string, unknown>;
      let data;
      if (response.add_check_demande) {
        const functionResult = response.add_check_demande;
        data = typeof functionResult === 'string' ? JSON.parse(functionResult) : functionResult;
      } else {
        data = typeof response === 'string' ? JSON.parse(response) : response;
      }
      return data;
    }
    throw new Error('Aucune reponse de la base de donnees');
  }

  async registerMerchant(
    p_id_type: number, p_nom_structure: string, p_adresse: string,
    p_mobile_om: string, p_mobile_wave: string = '', p_numautorisatioon: string = '',
    p_nummarchand: string = '', p_email: string = '', p_logo: string = '',
    p_nom_service: string = 'SERVICES', p_id_structure: number = 0
  ): Promise<unknown[]> {
    return this.executeFunction('add_edit_inscription', [
      p_id_type.toString(), p_nom_structure, p_adresse, p_mobile_om,
      p_mobile_wave, p_numautorisatioon, p_nummarchand, p_email,
      p_logo, p_nom_service, p_id_structure.toString()
    ]);
  }

  async updateUser(userData: {
    id_structure: number; id_profil: number; username: string;
    telephone: string; id_utilisateur: number;
  }): Promise<unknown[]> {
    if (!userData.id_utilisateur || userData.id_utilisateur <= 0) throw new Error('ID utilisateur invalide');
    if (!userData.username?.trim()) throw new Error("Le nom d'utilisateur est requis");
    if (!userData.telephone?.trim()) throw new Error('Le telephone est requis');
    const escapedUsername = userData.username.replace(/'/g, "''");
    const escapedTelephone = userData.telephone.replace(/'/g, "''");
    const query = `SELECT add_edit_utilisateur(${userData.id_structure}, ${userData.id_profil}, '${escapedUsername}', '${escapedTelephone}', ${userData.id_utilisateur});`;
    return this.query(query);
  }

  async changeUserPassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    if (!userId || userId <= 0) throw new Error('ID utilisateur invalide');
    if (!oldPassword) throw new Error("L'ancien mot de passe est requis");
    if (!newPassword) throw new Error('Le nouveau mot de passe est requis');
    if (newPassword.length < 6) throw new Error('Le nouveau mot de passe doit contenir au moins 6 caracteres');
    const escapedOldPassword = oldPassword.replace(/'/g, "''");
    const escapedNewPassword = newPassword.replace(/'/g, "''");
    const query = `SELECT change_user_password(${userId}, '${escapedOldPassword}', '${escapedNewPassword}');`;
    const result = await this.query(query);
    const changeResult = (result?.[0] as Record<string, unknown>)?.change_user_password;
    return changeResult === true || changeResult === 't' || changeResult === 1;
  }

  async updateStructure(structure: {
    id_structure: number; id_type: number; nom_structure: string; adresse: string;
    mobile_om: string; mobile_wave?: string; mobile_free?: string;
    numautorisatioon?: string; nummarchand?: string; email?: string; logo?: string;
  }): Promise<unknown[]> {
    if (!structure.id_structure || structure.id_structure <= 0) throw new Error('ID de structure invalide');
    if (!structure.nom_structure?.trim()) throw new Error('Le nom de la structure est requis');
    if (!structure.adresse?.trim()) throw new Error("L'adresse est requise");
    if (!structure.mobile_om) throw new Error('Le numero Orange Money est requis');
    const esc = (s: string) => (s || '').replace(/'/g, "''");
    const query = `SELECT add_edit_structure(${structure.id_type}, '${esc(structure.nom_structure)}', '${esc(structure.adresse)}', '${esc(structure.mobile_om)}', '${esc(structure.mobile_wave || '')}', '${esc(structure.numautorisatioon || '')}', '${esc(structure.nummarchand || '')}', '${esc(structure.email || '')}', '${esc(structure.logo || '')}', ${structure.id_structure});`;
    return this.query(query);
  }

  async getStructureTypes(): Promise<unknown[]> {
    return this.query('SELECT id_type, nom_type FROM type_structure WHERE id_type != 0 ORDER BY nom_type');
  }

  async getUserRights(id_structure: number, id_profil: number): Promise<unknown[]> {
    return this.query(`SELECT * FROM get_mes_droits(${id_structure}, ${id_profil});`);
  }

  async getListClients(id_structure: number, tel_client: string = ''): Promise<unknown[]> {
    const escapedTel = tel_client.replace(/'/g, "''");
    return this.query(`SELECT * FROM get_list_clients(${id_structure}, '${escapedTel}');`);
  }

  async checkStructureNameExists(nom_structure: string): Promise<boolean> {
    try {
      const escapedName = nom_structure.toUpperCase().trim().replace(/'/g, "''");
      const result = await this.query(`SELECT 1 FROM structures WHERE UPPER(nom_structure) = '${escapedName}' LIMIT 1;`);
      return Array.isArray(result) && result.length > 0;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as test_connection;');
      return Array.isArray(result) && result.length > 0;
    } catch {
      return false;
    }
  }

  getApplications(): string[] {
    return Object.keys(APPLICATIONS_CONFIG);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addApplication(name: string, _config: Omit<ApplicationConfig, 'name'>) {
    SecurityService.secureLog('warn', `Tentative d'ajout d'application '${name}' non supportee dynamiquement`);
  }
}

export default DatabaseService.getInstance();
export type { ApplicationConfig };
