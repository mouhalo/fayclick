import { EtatAbonnement } from './subscription.types';
import { PartenaireDetails } from './partenaire.types';

// Types pour l'authentification et les structures
export interface LoginCredentials {
  login: string;
  pwd: string;
}

export interface User {
  id: number;
  username?: string;
  login: string;
  nom?: string;
  prenom?: string;
  email?: string;
  nom_groupe: string;
  id_structure: number;
  nom_structure: string;
  pwd_changed: boolean;
  actif: boolean;
  type_structure: 'SCOLAIRE' | 'COMMERCIALE' | 'IMMOBILIER' | 'PRESTATAIRE DE SERVICES' | 'FORMATION PRO' | 'PARTENAIRE' | 'ADMIN';
  logo: string;
  pwd: string;
  telephone: string;
  nom_profil: string;
  id_groupe: number;
  id_profil: number;
  // Propriétés étendues pour compatibilité avec l'ancien système
  profil?: {
    id: number;
    nom: string;
    id_profil?: number;
    nom_profil?: string;
    [key: string]: unknown;
  };
  zone?: {
    id: number;
    nom: string;
    [key: string]: unknown;
  };
  mode?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Structure {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  adresse: string;
  mobile_om: string;
  mobile_wave: string;
  numautorisatioon: string;
  nummarchand: string;
  email: string;
  id_localite: number;
  actif: boolean;
  logo: string;
  cachet?: string;  // URL du cachet de la structure
  createdat: string;
  updatedat: string;
  id_type: number;
  type_structure: string;
  num_unik_reversement: string;
}

// Interface complète pour les détails de structure depuis get_une_structure()
export interface StructureDetails extends Structure {
  // Informations supplémentaires qui pourraient être dans la DB
  description?: string;
  website?: string;
  siret?: string;
  responsable?: string;
  // Métadonnées de timing
  created_at: string;
  updated_at: string;
  // État de l'abonnement (depuis get_une_structure())
  etat_abonnement?: EtatAbonnement | null;
}

// Énumération des permissions disponibles
export enum Permission {
  // Permissions générales
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  MANAGE_USERS = 'MANAGE_USERS',
  ACCESS_FINANCES = 'ACCESS_FINANCES',
  EXPORT_DATA = 'EXPORT_DATA',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
  
  // Permissions spécifiques SCOLAIRE
  MANAGE_STUDENTS = 'MANAGE_STUDENTS',
  VIEW_GRADES = 'VIEW_GRADES',
  MANAGE_COURSES = 'MANAGE_COURSES',
  
  // Permissions spécifiques COMMERCIALE
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_SALES = 'VIEW_SALES',
  
  // Permissions spécifiques IMMOBILIER
  MANAGE_PROPERTIES = 'MANAGE_PROPERTIES',
  MANAGE_CLIENTS = 'MANAGE_CLIENTS',
  VIEW_COMMISSIONS = 'VIEW_COMMISSIONS',
  
  // Permissions spécifiques PRESTATAIRE DE SERVICES
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  MANAGE_APPOINTMENTS = 'MANAGE_APPOINTMENTS',
  VIEW_REVENUE = 'VIEW_REVENUE',
  
  // Permissions ADMIN
  ADMIN_FULL_ACCESS = 'ADMIN_FULL_ACCESS',
  MANAGE_STRUCTURES = 'MANAGE_STRUCTURES',
  VIEW_SYSTEM_LOGS = 'VIEW_SYSTEM_LOGS'
}

// Interface pour les permissions utilisateur
export interface UserPermissions {
  // Liste des permissions accordées
  permissions: Permission[];

  // Méthodes d'aide pour vérifier les permissions
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canAccessFinances: boolean;
  canExportData: boolean;
  canEditSettings: boolean;

  // Permissions spécifiques selon le type de structure
  hasAdminAccess: boolean;
  hasManagerAccess: boolean;
  hasReadOnlyAccess: boolean;
}

// 🆕 Interface pour une fonctionnalité avec son autorisation (système PostgreSQL)
export interface Functionality {
  name: string;          // Ex: "AJOUTER FACTURE"
  allowed: boolean;      // "oui" → true, "non" → false
}

// 🆕 Interface pour les droits utilisateur complets depuis get_mes_droits()
export interface UserRights {
  id_profil: number;
  profil: string;        // Ex: "ADMIN"
  fonctionnalites: Functionality[];

