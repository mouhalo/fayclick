// Types pour les données du dashboard

// Interface principale pour les statistiques dashboard
export interface DashboardStats {
  nom_structure: string;
  type_structure: 'SCOLAIRE' | 'COMMERCIALE' | 'IMMOBILIER' | 'PRESTATAIRE DE SERVICES' | 'FORMATION PRO';
  mt_total_factures: number;
  mt_total_payees: number;
  mt_total_impayees: number;
  
  // Données spécifiques SCOLAIRE
  total_eleves?: number;
  
  // Données spécifiques IMMOBILIER  
  total_clients?: number;
  
  // Données spécifiques COMMERCIALE
  total_produits?: number;
  mt_valeur_stocks?: number;
  
  // Données spécifiques PRESTATAIRE DE SERVICES
  total_services?: number;
  mt_chiffre_affaire?: number;
}

// Interface pour les données financières calculées
export interface FinancialData {
  totalRevenues: number;
  totalPaid: number;
  totalUnpaid: number;
  netBalance: number;
  // Données supplémentaires selon le type
  totalStock?: number;
  totalRevenueBusiness?: number;
}

// Interface pour les données d'affichage des stats cards
export interface StatsCardData {
  // Données communes
  totalAmount: number;
  invoicesCount: number;
  growthPercentage: number;
  
  // Données spécifiques selon le type de structure
  primaryCount: number;  // élèves, produits, clients, services, etc.
  primaryLabel: string;  // "Élèves", "Produits", "Clients", etc.
  primaryIcon: string;   // emoji pour l'icône
  primaryGrowth: number; // pourcentage de croissance
}

// Interface pour l'état de chargement
export interface DashboardState {
  stats: DashboardStats | null;
  statsCardData: StatsCardData | null;
  financialData: FinancialData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Type pour les hooks de dashboard
export interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  statsCardData: StatsCardData | null;
  financialData: FinancialData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
  lastUpdated: Date | null;
}

// Interface pour la réponse de l'API
export interface DashboardApiResponse {
  success: boolean;
  data: {
    get_dashboard: {
      nom_structure: string;
      type_structure: string;
      mt_total_factures: number;
      mt_total_payees: number;
      mt_total_impayees: number;
      // Champs spécifiques selon le type
      total_eleves?: number;
      total_clients?: number;
      total_produits?: number;
      mt_valeur_stocks?: number;
      total_services?: number;
      mt_chiffre_affaire?: number;
    };
  };
}

// Configuration pour les différents types de structure
export interface StructureConfig {
  type: string;
  primaryMetric: {
    key: keyof DashboardStats;
    label: string;
    icon: string;
    unit: string;
  };
  secondaryMetric: {
    key: keyof DashboardStats;
    label: string;
    icon: string;
    unit: string;
  };
  financialMetrics: {
    totalLabel: string;
    paidLabel: string;
    unpaidLabel: string;
    netLabel: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Configurations prédéfinies pour chaque type de structure
export const STRUCTURE_CONFIGS: Record<string, StructureConfig> = {
  SCOLAIRE: {
    type: 'SCOLAIRE',
    primaryMetric: {
      key: 'total_eleves',
      label: 'Élèves',
      icon: '👨‍🎓',
      unit: ''
    },
    secondaryMetric: {
      key: 'mt_total_factures',
      label: 'Total',
      icon: '💰',
      unit: 'FCFA'
    },
    financialMetrics: {
      totalLabel: 'Revenus Totaux de l\'École',
      paidLabel: 'Factures Encaissées',
      unpaidLabel: 'Factures Impayées', 
      netLabel: 'Solde Net'
    },
    colors: {
      primary: 'blue',
      secondary: 'orange', 
      accent: 'green'
    }
  },
  IMMOBILIER: {
    type: 'IMMOBILIER',
    primaryMetric: {
      key: 'total_clients',
      label: 'Clients',
      icon: '🏠',
      unit: ''
    },
    secondaryMetric: {
      key: 'mt_total_factures',
      label: 'Total',
      icon: '💰',
      unit: 'FCFA'
    },
    financialMetrics: {
      totalLabel: 'Revenus Totaux de l\'Agence',
      paidLabel: 'Commissions Perçues',
      unpaidLabel: 'Factures Impayées',
      netLabel: 'Solde Net'
    },
    colors: {
      primary: 'purple',
      secondary: 'orange',
      accent: 'green'
    }
  },
  COMMERCIALE: {
    type: 'COMMERCIALE',
    primaryMetric: {
      key: 'total_produits',
      label: 'Produits',
      icon: '📦',
      unit: ''
    },
    secondaryMetric: {
      key: 'total_clients',
      label: 'Clients',
      icon: '👥',
      unit: ''
    },
    financialMetrics: {
      totalLabel: 'Chiffre d\'Affaires Total',
      paidLabel: 'Total Ventes',
      unpaidLabel: 'Charges & Achats',
      netLabel: 'Solde Net'
    },
    colors: {
      primary: 'green',
      secondary: 'orange',
      accent: 'blue'
    }
  },
  'PRESTATAIRE DE SERVICES': {
    type: 'PRESTATAIRE DE SERVICES',
    primaryMetric: {
      key: 'total_services',
      label: 'Services',
      icon: '🔧',
      unit: ''
    },
    secondaryMetric: {
      key: 'total_clients',
      label: 'Clients',
      icon: '👥',
      unit: ''
    },
    financialMetrics: {
      totalLabel: 'Chiffre d\'Affaires Total',
      paidLabel: 'Prestations Réalisées',
      unpaidLabel: 'Prestations Impayées',
      netLabel: 'Solde Net'
    },
    colors: {
      primary: 'indigo',
      secondary: 'orange',
      accent: 'green'
    }
  }
};

// Fonction utilitaire pour obtenir la configuration d'une structure
export function getStructureConfig(type_structure: string): StructureConfig {
  return STRUCTURE_CONFIGS[type_structure] || STRUCTURE_CONFIGS.COMMERCIALE;
}

// Types pour les erreurs spécifiques au dashboard
export interface DashboardError {
  code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'INVALID_DATA';
  message: string;
  details?: any;
}

// Interface pour le cache des données
export interface DashboardCacheEntry {
  data: DashboardStats;
  timestamp: number;
  expiresAt: number;
}

// Types pour les métriques de performance
export interface DashboardMetrics {
  loadTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastRefresh: Date;
}

// Enumération des types de structures supportés
export enum StructureType {
  SCOLAIRE = 'SCOLAIRE',
  COMMERCIALE = 'COMMERCIALE', 
  IMMOBILIER = 'IMMOBILIER',
  PRESTATAIRE_DE_SERVICES = 'PRESTATAIRE DE SERVICES',
  FORMATION_PRO = 'FORMATION PRO'
}

// Interface pour les événements du dashboard
export interface DashboardEvent {
  type: 'REFRESH' | 'ERROR' | 'CACHE_HIT' | 'CACHE_MISS' | 'DATA_UPDATED';
  timestamp: Date;
  details?: any;
}