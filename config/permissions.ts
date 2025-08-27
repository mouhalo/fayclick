import { Permission, ProfilePermissions } from '@/types/auth';

/**
 * Configuration des permissions par profil utilisateur
 * Définit les permissions par défaut et spécifiques selon le type de structure
 */
export const PROFILE_PERMISSIONS: ProfilePermissions = {
  // Profil ADMIN - Accès complet
  'ADMIN': {
    defaultPermissions: [
      Permission.ADMIN_FULL_ACCESS,
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_USERS,
      Permission.ACCESS_FINANCES,
      Permission.EXPORT_DATA,
      Permission.EDIT_SETTINGS,
      Permission.MANAGE_STRUCTURES,
      Permission.VIEW_SYSTEM_LOGS
    ]
  },

  // Profil SYSTEM - Accès système complet
  'SYSTEM': {
    defaultPermissions: [
      Permission.ADMIN_FULL_ACCESS,
      Permission.MANAGE_STRUCTURES,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_USERS,
      Permission.ACCESS_FINANCES,
      Permission.EXPORT_DATA,
      Permission.EDIT_SETTINGS
    ]
  },

  // Profil MANAGER - Gestion selon le type de structure
  'MANAGER': {
    defaultPermissions: [
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_USERS,
      Permission.ACCESS_FINANCES,
      Permission.EXPORT_DATA,
      Permission.EDIT_SETTINGS
    ],
    structureSpecificPermissions: {
      'SCOLAIRE': [
        Permission.MANAGE_STUDENTS,
        Permission.VIEW_GRADES,
        Permission.MANAGE_COURSES
      ],
      'COMMERCIALE': [
        Permission.MANAGE_PRODUCTS,
        Permission.MANAGE_INVENTORY,
        Permission.VIEW_SALES
      ],
      'IMMOBILIER': [
        Permission.MANAGE_PROPERTIES,
        Permission.MANAGE_CLIENTS,
        Permission.VIEW_COMMISSIONS
      ],
      'PRESTATAIRE DE SERVICES': [
        Permission.MANAGE_SERVICES,
        Permission.MANAGE_APPOINTMENTS,
        Permission.VIEW_REVENUE
      ]
    }
  },

  // Profil USER - Utilisateur standard
  'USER': {
    defaultPermissions: [
      Permission.VIEW_DASHBOARD,
      Permission.ACCESS_FINANCES
    ],
    structureSpecificPermissions: {
      'SCOLAIRE': [
        Permission.VIEW_GRADES
      ],
      'COMMERCIALE': [
        Permission.VIEW_SALES
      ],
      'IMMOBILIER': [
        Permission.VIEW_COMMISSIONS
      ],
      'PRESTATAIRE DE SERVICES': [
        Permission.VIEW_REVENUE
      ]
    }
  },

  // Profil EMPLOYEE - Employé avec accès limité
  'EMPLOYEE': {
    defaultPermissions: [
      Permission.VIEW_DASHBOARD
    ],
    structureSpecificPermissions: {
      'SCOLAIRE': [
        Permission.VIEW_GRADES
      ],
      'COMMERCIALE': [
        Permission.VIEW_SALES
      ],
      'IMMOBILIER': [
        Permission.VIEW_COMMISSIONS
      ],
      'PRESTATAIRE DE SERVICES': [
        Permission.VIEW_REVENUE
      ]
    }
  },

  // Profil READ_ONLY - Lecture seule
  'READ_ONLY': {
    defaultPermissions: [
      Permission.VIEW_DASHBOARD
    ]
  }
};

/**
 * Fonction pour calculer les permissions d'un utilisateur
 * @param profileName - Nom du profil utilisateur
 * @param structureType - Type de structure
 * @returns Liste des permissions
 */
export function calculateUserPermissions(
  profileName: string, 
  structureType: string
): Permission[] {
  const profileConfig = PROFILE_PERMISSIONS[profileName.toUpperCase()];
  
  if (!profileConfig) {
    console.warn(`Profil '${profileName}' non reconnu, utilisation des permissions par défaut`);
    return [Permission.VIEW_DASHBOARD];
  }

  // Permissions par défaut du profil
  const permissions = [...profileConfig.defaultPermissions];

  // Ajouter les permissions spécifiques à la structure
  if (profileConfig.structureSpecificPermissions && structureType) {
    const structurePermissions = profileConfig.structureSpecificPermissions[structureType];
    if (structurePermissions) {
      permissions.push(...structurePermissions);
    }
  }

  // Supprimer les doublons et retourner
  return Array.from(new Set(permissions));
}

/**
 * Vérifie si un utilisateur a une permission spécifique
 * @param userPermissions - Permissions de l'utilisateur
 * @param permission - Permission à vérifier
 * @returns true si l'utilisateur a la permission
 */
export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  // Si l'utilisateur a un accès admin complet, il a toutes les permissions
  if (userPermissions.includes(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return userPermissions.includes(permission);
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées
 * @param userPermissions - Permissions de l'utilisateur
 * @param permissions - Permissions à vérifier
 * @returns true si l'utilisateur a au moins une permission
 */
export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userPermissions, permission));
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées
 * @param userPermissions - Permissions de l'utilisateur
 * @param permissions - Permissions à vérifier
 * @returns true si l'utilisateur a toutes les permissions
 */
export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userPermissions, permission));
}