  // Index pour accès rapide O(1)
  _index?: Record<string, boolean>; // Cache pour performance
}

// Configuration des permissions par profil
export interface ProfilePermissions {
  [profileName: string]: {
    defaultPermissions: Permission[];
    structureSpecificPermissions?: {
      [structureType: string]: Permission[];
    };
  };
}

// État complet d'authentification pour le Context
export interface AuthState {
  user: User | null;
  structure: StructureDetails | null;
  permissions: UserPermissions | null;
  rights: UserRights | null; // 🆕 Droits depuis PostgreSQL
  partenaire: PartenaireDetails | null; // 🆕 Infos partenaire (si id_groupe = 4)
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean; // Pour gérer l'hydration depuis localStorage
  error: string | null;
}

// Interface pour les données complètes après connexion réussie
export interface CompleteAuthData {
  user: User;
  structure: StructureDetails;
  permissions: UserPermissions;
  rights: UserRights; // 🆕 Droits depuis PostgreSQL
  token: string;
  partenaire?: PartenaireDetails; // 🆕 Infos partenaire (si id_groupe = 4)
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

// Routes de redirection selon le groupe utilisateur
export const USER_ROUTES = {
  SCOLAIRE: '/dashboard/scolaire',
  COMMERCE: '/dashboard/commerce',
  COMMERCIALE: '/dashboard/commerce', // Alias pour COMMERCIALE
  IMMOBILIER: '/dashboard/immobilier',
  'PRESTATAIRE DE SERVICES': '/dashboard/services',
  'FORMATION PRO': '/dashboard/formation',
  CLIENT: '/dashboard/client',
  ADMIN: '/dashboard/admin',
  SYSTEM: '/dashboard/admin',
  // Alias pour admin système
  'ADMIN SYSTEM': '/dashboard/admin',
  'SYSTEME': '/dashboard/admin',
  // 🆕 Partenaires (id_groupe = 4)
  PARTENAIRE: '/dashboard/partenaire'
} as const;

// Fonction pour obtenir la route de redirection
export function getUserRedirectRoute(user: User): string {
  // Log pour debug
  console.log('getUserRedirectRoute - User data:', {
    nom_groupe: user.nom_groupe,
    type_structure: user.type_structure,
    nom_profil: user.nom_profil,
    id_structure: user.id_structure,
    id_groupe: user.id_groupe
  });

  // 🆕 PRIORITÉ 0: Détecter les partenaires (id_structure=0 ET id_groupe=4)
  if (user.id_structure === 0 && user.id_groupe === 4) {
    console.log('Redirecting to partenaire dashboard (id_groupe=4)');
    return USER_ROUTES.PARTENAIRE;
  }

  // PRIORITÉ 1: Toujours vérifier d'abord le type_structure pour la redirection
  if (user.type_structure) {
    const route = USER_ROUTES[user.type_structure as keyof typeof USER_ROUTES];
    if (route) {
      console.log(`Redirecting to ${route} based on type_structure: ${user.type_structure}`);
      return route;
    }
  }

  // PRIORITÉ 2: Si pas de type_structure ou pas de route trouvée, utiliser nom_groupe
  if (user.nom_groupe) {
    const groupRoute = USER_ROUTES[user.nom_groupe as keyof typeof USER_ROUTES];
    if (groupRoute) {
      console.log(`Redirecting to ${groupRoute} based on nom_groupe: ${user.nom_groupe}`);
      return groupRoute;
    }
  }

  // PRIORITÉ 3: Si c'est un admin système global (id_structure=0 ET id_groupe=-1)
  if (user.id_structure === 0 && user.id_groupe === -1) {
    console.log('Redirecting to admin dashboard (system admin)');
    return USER_ROUTES.ADMIN;
  }

  // PRIORITÉ 4: Si c'est un admin système global (sans structure spécifique)
  if ((user.nom_profil === 'ADMIN' || user.nom_profil === 'SYSTEM') && !user.type_structure) {
    console.log('Redirecting to admin dashboard (system admin)');
    return USER_ROUTES.ADMIN;
  }

  // Fallback par défaut
  console.log('Fallback redirect to /dashboard');
  return '/dashboard';
}
