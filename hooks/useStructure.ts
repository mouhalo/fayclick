'use client';

import { useAuth } from '@/contexts/AuthContext';
import { StructureDetails } from '@/types/auth';

/**
 * Hook pour la gestion des données de structure
 * Fournit un accès facilité aux informations de structure
 */
export function useStructure() {
  const { structure, updateStructure, user } = useAuth();

  // Informations de base
  const getStructureInfo = () => {
    if (!structure) return null;

    return {
      id: structure.id_structure,
      code: structure.code_structure,
      name: structure.nom_structure,
      type: structure.type_structure,
      address: structure.adresse,
      email: structure.email,
      logo: structure.logo,
      isActive: structure.actif
    };
  };

  // Informations de contact
  const getContactInfo = () => {
    if (!structure) return null;

    return {
      address: structure.adresse,
      email: structure.email,
      mobileOm: structure.mobile_om,
      mobileWave: structure.mobile_wave,
      website: structure.website
    };
  };

  // Informations financières
  const getFinancialInfo = () => {
    if (!structure) return null;

    return {
      merchantNumber: structure.nummarchand,
      authorizationNumber: structure.numautorisatioon,
      reversementNumber: structure.num_unik_reversement,
      siret: structure.siret
    };
  };

  // Métadonnées
  const getMetadata = () => {
    if (!structure) return null;

    return {
      createdAt: structure.created_at,
      updatedAt: structure.updated_at,
      localityId: structure.id_localite,
      typeId: structure.id_type
    };
  };

  // Type de structure avec libellé
  const getStructureType = () => {
    if (!structure) return null;

    const typeLabels: Record<string, string> = {
      'SCOLAIRE': 'École / Institution Scolaire',
      'COMMERCIALE': 'Commerce / Entreprise Commerciale',
      'IMMOBILIER': 'Agence Immobilière',
      'PRESTATAIRE DE SERVICES': 'Prestataire de Services',
      'FORMATION PRO': 'Organisme de Formation Professionnelle'
    };

    return {
      code: structure.type_structure,
      label: typeLabels[structure.type_structure] || structure.type_structure,
      isSchool: structure.type_structure === 'SCOLAIRE',
      isCommerce: structure.type_structure === 'COMMERCIALE',
      isRealEstate: structure.type_structure === 'IMMOBILIER',
      isServices: structure.type_structure === 'PRESTATAIRE DE SERVICES',
      isTraining: structure.type_structure === 'FORMATION PRO'
    };
  };

  // Vérifications de statut
  const getStatus = () => {
    if (!structure) return null;

    return {
      isActive: structure.actif,
      hasLogo: !!structure.logo,
      hasEmail: !!structure.email,
      hasPhone: !!(structure.mobile_om || structure.mobile_wave),
      hasAddress: !!structure.adresse,
      isComplete: !!(
        structure.nom_structure &&
        structure.adresse &&
        structure.email &&
        (structure.mobile_om || structure.mobile_wave)
      )
    };
  };

  // Configuration d'affichage selon le type
  const getDisplayConfig = () => {
    if (!structure) return null;

    const type = structure.type_structure;
    
    const configs = {
      'SCOLAIRE': {
        icon: '🏫',
        color: 'blue',
        primaryLabel: 'École',
        dashboardRoute: '/dashboard/scolaire'
      },
      'COMMERCIALE': {
        icon: '🏪',
        color: 'green',
        primaryLabel: 'Commerce',
        dashboardRoute: '/dashboard/commerce'
      },
      'IMMOBILIER': {
        icon: '🏠',
        color: 'purple',
        primaryLabel: 'Agence',
        dashboardRoute: '/dashboard/immobilier'
      },
      'PRESTATAIRE DE SERVICES': {
        icon: '🔧',
        color: 'indigo',
        primaryLabel: 'Services',
        dashboardRoute: '/dashboard/services'
      },
      'FORMATION PRO': {
        icon: '📚',
        color: 'orange',
        primaryLabel: 'Formation',
        dashboardRoute: '/dashboard/formation'
      }
    };

    return configs[type as keyof typeof configs] || {
      icon: '🏢',
      color: 'gray',
      primaryLabel: 'Structure',
      dashboardRoute: '/dashboard'
    };
  };

  // Mise à jour partielle de structure
  const updateStructureData = (updates: Partial<StructureDetails>) => {
    updateStructure(updates);
  };

  // Validation des données requises
  const validateStructure = () => {
    if (!structure) return { isValid: false, errors: ['Structure non trouvée'] };

    const errors: string[] = [];

    if (!structure.nom_structure) errors.push('Nom de structure requis');
    if (!structure.type_structure) errors.push('Type de structure requis');
    if (!structure.adresse) errors.push('Adresse requise');
    if (!structure.email) errors.push('Email requis');

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Relations avec l'utilisateur
  const getUserStructureRelation = () => {
    if (!structure || !user) return null;

    return {
      userId: user.id,
      userRole: user.nom_profil,
      userGroup: user.nom_groupe,
      structureId: structure.id_structure,
      structureName: structure.nom_structure,
      isOwner: user.nom_profil === 'ADMIN' || user.nom_profil === 'OWNER',
      isManager: user.nom_profil === 'MANAGER' || user.nom_profil === 'ADMIN',
      canModifyStructure: user.nom_profil === 'ADMIN' || user.nom_profil === 'SYSTEM'
    };
  };

  return {
    // Données brutes
    structure,
    
    // Informations organisées
    info: getStructureInfo(),
    contact: getContactInfo(),
    financial: getFinancialInfo(),
    metadata: getMetadata(),
    type: getStructureType(),
    status: getStatus(),
    displayConfig: getDisplayConfig(),
    userRelation: getUserStructureRelation(),
    
    // Actions
    update: updateStructureData,
    validate: validateStructure,
    
    // Vérifications rapides
    isSchool: structure?.type_structure === 'SCOLAIRE',
    isCommerce: structure?.type_structure === 'COMMERCIALE',
    isRealEstate: structure?.type_structure === 'IMMOBILIER',
    isServices: structure?.type_structure === 'PRESTATAIRE DE SERVICES',
    isTraining: structure?.type_structure === 'FORMATION PRO',
    isActive: structure?.actif || false,
    hasLogo: !!(structure?.logo),
    
    // Accesseurs rapides
    id: structure?.id_structure,
    name: structure?.nom_structure,
    typeName: structure?.type_structure,
    logo: structure?.logo,
    email: structure?.email
  };
}