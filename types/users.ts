/**
 * Types pour le système de gestion des utilisateurs PostgreSQL
 * Basé sur get_list_utilisateurs() et add_edit_utilisateur()
 */

/**
 * Fonctionnalité associée à un utilisateur
 */
export interface UserFonctionnalite {
  /** Nom de la fonctionnalité */
  nom_fonctionnalite: string;
  /** ID de la fonctionnalité */
  id_fonctionnalite: number;
  /** Indique si l'utilisateur a accès à cette fonctionnalité */
  autorise: boolean;
}

/**
 * Groupe auquel appartient un utilisateur
 */
export interface UserGroupe {
  /** ID du groupe */
  id_groupe: number;
  /** Nom du groupe */
  nom_groupe: string;
  /** Description du groupe */
  description: string;
}

/**
 * Profil d'un utilisateur (ADMIN, CAISSIER, etc.)
 */
export interface UserProfil {
  /** ID du profil (1 = ADMIN) */
  id_profil: number;
  /** Nom du profil */
  nom_profil: string;
}

/**
 * Structure complète associée à un utilisateur
 */
export interface UserStructure {
  /** ID de la structure */
  id_structure: number;
  /** Nom de la structure */
  nom_structure: string;
  /** Code de la structure */
  code_structure: string;
  /** Type de structure (SCOLAIRE, COMMERCIALE, etc.) */
  type_structure: string;
  /** Adresse de la structure */
  adresse: string;
  /** Numéro Orange Money */
  mobile_om: string;
  /** Numéro Wave */
  mobile_wave: string;
  /** Numéro d'autorisation */
  numautorisatioon: string;
  /** Numéro marchand */
  nummarchand: string;
  /** Email de la structure */
  email: string;
  /** ID de la localité */
  id_localite: number;
  /** Indique si la structure est active */
  actif: boolean;
  /** URL du logo */
  logo: string;
}

/**
 * Données complètes d'un utilisateur
 */
export interface UtilisateurData {
  /** ID de l'utilisateur */
  id: number;
  /** Nom complet de l'utilisateur */
  username: string;
  /** Login de connexion */
  login: string;
  /** Numéro de téléphone */
  telephone: string;
  /** Indique si l'utilisateur est actif */
  actif: boolean;
  /** Indique si le mot de passe a été changé */
  pwd_changed: boolean;
  /** Date de création (ISO string) */
  user_createdat: string;
  /** Date de dernière modification (ISO string) */
  user_updatedat: string;
  /** Groupe de l'utilisateur */
  groupe: UserGroupe;
  /** Profil de l'utilisateur */
  profil: UserProfil;
  /** Structure de l'utilisateur */
  structure: UserStructure;
  /** Liste des fonctionnalités avec autorisations */
  fonctionnalites: UserFonctionnalite[];
}

/**
 * Réponse de get_list_utilisateurs()
 */
export interface UsersListResponse {
  /** Succès de l'opération */
  success: boolean;
  /** Message de retour */
  message: string;
  /** ID de la structure */
  id_structure: number;
  /** Nombre total d'utilisateurs */
  total_utilisateurs: number;
  /** Liste des utilisateurs */
  data: UtilisateurData[];
}

/**
 * Paramètres pour add_edit_utilisateur()
 */
export interface AddEditUserParams {
  /** ID de la structure */
  id_structure: number;
  /** ID du profil à assigner */
  id_profil: number;
  /** Nom complet de l'utilisateur */
  username: string;
  /** Numéro de téléphone */
  telephone: string;
  /** ID de l'utilisateur (null pour ajout, number pour édition) */
  id_user?: number | null;
}

/**
 * Réponse de add_edit_utilisateur()
 */
export interface AddEditUserResponse {
  /** Succès de l'opération */
  success: boolean;
  /** Message de retour */
  message: string;
  /** ID de l'utilisateur créé/modifié */
  id_user?: number;
}

/**
 * Constantes des profils utilisateur
 */
export const UserProfilIds = {
  ADMIN: 1,
  CAISSIER: 9
} as const;

/**
 * Helper: Vérifie si un utilisateur est admin
 */
export function isAdmin(user: UtilisateurData): boolean {
  return user.profil.id_profil === UserProfilIds.ADMIN;
}

/**
 * Helper: Obtient les initiales d'un utilisateur
 */
export function getUserInitials(username: string): string {
  const parts = username.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

/**
 * Helper: Formate la date de création
 */
export function formatUserDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}