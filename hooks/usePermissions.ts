'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/types/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/config/permissions';
import { canViewSensitiveData, canAccessRoute } from '@/utils/permissions';

/**
 * Hook pour la gestion des permissions utilisateur
 * Fournit des méthodes pratiques pour vérifier les droits
 */
export function usePermissions() {
  const { permissions, user, structure } = useAuth();

  // Vérifier une permission spécifique
  const can = (permission: Permission): boolean => {
    if (!permissions) return false;
    return hasPermission(permissions.permissions, permission);
  };

  // Vérifier plusieurs permissions (AU MOINS UNE)
  const canAny = (perms: Permission[]): boolean => {
    if (!permissions) return false;
    return hasAnyPermission(permissions.permissions, perms);
  };

  // Vérifier plusieurs permissions (TOUTES)
  const canAll = (perms: Permission[]): boolean => {
    if (!permissions) return false;
    return hasAllPermissions(permissions.permissions, perms);
  };

  // Accès aux données sensibles
  const canViewFinancial = (): boolean => {
    if (!permissions) return false;
    return canViewSensitiveData(permissions, 'financial');
  };

  const canViewPersonal = (): boolean => {
    if (!permissions) return false;
    return canViewSensitiveData(permissions, 'personal');
  };

  const canViewSystem = (): boolean => {
    if (!permissions) return false;
    return canViewSensitiveData(permissions, 'system');
  };

  // Vérification d'accès aux routes
  const canAccess = (route: string): boolean => {
    if (!permissions) return false;
    return canAccessRoute(permissions, route);
  };

  // Permissions spécifiques selon le type de structure
  const getStructurePermissions = () => {
    if (!structure || !permissions) return [];
    
    const structureType = structure.type_structure.toUpperCase();
    
    switch (structureType) {
      case 'SCOLAIRE':
        return {
          canManageStudents: can(Permission.MANAGE_STUDENTS),
          canViewGrades: can(Permission.VIEW_GRADES),
          canManageCourses: can(Permission.MANAGE_COURSES)
        };
      
      case 'COMMERCIALE':
        return {
          canManageProducts: can(Permission.MANAGE_PRODUCTS),
          canManageInventory: can(Permission.MANAGE_INVENTORY),
          canViewSales: can(Permission.VIEW_SALES)
        };
      
      case 'IMMOBILIER':
        return {
          canManageProperties: can(Permission.MANAGE_PROPERTIES),
          canManageClients: can(Permission.MANAGE_CLIENTS),
          canViewCommissions: can(Permission.VIEW_COMMISSIONS)
        };
      
      case 'PRESTATAIRE DE SERVICES':
        return {
          canManageServices: can(Permission.MANAGE_SERVICES),
          canManageAppointments: can(Permission.MANAGE_APPOINTMENTS),
          canViewRevenue: can(Permission.VIEW_REVENUE)
        };
      
      default:
        return {};
    }
  };

  // Informations sur le niveau d'accès
  const getAccessLevel = () => {
    if (!permissions) return 'none';
    
    if (permissions.hasAdminAccess) return 'admin';
    if (permissions.hasManagerAccess) return 'manager';
    if (permissions.hasReadOnlyAccess) return 'readonly';
    
    return 'user';
  };

  // Vérifications courantes groupées
  const checks = {
    // Gestion générale
    canViewDashboard: permissions?.canViewDashboard || false,
    canManageUsers: permissions?.canManageUsers || false,
    canAccessFinances: permissions?.canAccessFinances || false,
    canExportData: permissions?.canExportData || false,
    canEditSettings: permissions?.canEditSettings || false,
    
    // Niveaux d'accès
    isAdmin: permissions?.hasAdminAccess || false,
    isManager: permissions?.hasManagerAccess || false,
    isReadOnly: permissions?.hasReadOnlyAccess || false,
    
    // Données sensibles
    canViewFinancialData: canViewFinancial(),
    canViewPersonalData: canViewPersonal(),
    canViewSystemData: canViewSystem(),
    
    // Navigation
    canAccessAdminPanel: canAccess('/dashboard/admin'),
    canAccessUserManagement: canAccess('/dashboard/users'),
    canAccessFinancePanel: canAccess('/dashboard/finances')
  };

  return {
    // Méthodes de vérification
    can,
    canAny,
    canAll,
    canAccess,
    
    // Données sensibles
    canViewFinancial,
    canViewPersonal,
    canViewSystem,
    
    // Informations contextuelles
    getAccessLevel,
    getStructurePermissions,
    
    // Vérifications courantes
    checks,
    
    // Données brutes pour cas avancés
    permissions: permissions?.permissions || [],
    userPermissions: permissions
  };
}

/**
 * Hook pour les permissions spécifiques à une structure
 * @param structureType - Type de structure (optionnel, utilise l'actuelle par défaut)
 */
export function useStructurePermissions(structureType?: string) {
  const { permissions, structure } = useAuth();
  const { can } = usePermissions();
  
  const targetStructureType = structureType || structure?.type_structure || '';
  
  const getPermissionsForStructure = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SCOLAIRE':
        return {
          canManageStudents: can(Permission.MANAGE_STUDENTS),
          canViewGrades: can(Permission.VIEW_GRADES),
          canManageCourses: can(Permission.MANAGE_COURSES),
          permissions: [
            Permission.MANAGE_STUDENTS,
            Permission.VIEW_GRADES,
            Permission.MANAGE_COURSES
          ]
        };
      
      case 'COMMERCIALE':
        return {
          canManageProducts: can(Permission.MANAGE_PRODUCTS),
          canManageInventory: can(Permission.MANAGE_INVENTORY),
          canViewSales: can(Permission.VIEW_SALES),
          permissions: [
            Permission.MANAGE_PRODUCTS,
            Permission.MANAGE_INVENTORY,
            Permission.VIEW_SALES
          ]
        };
      
      case 'IMMOBILIER':
        return {
          canManageProperties: can(Permission.MANAGE_PROPERTIES),
          canManageClients: can(Permission.MANAGE_CLIENTS),
          canViewCommissions: can(Permission.VIEW_COMMISSIONS),
          permissions: [
            Permission.MANAGE_PROPERTIES,
            Permission.MANAGE_CLIENTS,
            Permission.VIEW_COMMISSIONS
          ]
        };
      
      case 'PRESTATAIRE DE SERVICES':
        return {
          canManageServices: can(Permission.MANAGE_SERVICES),
          canManageAppointments: can(Permission.MANAGE_APPOINTMENTS),
          canViewRevenue: can(Permission.VIEW_REVENUE),
          permissions: [
            Permission.MANAGE_SERVICES,
            Permission.MANAGE_APPOINTMENTS,
            Permission.VIEW_REVENUE
          ]
        };
      
      default:
        return {
          permissions: []
        };
    }
  };

  return {
    structureType: targetStructureType,
    ...getPermissionsForStructure(targetStructureType)
  };
}