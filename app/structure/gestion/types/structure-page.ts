// Types spécifiques à la page de gestion structure
import { User, StructureDetails, Permission } from '@/types/auth';

export type TabId = 'infos' | 'finance' | 'dashboard' | 'utilisateurs';

export interface TabItem {
  id: TabId;
  label: string;
  icon: string;
  badge?: number;
  requiredPermission?: Permission;
}

export interface TabContentProps {
  isActive: boolean;
  structure: StructureDetails;
}

// État global de la page structure
export interface StructurePageState {
  activeTab: TabId;
  structure: StructureDetails | null;
  users: User[];
  transactions: Transaction[];
  stats: any; // DashboardStats
  loading: Record<string, boolean>;
  filters: FilterState;
  error: string | null;
}

// Types pour l'onglet Finance
export interface FinanceStats {
  totalPaye: {
    amount: number;
    description: string;
    lastUpdate: Date;
    icon: string;
    color: string;
  };
  totalReverse: {
    amount: number;
    description: string;
    lastUpdate: Date;
    icon: string;
    color: string;
  };
  soldeCompte: {
    amount: number;
    description: string;
    lastUpdate: Date;
    icon: string;
    color: string;
  };
}

export interface ReversementRecord {
  reference: string;
  statut: 'EFFECTUE' | 'EN_ATTENTE' | 'ECHEC';
  date: string;
  mode: 'WALLET' | 'BANK';
  initial: number;
  taux: number;
  depose: number;
  compte: string;
  document?: string;
}

export interface Transaction {
  id: string;
  mois: string;
  credits: number;
  debits: number;
  soldeNet: number;
  totalTransactions: number;
  date: Date;
}

export interface MonthlyTransactionData {
  month: string;
  credits: number;
  debits: number;
  soldeNet: number;
  transactions: number;
}

// Types pour l'onglet Utilisateurs
export interface UserCardData {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  structureType: string;
  structureName: string;
  isActive: boolean;
  avatar?: string;
  permissions?: Permission[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface UserActionType {
  type: 'edit' | 'activate' | 'deactivate' | 'delete' | 'permissions';
  user: UserCardData;
}

// Filtres
export interface FilterState {
  search: string;
  role: string;
  status: 'all' | 'active' | 'inactive';
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  // Filtres spécifiques finance
  nomAgent?: string;
  walletCompte?: string;
  modeReversement?: 'Tous' | 'WALLET' | 'BANK';
}

// Actions utilisateurs
export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: Permission[];
  password?: string;
}

// Configuration des onglets selon le type de structure
export interface StructureTabsConfig {
  SCOLAIRE: TabItem[];
  COMMERCIALE: TabItem[];
  IMMOBILIER: TabItem[];
  'PRESTATAIRE DE SERVICES': TabItem[];
  default: TabItem[];
}

// Export des données
export interface ExportOptions {
  format: 'excel' | 'pdf';
  type: 'users' | 'transactions' | 'finance' | 'complete';
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: FilterState;
}

// Props pour les composants
export interface StructureHeaderProps {
  structure: StructureDetails;
  className?: string;
}

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isMobile?: boolean;
}

export interface InfoCardProps {
  icon: string;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
  onClick?: () => void;
}

export interface ResponsiveTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  mobileBreakpoint?: number;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'custom';
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  hidden?: {
    mobile?: boolean;
    tablet?: boolean;
  };
}