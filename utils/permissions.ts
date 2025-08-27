import { UserPermissions, Permission, User, StructureDetails } from '@/types/auth';
import { calculateUserPermissions, hasPermission } from '@/config/permissions';

/**
 * Crée un objet UserPermissions complet à partir d'un utilisateur et de sa structure
 * @param user - Données utilisateur
 * @param structure - Détails de la structure
 * @returns Objet UserPermissions complet
 */
export function createUserPermissions(user: User, structure: StructureDetails): UserPermissions {
  // Calculer les permissions basées sur le profil et le type de structure
  const permissions = calculateUserPermissions(
    user.nom_profil || user.profil?.nom_profil || 'USER',
    structure.type_structure
  );

  return {
    permissions,
    
    // Méthodes d'aide pour les permissions courantes
    canViewDashboard: hasPermission(permissions, Permission.VIEW_DASHBOARD),
    canManageUsers: hasPermission(permissions, Permission.MANAGE_USERS),
    canAccessFinances: hasPermission(permissions, Permission.ACCESS_FINANCES),
    canExportData: hasPermission(permissions, Permission.EXPORT_DATA),
    canEditSettings: hasPermission(permissions, Permission.EDIT_SETTINGS),
    
    // Niveaux d'accès
    hasAdminAccess: hasPermission(permissions, Permission.ADMIN_FULL_ACCESS),
    hasManagerAccess: hasPermission(permissions, Permission.MANAGE_USERS),
    hasReadOnlyAccess: permissions.length === 1 && hasPermission(permissions, Permission.VIEW_DASHBOARD)
  };
}

/**
 * Vérifie si un utilisateur peut accéder à une route spécifique
 * @param userPermissions - Permissions de l'utilisateur
 * @param route - Route à vérifier
 * @returns true si l'accès est autorisé
 */
export function canAccessRoute(userPermissions: UserPermissions, route: string): boolean {
  // Admin a accès à tout
  if (userPermissions.hasAdminAccess) {
    return true;
  }

  // Mapping des routes vers les permissions requises
  const routePermissions: Record<string, Permission[]> = {
    '/dashboard': [Permission.VIEW_DASHBOARD],
    '/dashboard/scolaire': [Permission.VIEW_DASHBOARD],
    '/dashboard/commerce': [Permission.VIEW_DASHBOARD],
    '/dashboard/immobilier': [Permission.VIEW_DASHBOARD],
    '/dashboard/services': [Permission.VIEW_DASHBOARD],
    '/dashboard/admin': [Permission.ADMIN_FULL_ACCESS],
    '/dashboard/users': [Permission.MANAGE_USERS],
    '/dashboard/settings': [Permission.EDIT_SETTINGS],
    '/dashboard/finances': [Permission.ACCESS_FINANCES],
    '/dashboard/exports': [Permission.EXPORT_DATA],
    
    // Routes spécifiques selon le type
    '/dashboard/scolaire/students': [Permission.MANAGE_STUDENTS, Permission.VIEW_DASHBOARD],
    '/dashboard/scolaire/grades': [Permission.VIEW_GRADES],
    '/dashboard/commerce/products': [Permission.MANAGE_PRODUCTS, Permission.VIEW_DASHBOARD],
    '/dashboard/commerce/inventory': [Permission.MANAGE_INVENTORY],
    '/dashboard/immobilier/properties': [Permission.MANAGE_PROPERTIES, Permission.VIEW_DASHBOARD],
    '/dashboard/immobilier/clients': [Permission.MANAGE_CLIENTS],
  };

  const requiredPermissions = routePermissions[route];
  
  if (!requiredPermissions) {
    // Si la route n'est pas dans la liste, autoriser l'accès par défaut
    return true;
  }

  // Vérifier si l'utilisateur a au moins une des permissions requises
  return requiredPermissions.some(permission => 
    userPermissions.permissions.includes(permission)
  );
}

/**
 * Filtre les éléments de menu selon les permissions utilisateur
 * @param userPermissions - Permissions de l'utilisateur
 * @param menuItems - Éléments de menu avec permissions requises
 * @returns Éléments de menu filtrés
 */
export function filterMenuByPermissions<T extends { permission?: Permission }>(
  userPermissions: UserPermissions,
  menuItems: T[]
): T[] {
  return menuItems.filter(item => {
    if (!item.permission) {
      return true; // Pas de permission requise
    }
    
    return userPermissions.permissions.includes(item.permission);
  });
}

/**
 * Détermine si des données sensibles peuvent être affichées
 * @param userPermissions - Permissions de l'utilisateur
 * @param dataType - Type de données ('financial', 'personal', 'system')
 * @returns true si les données peuvent être affichées
 */
export function canViewSensitiveData(
  userPermissions: UserPermissions, 
  dataType: 'financial' | 'personal' | 'system'
): boolean {
  switch (dataType) {
    case 'financial':
      return userPermissions.canAccessFinances || userPermissions.hasAdminAccess;
    
    case 'personal':
      return userPermissions.canManageUsers || userPermissions.hasAdminAccess;
    
    case 'system':
      return userPermissions.hasAdminAccess;
    
    default:
      return false;
  }
}