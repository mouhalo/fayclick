import { LoginCredentials, LoginResponse, User, StructureDetails, UserPermissions, CompleteAuthData, UserRights } from '@/types/auth';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import SMSService from './sms.service';
import partenaireService from './partenaire.service';
import { extractSingleDataFromResult } from '@/utils/dataExtractor';
import { createUserPermissions, parseUserRights } from '@/utils/permissions';
import { type UserCredentialsResult } from '@/types';
import { PartenaireDetails } from '@/types/partenaire.types';

// Classe pour gérer les erreurs API
export class ApiException extends Error {
  constructor(public message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ApiException';
  }
}

// Service d'authentification
export class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Méthode pour récupérer les détails complets d'une structure depuis l'API
  async fetchStructureDetails(id_structure: number): Promise<StructureDetails> {
    try {
      console.log('🏢 [AUTH] Récupération détails structure:', id_structure);
      
      const results = await DatabaseService.getStructureDetails(id_structure);
      
      if (!results || results.length === 0) {
        throw new ApiException(`Structure ${id_structure} non trouvée`, 404);
      }

      // La réponse est directe, pas besoin d'extraction comme pour les fonctions
      const structureData = results[0] as Record<string, unknown>;
      
      const structure: StructureDetails = {
        id_structure: structureData.id_structure as number,
        code_structure: structureData.code_structure as string,
        nom_structure: structureData.nom_structure as string,
        adresse: (structureData.adresse as string) || '',
        mobile_om: (structureData.mobile_om as string) || '',
        mobile_wave: (structureData.mobile_wave as string) || '',
        numautorisatioon: (structureData.numautorisatioon as string) || '',
        nummarchand: (structureData.nummarchand as string) || '',
        email: (structureData.email as string) || '',
        id_localite: (structureData.id_localite as number) || 0,
        actif: (structureData.actif as boolean) || false,
        logo: (structureData.logo as string) || '',
        cachet: (structureData.cachet as string) || undefined,
        createdat: (structureData.createdat as string) || '',
        updatedat: (structureData.updatedat as string) || '',
        id_type: (structureData.id_type as number) || 0,
        type_structure: (structureData.type_structure as string) || '',
        num_unik_reversement: (structureData.num_unik_reversement as string) || '',
        // Champs additionnels
        created_at: (structureData.createdat as string) || '',
        updated_at: (structureData.updatedat as string) || '',
        description: (structureData.description as string) || undefined,
        website: (structureData.website as string) || undefined,
        siret: (structureData.siret as string) || undefined,
        responsable: (structureData.responsable as string) || undefined,
        // État abonnement depuis get_une_structure()
        etat_abonnement: structureData.etat_abonnement as StructureDetails['etat_abonnement'] || null,
        // Paramètres structure depuis param_structure
        credit_autorise: structureData.credit_autorise as boolean ?? false,
        limite_credit: structureData.limite_credit as number ?? 5000,
        acompte_autorise: structureData.acompte_autorise as boolean ?? false,
        prix_engros: structureData.prix_engros as boolean ?? false,
        nombre_produit_max: structureData.nombre_produit_max as number ?? 600,
        nombre_caisse_max: structureData.nombre_caisse_max as number ?? 2,
        compte_prive: structureData.compte_prive as boolean ?? false,
        mensualite: structureData.mensualite as number ?? 0,
        taux_wallet: structureData.taux_wallet as number ?? 0.04,
        info_facture: structureData.info_facture
          ? (typeof structureData.info_facture === 'string'
            ? JSON.parse(structureData.info_facture as string)
            : structureData.info_facture) as StructureDetails['info_facture']
          : { adresse_complete: '', tel_contact: '', site_web: '', email: '', compte_bancaire: '', ninea_rc: '' },
        config_facture: structureData.config_facture
          ? (typeof structureData.config_facture === 'string'
            ? JSON.parse(structureData.config_facture as string)
            : structureData.config_facture) as StructureDetails['config_facture']
          : undefined,
        inclure_tva: structureData.inclure_tva === true || structureData.inclure_tva === 't',
        taux_tva: structureData.taux_tva ? Number(structureData.taux_tva) : 18,
        live_autorise: structureData.live_autorise === true || structureData.live_autorise === 't',
      };

      console.log('✅ [AUTH] Détails structure récupérés:', {
        nom_structure: structure.nom_structure,
        logo: structure.logo,
        cachet: structure.cachet,
        etat_abonnement: structure.etat_abonnement?.statut,
        jours_restants: structure.etat_abonnement?.jours_restants
      });
      return structure;

    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération structure:', error);
      throw error instanceof ApiException ? error : 
        new ApiException('Impossible de récupérer les détails de la structure', 500);
    }
  }

  // Méthode pour calculer les permissions d'un utilisateur
  getUserPermissions(user: User, structure: StructureDetails): UserPermissions {
    return createUserPermissions(user, structure);
  }

  // 🆕 Méthode pour récupérer les droits utilisateur depuis PostgreSQL
  async fetchUserRights(id_structure: number, id_profil: number): Promise<UserRights> {
    try {
      console.log('🔑 [AUTH] Récupération droits utilisateur:', { id_structure, id_profil });

      const database = (await import('./database.service')).default;
      const results = await database.getUserRights(id_structure, id_profil);

      if (!results || results.length === 0) {
        console.warn('⚠️ [AUTH] Aucun droit trouvé, utilisation droits par défaut');
        return {
          id_profil,
          profil: 'UNKNOWN',
          fonctionnalites: [],
          _index: {}
        };
      }

      // Extraire les données (peut être dans get_mes_droits ou directement le résultat)
      const rawData = results[0];
      let rightsData = rawData;

      // Si le résultat est encapsulé dans une propriété get_mes_droits
      if (typeof rawData === 'object' && 'get_mes_droits' in rawData) {
        rightsData = rawData.get_mes_droits;
      }

      // Si c'est une chaîne JSON, la parser
      if (typeof rightsData === 'string') {
        rightsData = JSON.parse(rightsData);
      }

      // Parser et transformer les données
      const userRights = parseUserRights(rightsData);

      console.log('✅ [AUTH] Droits utilisateur récupérés:', {
        profil: userRights.profil,
        nb_fonctionnalites: userRights.fonctionnalites.length
      });

      return userRights;

    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération droits:', error);

      // Retourner des droits par défaut sécuritaires en cas d'erreur
      return {
        id_profil,
        profil: 'ERROR',
        fonctionnalites: [],
        _index: {}
      };
    }
  }

  // Méthode de connexion complète avec structure, permissions et droits
  async completeLogin(credentials: LoginCredentials): Promise<CompleteAuthData> {
    try {
      console.log('🔐 [AUTH] Connexion complète démarrée');

      // 1. Vérification des identifiants
      const loginResult = await this.login(credentials);

      // 2. Vérifier si c'est un admin système ou un partenaire
      // - Admin système: id_structure = 0 ET id_groupe = -1
      // - Partenaire: id_structure = 0 ET id_groupe = 4 (email @partner.fay)
      const isAdminSystem = loginResult.user.id_structure === 0 && loginResult.user.id_groupe === -1;
      const isPartenaire = loginResult.user.id_structure === 0 && loginResult.user.id_groupe === 4;

      let structure: StructureDetails;
      let rights: UserRights;
      let partenaireDetails: PartenaireDetails | undefined;

      if (isAdminSystem) {
        // 🔐 Admin système : créer une structure virtuelle (NE PAS appeler get_une_structure)
        console.log('👑 [AUTH] Admin système détecté - création structure virtuelle');

        structure = {
          id_structure: 0,
          code_structure: 'ADMIN-SYSTEM',
          nom_structure: 'Administration Système FayClick',
          adresse: 'Dakar, Sénégal',
          mobile_om: '',
          mobile_wave: '',
          numautorisatioon: '',
          nummarchand: '',
          email: 'admin@system.fay',
          id_localite: 0,
          actif: true,
          logo: '/fayclick.ico',
          cachet: undefined,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString(),
          id_type: 0,
          type_structure: 'ADMIN',
          num_unik_reversement: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: 'Compte administrateur système',
          website: 'https://fayclick.net',
          siret: undefined,
          responsable: 'Admin System',
          etat_abonnement: {
            statut: 'ACTIF',
            date_debut: '2020-01-01',
            date_fin: '2099-12-31',
            jours_restants: 99999,
            type_abonnement: 'SYSTEM'
          }
        };

        // Droits admin complets
        rights = {
          id_profil: loginResult.user.id_profil,
          profil: 'ADMIN_SYSTEM',
          fonctionnalites: [{ name: '*', allowed: true }],
          _index: { '*': true }
        };
      } else if (isPartenaire) {
        // 🤝 Partenaire : créer une structure virtuelle + récupérer infos partenaire
        console.log('🤝 [AUTH] Partenaire détecté - création structure virtuelle');

        // Récupérer les infos du partenaire depuis PostgreSQL
        const partenaireResponse = await partenaireService.getPartenaireByUser(loginResult.user.id);

        if (!partenaireResponse.success || !partenaireResponse.partenaire) {
          throw new ApiException('Partenaire non trouvé ou inactif', 403);
        }

        partenaireDetails = partenaireResponse.partenaire;

        // Calculer jours_restants et est_expire si non fournis par PostgreSQL
        if (partenaireDetails.valide_jusqua) {
          const dateFinValidite = new Date(partenaireDetails.valide_jusqua);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFinValidite.setHours(0, 0, 0, 0);
          const diffTime = dateFinValidite.getTime() - today.getTime();
          partenaireDetails.jours_restants = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          partenaireDetails.est_expire = partenaireDetails.jours_restants < 0;
        } else {
          partenaireDetails.jours_restants = 0;
          partenaireDetails.est_expire = true;
        }

        // Vérifier si le partenaire est toujours actif et non expiré
        if (!partenaireDetails.actif) {
          throw new ApiException('Compte partenaire désactivé', 403);
        }
        if (partenaireDetails.est_expire) {
          throw new ApiException('Compte partenaire expiré', 403);
        }

        structure = {
          id_structure: 0, // Convention partenaire
          code_structure: `PARTENAIRE-${partenaireDetails.id_partenaire}`,
          nom_structure: partenaireDetails.nom_partenaire,
          adresse: partenaireDetails.adresse || 'Sénégal',
          mobile_om: partenaireDetails.telephone,
          mobile_wave: '',
          numautorisatioon: '',
          nummarchand: '',
          email: partenaireDetails.email || '',
          id_localite: 0,
          actif: true,
          logo: '/fayclick.ico',
          cachet: undefined,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString(),
          id_type: 0,
          type_structure: 'PARTENAIRE',
          num_unik_reversement: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: `Partenaire ${partenaireDetails.nom_partenaire} - Code: ${partenaireDetails.code_promo}`,
          website: undefined,
          siret: undefined,
          responsable: partenaireDetails.nom_partenaire,
          etat_abonnement: {
            statut: 'ACTIF',
            date_debut: new Date().toISOString().split('T')[0],
            date_fin: partenaireDetails.valide_jusqua,
            jours_restants: partenaireDetails.jours_restants,
            type_abonnement: 'PARTENAIRE'
          }
        };

        // Droits partenaire spécifiques (lecture seule sur leurs structures)
        rights = {
          id_profil: loginResult.user.id_profil,
          profil: 'PARTENAIRE',
          fonctionnalites: [
            { name: 'VOIR_STRUCTURES', allowed: true },
            { name: 'VOIR_STATS', allowed: true },
            { name: 'VOIR_DASHBOARD', allowed: true }
          ],
          _index: {
            'VOIR_STRUCTURES': true,
            'VOIR_STATS': true,
            'VOIR_DASHBOARD': true
          }
        };

        console.log('🤝 [AUTH] Partenaire identifié:', {
          id_partenaire: partenaireDetails.id_partenaire,
          code_promo: partenaireDetails.code_promo,
          jours_restants: partenaireDetails.jours_restants
        });
      } else {
        // Utilisateur normal : récupérer structure ET droits en PARALLÈLE
        console.log('⚡ [AUTH] Chargement parallèle structure + droits');
        [structure, rights] = await Promise.all([
          this.fetchStructureDetails(loginResult.user.id_structure),
          this.fetchUserRights(loginResult.user.id_structure, loginResult.user.id_profil)
        ]);
      }

      // 3. Calcul des permissions (ancien système - garder pour compatibilité)
      const permissions = this.getUserPermissions(loginResult.user, structure);

      const completeData: CompleteAuthData = {
        user: loginResult.user,
        structure,
        permissions,
        rights,
        token: loginResult.token,
        // 🆕 Ajouter les infos partenaire si disponibles
        ...(partenaireDetails && { partenaire: partenaireDetails })
      };

      console.log('✅ [AUTH] Connexion complète réussie:', {
        user: completeData.user.login,
        structure: completeData.structure.nom_structure,
        permissions: completeData.permissions.permissions.length,
        droits_profil: completeData.rights.profil,
        nb_fonctionnalites: completeData.rights.fonctionnalites.length,
        isAdminSystem,
        isPartenaire,
        partenaire_code: partenaireDetails?.code_promo
      });

      return completeData;

    } catch (error) {
      console.error('❌ [AUTH] Erreur connexion complète:', error);
      throw error instanceof ApiException ? error :
        new ApiException('Erreur lors de la connexion complète', 500);
    }
  }

  // Méthode de connexion avec fonction PostgreSQL check_user_credentials
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 [AUTH] Tentative de connexion:', {
        login: credentials.login,
        timestamp: new Date().toISOString()
      });

      // Appel de la fonction PostgreSQL check_user_credentials (VERSION CORRIGÉE)
      const results = await DatabaseService.checkUserCredentialsFixed(credentials.login, credentials.pwd);
      
      console.log('🔍 [AUTH] Résultat vérification identifiants:', {
        hasResults: results && results.length > 0,
        resultCount: results?.length || 0,
        firstResult: results?.[0] ? Object.keys(results[0]) : null
      });
      
      if (results && results.length > 0) {
        // Extraire les données utilisateur directement
        const userData = extractSingleDataFromResult<UserCredentialsResult>(results[0]);
        
        if (userData && userData.actif) {
          // Les données correspondent déjà exactement à l'interface User !
          const user: User = {
            id: userData.id,
            username: userData.username,
            login: userData.login,
            nom: userData.username, // Mapping username -> nom pour compatibilité
            prenom: '', // Pas retourné par la fonction
            email: '', // Pas retourné par la fonction
            nom_groupe: userData.nom_groupe,
            id_structure: userData.id_structure,
            nom_structure: userData.nom_structure,
            pwd_changed: userData.pwd_changed,
            actif: userData.actif,
            type_structure: userData.type_structure,
            logo: userData.logo,
            pwd: '', // Ne jamais exposer le mot de passe
            telephone: userData.telephone,
            nom_profil: userData.nom_profil,
            id_groupe: userData.id_groupe,
            id_profil: userData.id_profil,
            // Propriétés étendues - création d'objets compatibles
            profil: {
              id: userData.id_profil,
              nom: userData.nom_profil,
              id_profil: userData.id_profil,
              nom_profil: userData.nom_profil
            },
            zone: {
              id: 1, // Default - pas retourné par la fonction
              nom: 'Zone par défaut'
            },
            mode: 'standard' // Default - pas retourné par la fonction
          };
          
          const loginResponse: LoginResponse = {
            token: this.generateSessionToken(user),
            user: user
          };
          
          SecurityService.secureLog('log', 'Connexion réussie', {
            userId: user.id,
            userActif: user.actif,
            typeStructure: user.type_structure
          });
          
          return loginResponse;
        } else if (userData && !userData.actif) {
          throw new ApiException('Compte utilisateur désactivé', 401);
        } else {
          throw new ApiException('Identifiants incorrects', 401);
        }
      }
      
      // Aucune réponse valide
      throw new ApiException('Aucun utilisateur trouvé avec ces identifiants', 401);
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur lors de la connexion', {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Gestion des erreurs réseau
      if (error instanceof Error && error.message.includes('Impossible de contacter')) {
        throw new ApiException('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      }

      throw new ApiException(
        error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      );
    }
  }
  
  // Génère un token de session basé sur les données utilisateur
  private generateSessionToken(user: User): string {
    if (!user) {
      throw new Error('Utilisateur requis pour générer le token');
    }
    
    const tokenData = {
      userId: user.id,
      login: user.login,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    };
    
    // En développement, token simple. En production, utiliser un vrai JWT
    if (process.env.NODE_ENV === 'development') {
      return btoa(JSON.stringify(tokenData));
    }
    
    // En production, on devrait utiliser une vraie signature JWT
    return SecurityService.encrypt(JSON.stringify(tokenData));
  }

  // Sauvegarder le token
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fayclick_token', token);
      SecurityService.secureLog('log', 'Token de session sauvegardé');
    }
  }

  // Récupérer le token
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fayclick_token');
    }
    return null;
  }

  // Supprimer le token
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fayclick_token');
      SecurityService.secureLog('log', 'Token de session supprimé');
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    
    if (!token || !user) {
      return false;
    }
    
    // Vérifier que l'utilisateur est actif
    return user.actif === true;
  }
  
  // Méthode pour vérifier la validité du token
  isTokenValid(): boolean {
    try {
      const token = this.getToken();
      if (!token) return false;
      
      // En développement, token simple base64
      if (process.env.NODE_ENV === 'development') {
        const decoded = JSON.parse(atob(token));
        // Vérifier l'âge du token (24h max)
        const tokenAge = Date.now() - decoded.timestamp;
        return tokenAge < (24 * 60 * 60 * 1000);
      }
      
      // En production, décrypter et vérifier
      const decrypted = SecurityService.decrypt(token);
      const decoded = JSON.parse(decrypted);
      const tokenAge = Date.now() - decoded.timestamp;
      return tokenAge < (24 * 60 * 60 * 1000);
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur validation token', error);
      return false;
    }
  }

  // Déconnexion avec nettoyage sécurisé
  logout(): void {
    SecurityService.secureLog('log', 'Déconnexion utilisateur');
    
    this.removeToken();
    this.removeUser();
    
    // Nettoyer toutes les données sensibles
    SecurityService.clearSensitiveStorage();
    
    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Sauvegarder les données complètes d'authentification
  saveCompleteAuthData(authData: CompleteAuthData): void {
    try {
      // Sauvegarder le token
      this.saveToken(authData.token);

      // Sauvegarder les données utilisateur
      this.saveUser(authData.user);

      // Sauvegarder les détails de structure
      const structureKey = SecurityService.generateStorageKey('fayclick_structure');
      localStorage.setItem(structureKey, JSON.stringify({
        data: authData.structure,
        timestamp: Date.now(),
        signature: SecurityService.generateDataSignature(authData.structure)
      }));

      // Sauvegarder les permissions
      const permissionsKey = SecurityService.generateStorageKey('fayclick_permissions');
      localStorage.setItem(permissionsKey, JSON.stringify({
        data: authData.permissions,
        timestamp: Date.now(),
        signature: SecurityService.generateDataSignature(authData.permissions)
      }));

      // 🆕 Sauvegarder les droits
      const rightsKey = SecurityService.generateStorageKey('fayclick_rights');
      localStorage.setItem(rightsKey, JSON.stringify({
        data: authData.rights,
        timestamp: Date.now(),
        signature: SecurityService.generateDataSignature(authData.rights)
      }));

      console.log('✅ [AUTH] Données complètes sauvegardées (user, structure, permissions, rights)');

      // Sync localStorage sales rules depuis les paramètres DB
      if (authData.structure.id_structure) {
        const salesRulesKey = `fayclick_regles_ventes_${authData.structure.id_structure}`;
        const salesRules = {
          creditAutorise: authData.structure.credit_autorise ?? false,
          limiteCredit: authData.structure.limite_credit ?? 5000,
          acompteAutorise: authData.structure.acompte_autorise ?? false,
          prixEnGrosActif: authData.structure.prix_engros ?? false,
        };
        localStorage.setItem(salesRulesKey, JSON.stringify(salesRules));
        console.log('✅ [AUTH] Sales rules synchronisées depuis DB:', salesRules);
      }
    } catch (error) {
      console.error('❌ [AUTH] Erreur sauvegarde données complètes:', error);
      throw new ApiException('Erreur lors de la sauvegarde des données', 500);
    }
  }

  // Récupérer les détails de structure depuis localStorage
  getStructureDetails(): StructureDetails | null {
    try {
      const structureKey = SecurityService.generateStorageKey('fayclick_structure');
      const stored = localStorage.getItem(structureKey);
      
      if (!stored) return null;
      
      const parsedData = JSON.parse(stored);
      
      // Vérifier l'intégrité des données
      if (!SecurityService.verifyDataSignature(parsedData.data, parsedData.signature)) {
        console.warn('⚠️ [AUTH] Signature structure invalide, suppression');
        localStorage.removeItem(structureKey);
        return null;
      }
      
      return parsedData.data as StructureDetails;
      
    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération structure:', error);
      return null;
    }
  }

  // Récupérer les permissions depuis localStorage
  getUserPermissionsFromStorage(): UserPermissions | null {
    try {
      const permissionsKey = SecurityService.generateStorageKey('fayclick_permissions');
      const stored = localStorage.getItem(permissionsKey);

      if (!stored) return null;

      const parsedData = JSON.parse(stored);

      // Vérifier l'intégrité des données
      if (!SecurityService.verifyDataSignature(parsedData.data, parsedData.signature)) {
        console.warn('⚠️ [AUTH] Signature permissions invalide, suppression');
        localStorage.removeItem(permissionsKey);
        return null;
      }

      return parsedData.data as UserPermissions;

    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération permissions:', error);
      return null;
    }
  }

  // 🆕 Récupérer les droits depuis localStorage
  getUserRightsFromStorage(): UserRights | null {
    try {
      const rightsKey = SecurityService.generateStorageKey('fayclick_rights');
      const stored = localStorage.getItem(rightsKey);

      if (!stored) return null;

      const parsedData = JSON.parse(stored);

      // Vérifier l'intégrité des données
      if (!SecurityService.verifyDataSignature(parsedData.data, parsedData.signature)) {
        console.warn('⚠️ [AUTH] Signature droits invalide, suppression');
        localStorage.removeItem(rightsKey);
        return null;
      }

      return parsedData.data as UserRights;

    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération droits:', error);
      return null;
    }
  }

  // Récupérer toutes les données d'authentification depuis localStorage
  getCompleteAuthData(): CompleteAuthData | null {
    try {
      const user = this.getUser();
      const structure = this.getStructureDetails();
      const permissions = this.getUserPermissionsFromStorage();
      const rights = this.getUserRightsFromStorage(); // 🆕
      const token = this.getToken();

      if (!user || !structure || !permissions || !rights || !token) {
        return null;
      }

      return {
        user,
        structure,
        permissions,
        rights, // 🆕
        token
      };

    } catch (error) {
      console.error('❌ [AUTH] Erreur récupération données complètes:', error);
      return null;
    }
  }

  // Nettoyer toutes les données de session
  clearSession(): void {
    SecurityService.secureLog('log', 'Nettoyage session utilisateur');

    this.removeToken();
    this.removeUser();

    // Supprimer les nouvelles données
    const structureKey = SecurityService.generateStorageKey('fayclick_structure');
    const permissionsKey = SecurityService.generateStorageKey('fayclick_permissions');
    const rightsKey = SecurityService.generateStorageKey('fayclick_rights'); // 🆕
    localStorage.removeItem(structureKey);
    localStorage.removeItem(permissionsKey);
    localStorage.removeItem(rightsKey); // 🆕

    // Nettoyer toutes les données sensibles
    SecurityService.clearSensitiveStorage();
  }

  // Sauvegarder les données utilisateur (compatible avec l'ancien format fayclick_user)
  saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      const userData = {
        user: user,
        profil: user.profil || null,
        zone: user.zone || null,
        mode: user.mode || null,
        loginTime: new Date().toISOString()
      };
      
      // Sauvegarder les données complètes avec métadonnées
      localStorage.setItem('fayclick_user', JSON.stringify(userData));
      
      SecurityService.secureLog('log', 'Données utilisateur sauvegardées', {
        userId: user.id,
        hasProfile: !!user.profil
      });
    }
  }

  // Récupérer les données utilisateur
  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('fayclick_user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          
          // Gérer le nouveau format avec métadonnées
          if (parsed.user) {
            return parsed.user;
          }
          
          // Gérer l'ancien format direct
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Supprimer les données utilisateur
  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fayclick_user');
      localStorage.removeItem('fayclick_user'); // Compatibilité
      SecurityService.secureLog('log', 'Données utilisateur supprimées');
    }
  }

  /**
   * Demande de récupération de mot de passe - Étape 1
   * Crée une demande et envoie le code par SMS
   * @returns Les détails de la demande (sans le code pour sécurité)
   */
  async requestPasswordReset(login: string, telephone: string): Promise<{
    success: boolean;
    message: string;
    demandId?: string;
    expiration?: string;
    error?: string;
  }> {
    try {
      console.log('🔐 [AUTH] Début récupération mot de passe pour:', login.substring(0, 3) + '***');
      
      // Étape 1: Créer la demande dans la base
      const resetRequest = await DatabaseService.requestPasswordReset(login, telephone);
      
      if (resetRequest.status !== 'success') {
        throw new ApiException(resetRequest.message || 'Erreur lors de la demande', 400);
      }
      
      // Étape 2: Envoyer le SMS avec le code temporaire
      // IMPORTANT: Ne jamais logger le pwd_temp
      const tempCode = resetRequest.pwd_temp;
      if (!tempCode) {
        throw new ApiException('Code temporaire non généré', 500);
      }
      
      try {
        await SMSService.sendPasswordResetSMS(telephone, tempCode);
        console.log('✅ [AUTH] SMS envoyé avec succès');
      } catch (smsError: any) {
        console.error('⚠️ [AUTH] Erreur envoi SMS, mais demande créée:', smsError.message);
        // On continue même si le SMS échoue, l'utilisateur pourra redemander
      }
      
      // Retourner les infos sans le code sensible
      return {
        success: true,
        message: 'Un code de vérification a été envoyé sur votre téléphone',
        demandId: resetRequest.message?.split(':')[1]?.trim(),
        expiration: resetRequest.expiration
      };
      
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur récupération mot de passe:', error);
      
      if (error instanceof ApiException) {
        return {
          success: false,
          message: error.message,
          error: error.message
        };
      }
      
      return {
        success: false,
        message: 'Erreur lors de la récupération du mot de passe',
        error: error.message
      };
    }
  }

  /**
   * Vérification du code et réinitialisation - Étape 2
   * Vérifie le code temporaire et retourne le nouveau mot de passe
   * @returns Les détails avec le nouveau mot de passe temporaire
   */
  async verifyPasswordResetCode(login: string, telephone: string, code: string): Promise<{
    success: boolean;
    message: string;
    newPassword?: string;
    instruction?: string;
    error?: string;
  }> {
    try {
      console.log('🔐 [AUTH] Vérification du code de récupération');
      
      // Vérifier le code et obtenir le nouveau mot de passe
      const verification = await DatabaseService.verifyPasswordResetCode(login, telephone, code);
      
      if (verification.status === 'success') {
        console.log('✅ [AUTH] Mot de passe réinitialisé avec succès');
        
        // Optionnel: Envoyer un SMS avec le nouveau mot de passe
        if (verification.nouveau_password) {
          try {
            const message = SMSService.generateNewPasswordMessage(verification.nouveau_password);
            await SMSService.sendNotificationSMS(telephone, message);
          } catch (smsError) {
            console.warn('⚠️ [AUTH] SMS nouveau mot de passe non envoyé:', smsError);
          }
        }
        
        return {
          success: true,
          message: verification.message,
          newPassword: verification.nouveau_password,
          instruction: verification.instruction
        };
      } else {
        return {
          success: false,
          message: verification.message || 'Code invalide ou expiré',
          error: verification.message
        };
      }
      
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur vérification code:', error);
      
      return {
        success: false,
        message: 'Erreur lors de la vérification du code',
        error: error.message
      };
    }
  }

  /**
   * Récupération de mot de passe complète (ancienne méthode pour compatibilité)
   * @deprecated Utiliser requestPasswordReset et verifyPasswordResetCode à la place
   */
  async recoverPassword(structureName: string, phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // Pour compatibilité, on utilise le nom de structure comme login
      const result = await this.requestPasswordReset(structureName, phoneNumber);
      
      return {
        success: result.success,
        message: result.message,
        data: result
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération'
      };
    }
  }

  /**
   * Rafraîchir les données utilisateur depuis la base de données
   * Recharge les informations de l'utilisateur connecté et met à jour le localStorage
   */
  async refreshUserData(): Promise<void> {
    try {
      const currentUser = this.getUser();
      if (!currentUser?.id_structure) {
        throw new ApiException('Aucun utilisateur connecté', 401);
      }

      console.log('🔄 [AUTH] Rafraîchissement des données utilisateur:', currentUser.login);

      // Recharger les détails de structure uniquement (pas besoin de ré-authentifier)
      const updatedStructure = await this.fetchStructureDetails(currentUser.id_structure);
      
      // Récupérer les données complètes actuelles
      const currentAuthData = this.getCompleteAuthData();
      if (currentAuthData) {
        // Mettre à jour seulement la structure
        const updatedAuthData = {
          ...currentAuthData,
          structure: updatedStructure,
          permissions: this.getUserPermissions(currentAuthData.user, updatedStructure)
        };
        
        // Sauvegarder les données mises à jour
        this.saveCompleteAuthData(updatedAuthData);
        
        console.log('✅ [AUTH] Données de structure rafraîchies avec succès');
      } else {
        console.warn('⚠️ [AUTH] Aucune donnée d\'authentification trouvée');
      }

    } catch (error) {
      console.error('❌ [AUTH] Erreur rafraîchissement données utilisateur:', error);
      
      // Si l'erreur est due à l'authentification, déconnecter l'utilisateur
      if (error instanceof ApiException && error.status === 401) {
        console.warn('⚠️ [AUTH] Session expirée, déconnexion automatique');
        this.logout();
      }
      
      throw error instanceof ApiException ? error :
        new ApiException('Impossible de rafraîchir les données utilisateur', 500);
    }
  }
}

// Export instance unique
export const authService = AuthService.getInstance();
