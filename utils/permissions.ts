import { UserPermissions, Permission, User, StructureDetails, UserRights, Functionality } from '@/types/auth';
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

// ============================================
// 🆕 SYSTÈME DE DROITS POSTGRESQL (get_mes_droits)
// ============================================

/**
 * Parse les données brutes retournées par get_mes_droits() PostgreSQL
 * Transforme le format JSON PostgreSQL en objet UserRights typé
 *
 * Format d'entrée:
 * {
 *   "id_profil": 1,
 *   "profil": "ADMIN",
 *   "fonctionnalites": [
 *     {"AJOUTER FACTURE": "non"},
 *     {"SUPPRIMER FACTURE": "oui"},
 *     ...
 *   ]
 * }
 *
 * @param rawData - Données brutes depuis PostgreSQL
 * @returns Objet UserRights typé avec index de performance
 */
export function parseUserRights(rawData: any): UserRights {
  try {
    console.log('🔍 [PARSER] Parsing UserRights depuis PostgreSQL:', rawData);

    // Valider les données d'entrée
    if (!rawData || typeof rawData !== 'object') {
      console.error('❌ [PARSER] Données invalides:', rawData);
      throw new Error('Données de droits invalides');
    }

    // Extraire et valider les champs obligatoires
    const id_profil = Number(rawData.id_profil);
    const profil = String(rawData.profil || '');
    const fonctionnalitesRaw = rawData.fonctionnalites || [];

    if (!Array.isArray(fonctionnalitesRaw)) {
      console.error('❌ [PARSER] fonctionnalites n\'est pas un tableau:', fonctionnalitesRaw);
      throw new Error('Format de fonctionnalités invalide');
    }

    // Transformer chaque fonctionnalité: {"NOM": "oui/non"} → {name: "NOM", allowed: true/false}
    const fonctionnalites: Functionality[] = fonctionnalitesRaw.map((func: any) => {
      // Récupérer la première (et unique) entrée de l'objet
      const entries = Object.entries(func);
      if (entries.length === 0) {
        console.warn('⚠️ [PARSER] Fonctionnalité vide:', func);
        return { name: '', allowed: false };
      }

      const [name, value] = entries[0] as [string, string];
      const allowed = value?.toLowerCase() === 'oui';

      return { name, allowed };
    }).filter(f => f.name !== ''); // Supprimer les entrées vides

    // Créer l'index pour accès rapide O(1)
    const index: Record<string, boolean> = {};
    fonctionnalites.forEach(f => {
      index[f.name] = f.allowed;
    });

    const userRights: UserRights = {
      id_profil,
      profil,
      fonctionnalites,
      _index: index
    };

    console.log('✅ [PARSER] UserRights parsé avec succès:', {
      profil: userRights.profil,
      nb_fonctionnalites: userRights.fonctionnalites.length,
      fonctionnalites_actives: userRights.fonctionnalites.filter(f => f.allowed).length
    });

    return userRights;

  } catch (error) {
    console.error('❌ [PARSER] Erreur parsing UserRights:', error);

    // Retourner un objet par défaut sécuritaire (aucun droit)
    return {
      id_profil: 0,
      profil: 'UNKNOWN',
      fonctionnalites: [],
      _index: {}
    };
  }
}

/**
 * Vérifie si l'utilisateur a le droit d'exécuter une fonctionnalité
 * Performance O(1) grâce à l'index
 *
 * @param rights - Droits de l'utilisateur
 * @param functionalityName - Nom exact de la fonctionnalité (ex: "AJOUTER FACTURE")
 * @returns true si autorisé, false sinon
 */
export function hasRight(rights: UserRights | null, functionalityName: string): boolean {
  if (!rights || !functionalityName) {
    return false;
  }

  // ⭐ ADMIN (id_profil = 1) a TOUS les droits automatiquement
  if (rights.id_profil === 1) {
    return true;
  }

  // Utiliser l'index pour performance O(1)
  if (rights._index) {
    return rights._index[functionalityName] === true;
  }

  // Fallback: recherche linéaire si pas d'index
  const functionality = rights.fonctionnalites.find(f => f.name === functionalityName);
  return functionality?.allowed === true;
}

/**
 * Vérifie si l'utilisateur a TOUS les droits spécifiés (ET logique)
 *
 * @param rights - Droits de l'utilisateur
 * @param functionalityNames - Liste des noms de fonctionnalités
 * @returns true si TOUS les droits sont accordés
 */
export function hasAllRights(rights: UserRights | null, functionalityNames: string[]): boolean {
  if (!rights || !functionalityNames || functionalityNames.length === 0) {
    return false;
  }

  // ⭐ ADMIN (id_profil = 1) a TOUS les droits automatiquement
  if (rights.id_profil === 1) {
    return true;
  }

  return functionalityNames.every(name => hasRight(rights, name));
}

/**
 * Vérifie si l'utilisateur a AU MOINS UN des droits spécifiés (OU logique)
 *
 * @param rights - Droits de l'utilisateur
 * @param functionalityNames - Liste des noms de fonctionnalités
 * @returns true si AU MOINS UN droit est accordé
 */
export function hasAnyRight(rights: UserRights | null, functionalityNames: string[]): boolean {
  if (!rights || !functionalityNames || functionalityNames.length === 0) {
    return false;
  }

  // ⭐ ADMIN (id_profil = 1) a TOUS les droits automatiquement
  if (rights.id_profil === 1) {
    return true;
  }

  return functionalityNames.some(name => hasRight(rights, name));
}

/**
 * Récupère la liste de toutes les fonctionnalités autorisées
 * Utile pour l'affichage ou le debug
 *
 * @param rights - Droits de l'utilisateur
 * @returns Tableau des noms de fonctionnalités autorisées
 */
export function getAllowedFunctionalities(rights: UserRights | null): string[] {
  if (!rights) {
    return [];
  }

  // ⭐ ADMIN (id_profil = 1) a TOUTES les fonctionnalités autorisées
  if (rights.id_profil === 1) {
    return rights.fonctionnalites.map(f => f.name);
  }

  return rights.fonctionnalites
    .filter(f => f.allowed)
    .map(f => f.name);
}

/**
 * Récupère la liste de toutes les fonctionnalités refusées
 * Utile pour l'affichage ou le debug
 *
 * @param rights - Droits de l'utilisateur
 * @returns Tableau des noms de fonctionnalités refusées
 */
export function getDeniedFunctionalities(rights: UserRights | null): string[] {
  if (!rights) {
    return [];
  }

  // ⭐ ADMIN (id_profil = 1) n'a AUCUNE fonctionnalité refusée
  if (rights.id_profil === 1) {
    return [];
  }

  return rights.fonctionnalites
    .filter(f => !f.allowed)
    .map(f => f.name);
}