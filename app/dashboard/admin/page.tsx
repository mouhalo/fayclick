'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  Package,
  CreditCard,
  Receipt,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Loader2,
  LogOut,
  Handshake,
  Tag
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/contexts/AuthContext';
import adminService from '@/services/admin.service';
import AdminVentesTab from '@/components/admin/AdminVentesTab';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import AdminPartenairesTab from '@/components/admin/AdminPartenairesTab';
import AdminCodesPromoTab from '@/components/admin/AdminCodesPromoTab';
import {
  AdminStatsGlobal,
  AdminStructureItem,
  AdminAbonnementItem,
  AdminListStructuresParams,
  AdminListAbonnementsParams,
  TypeStructure,
  StatutAbonnement
} from '@/types/admin.types';

// ========================================
// Données Mock (Fallback API)
// ========================================
const MOCK_STATS: AdminStatsGlobal = {
  structures: { total: 42, actives: 38 },
  produits: { total: 1250, actifs: 1180 },
  abonnements: { total: 35, actifs: 28, expires: 7 },
  transactions: { nombre_factures: 892, montant_total: 15750000 }
};

const MOCK_STRUCTURES: AdminStructureItem[] = [
  {
    id_structure: 1,
    nom_structure: 'Boutique Dakar Centre',
    type_structure: 'COMMERCIALE',
    telephone: '77 123 45 67',
    logo: null,
    actif: true,
    abonnement: { statut: 'ACTIF', type: 'MENSUEL', jours_restants: 18 },
    stats: { nombre_produits: 145, nombre_factures: 67, chiffre_affaire: 2450000 }
  },
  {
    id_structure: 2,
    nom_structure: 'École Les Petits Génies',
    type_structure: 'SCOLAIRE',
    telephone: '78 234 56 78',
    logo: null,
    actif: true,
    abonnement: { statut: 'ACTIF', type: 'ANNUEL', jours_restants: 245 },
    stats: { nombre_produits: 0, nombre_factures: 320, chiffre_affaire: 8500000 }
  },
  {
    id_structure: 3,
    nom_structure: 'Agence Immo Thiès',
    type_structure: 'IMMOBILIER',
    telephone: '76 345 67 89',
    logo: null,
    actif: true,
    abonnement: { statut: 'EXPIRE', type: 'MENSUEL', jours_restants: 0 },
    stats: { nombre_produits: 25, nombre_factures: 12, chiffre_affaire: 1800000 }
  },
  {
    id_structure: 4,
    nom_structure: 'Salon Beauté Ndeye',
    type_structure: 'PRESTATAIRE DE SERVICES',
    telephone: '70 456 78 90',
    logo: null,
    actif: true,
    abonnement: { statut: 'ACTIF', type: 'MENSUEL', jours_restants: 5 },
    stats: { nombre_produits: 18, nombre_factures: 89, chiffre_affaire: 980000 }
  },
  {
    id_structure: 5,
    nom_structure: 'SuperMarché Touba',
    type_structure: 'COMMERCIALE',
    telephone: '77 567 89 01',
    logo: null,
    actif: false,
    abonnement: { statut: 'SANS_ABONNEMENT', type: null, jours_restants: 0 },
    stats: { nombre_produits: 0, nombre_factures: 0, chiffre_affaire: 0 }
  }
];

const MOCK_ABONNEMENTS: AdminAbonnementItem[] = [
  {
    id_abonnement: 1,
    structure: { id_structure: 1, nom_structure: 'Boutique Dakar Centre', type_structure: 'COMMERCIALE' },
    type_abonnement: 'MENSUEL',
    statut: 'ACTIF',
    date_debut: '2024-12-23',
    date_fin: '2025-01-22',
    montant: 3100,
    jours_restants: 18
  },
  {
    id_abonnement: 2,
    structure: { id_structure: 2, nom_structure: 'École Les Petits Génies', type_structure: 'SCOLAIRE' },
    type_abonnement: 'ANNUEL',
    statut: 'ACTIF',
    date_debut: '2024-06-01',
    date_fin: '2025-05-31',
    montant: 36380,
    jours_restants: 245
  },
  {
    id_abonnement: 3,
    structure: { id_structure: 4, nom_structure: 'Salon Beauté Ndeye', type_structure: 'PRESTATAIRE DE SERVICES' },
    type_abonnement: 'MENSUEL',
    statut: 'ACTIF',
    date_debut: '2024-12-28',
    date_fin: '2025-01-27',
    montant: 3100,
    jours_restants: 5
  }
];

// ========================================
// Composant StatCard
// ========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  trend?: { value: number; label: string };
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-white/70 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">{trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className="p-2 bg-white/20 rounded-lg">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ========================================
// Composant Badge Statut
// ========================================

function StatutBadge({ statut }: { statut: StatutAbonnement }) {
  const colors: Record<StatutAbonnement, string> = {
    'ACTIF': 'bg-emerald-100 text-emerald-700',
    'EXPIRE': 'bg-red-100 text-red-700',
    'EN_ATTENTE': 'bg-orange-100 text-orange-700',
    'ANNULE': 'bg-gray-100 text-gray-700',
    'SANS_ABONNEMENT': 'bg-gray-100 text-gray-500'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[statut] || 'bg-gray-100'}`}>
      {statut.replace('_', ' ')}
    </span>
  );
}

// ========================================
// Page Dashboard Admin
// ========================================

export default function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth();

  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'structures' | 'abonnements' | 'ventes' | 'utilisateurs' | 'partenaires' | 'codes-promo'>('structures');

  // Données - Initialisées avec mock pour UX immédiate
  const [stats, setStats] = useState<AdminStatsGlobal>(MOCK_STATS);
  const [structures, setStructures] = useState<AdminStructureItem[]>(MOCK_STRUCTURES);
  const [abonnements, setAbonnements] = useState<AdminAbonnementItem[]>(MOCK_ABONNEMENTS);
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  // Pagination - Initialisées avec mock
  const [structuresPage, setStructuresPage] = useState(1);
  const [structuresTotal, setStructuresTotal] = useState(MOCK_STRUCTURES.length);
  const [abonnementsPage, setAbonnementsPage] = useState(1);
  const [abonnementsTotal, setAbonnementsTotal] = useState(MOCK_ABONNEMENTS.length);
  const ITEMS_PER_PAGE = 10;

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TypeStructure | ''>('');
  const [filterStatut, setFilterStatut] = useState<StatutAbonnement | ''>('');

  // Vérification auth - Admin système (id_structure = 0) ou groupe admin
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = authService.getUser();
    const isAdmin = user && (
      user.id_structure === 0 ||
      user.nom_groupe?.toUpperCase().includes('ADMIN') ||
      user.nom_groupe?.toUpperCase().includes('SYSTEM')
    );

    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [router]);

  // Chargement stats globales (avec fallback mock)
  const loadStats = useCallback(async () => {
    try {
      const response = await adminService.getStatsGlobal();
      if (response.success && response.data) {
        setStats(response.data);
        setIsUsingMockData(false);
        setError(null);
      }
      // Si pas de succès, les données mock sont déjà présentes
    } catch (err) {
      console.warn('⚠️ [ADMIN] API stats indisponible, conservation données mock');
      // Garder les données mock déjà initialisées
    }
  }, []);

  // Chargement structures (avec fallback mock)
  const loadStructures = useCallback(async () => {
    try {
      const params: AdminListStructuresParams = {
        limit: ITEMS_PER_PAGE,
        offset: (structuresPage - 1) * ITEMS_PER_PAGE
      };

      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type_structure = filterType;
      if (filterStatut) params.statut_abonnement = filterStatut;

      const response = await adminService.getListStructures(params);
      if (response.success && response.data?.structures) {
        setStructures(response.data.structures);
        setStructuresTotal(response.data.pagination.total);
        setIsUsingMockData(false);
      }
      // Si pas de succès, les données mock sont déjà présentes
    } catch (err) {
      console.warn('⚠️ [ADMIN] API structures indisponible, conservation données mock');
      // Garder les données mock déjà initialisées
    }
  }, [structuresPage, searchTerm, filterType, filterStatut]);

  // Chargement abonnements (avec fallback mock)
  const loadAbonnements = useCallback(async () => {
    try {
      const params: AdminListAbonnementsParams = {
        limit: ITEMS_PER_PAGE,
        offset: (abonnementsPage - 1) * ITEMS_PER_PAGE
      };

      if (filterStatut) params.statut = filterStatut;

      const response = await adminService.getListAbonnements(params);
      if (response.success && response.data?.abonnements) {
        setAbonnements(response.data.abonnements);
        setAbonnementsTotal(response.data.pagination.total);
        setIsUsingMockData(false);
      }
      // Si pas de succès, les données mock sont déjà présentes
    } catch (err) {
      console.warn('⚠️ [ADMIN] API abonnements indisponible, conservation données mock');
      // Garder les données mock déjà initialisées
    }
  }, [abonnementsPage, filterStatut]);

  // Chargement initial - Données mock affichées immédiatement, API en arrière-plan
  useEffect(() => {
    // Afficher immédiatement le dashboard avec données mock
    setLoading(false);
    setError('Mode démo - Données fictives');

    // Tenter de charger les vraies données en arrière-plan (sans bloquer l'UI)
    Promise.all([loadStats(), loadStructures()]).catch(console.warn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois au montage

  // Effacer l'erreur quand les vraies données sont chargées
  useEffect(() => {
    if (!isUsingMockData) {
      setError(null);
    }
  }, [isUsingMockData]);

  // Rechargement selon onglet
  useEffect(() => {
    if (activeTab === 'structures') {
      loadStructures();
    } else if (activeTab === 'abonnements') {
      loadAbonnements();
    }
  }, [activeTab, loadStructures, loadAbonnements]);

  // Formatage montants
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  // Formatage date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-white">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Administration</h1>
            <p className="text-gray-400 text-sm">Supervision globale FayClick</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadStats();
                loadStructures();
                loadAbonnements();
              }}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-sm font-medium"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Notification mode démo */}
        {error && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${
            error.includes('démo')
              ? 'bg-orange-500/20 border border-orange-500 text-orange-300'
              : 'bg-red-500/20 border border-red-500 text-red-300'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* StatCards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Structures"
              value={stats.structures.total}
              subtitle={`${stats.structures.actives} actives`}
              icon={<Building2 className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="Produits"
              value={stats.produits.total}
              subtitle={`${stats.produits.actifs} actifs`}
              icon={<Package className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              title="Abonnements"
              value={`${stats.abonnements.actifs}/${stats.abonnements.total}`}
              subtitle={`${stats.abonnements.expires} expirés`}
              icon={<CreditCard className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              title="Transactions"
              value={stats.transactions.nombre_factures}
              subtitle={`${formatMontant(stats.transactions.montant_total)} FCFA`}
              icon={<Receipt className="w-6 h-6" />}
              color="orange"
            />
          </div>
        )}

        {/* Onglets - Responsive */}
        {(() => {
          const tabs = [
            { id: 'structures', label: 'Structures', icon: Building2 },
            { id: 'abonnements', label: 'Abonnements', icon: CreditCard },
            { id: 'ventes', label: 'Ventes', icon: TrendingUp },
            { id: 'utilisateurs', label: 'Utilisateurs', icon: Users },
            { id: 'partenaires', label: 'Partenaires', icon: Handshake },
            { id: 'codes-promo', label: 'Codes Promo', icon: Tag }
          ];
          const activeTabData = tabs.find(t => t.id === activeTab);
          const ActiveIcon = activeTabData?.icon || Building2;

          return (
            <>
              {/* Mobile: Menu déroulant élégant */}
              <div className="md:hidden mb-4">
                <div className="relative">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
                    className="w-full appearance-none bg-gray-800 border border-gray-600 rounded-xl pl-12 pr-10 py-3 text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {tabs.map(tab => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ActiveIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Tablette: Scroll horizontal avec grille compacte */}
              <div className="hidden md:block lg:hidden mb-4">
                <div className="grid grid-cols-3 gap-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PC: Onglets en ligne */}
              <div className="hidden lg:flex gap-2 mb-4 border-b border-gray-700 pb-2 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {/* Contenu selon onglet */}
        <div className="bg-gray-800 rounded-xl p-4">
          {/* Onglet Structures */}
          {activeTab === 'structures' && (
            <>
              {/* Filtres */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une structure..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as TypeStructure)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Tous les types</option>
                  <option value="COMMERCIALE">Commerciale</option>
                  <option value="PRESTATAIRE DE SERVICES">Prestataire</option>
                  <option value="SCOLAIRE">Scolaire</option>
                  <option value="IMMOBILIER">Immobilier</option>
                </select>
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value as StatutAbonnement)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIF">Actif</option>
                  <option value="EXPIRE">Expiré</option>
                  <option value="SANS_ABONNEMENT">Sans abonnement</option>
                </select>
              </div>

              {/* Liste structures */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3 font-medium">Structure</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Abonnement</th>
                      <th className="pb-3 font-medium">Produits</th>
                      <th className="pb-3 font-medium">CA</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {structures.map((s) => (
                      <tr key={s.id_structure} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {s.logo ? (
                              <img src={s.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{s.nom_structure}</p>
                              <p className="text-xs text-gray-400">{s.telephone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-sm text-gray-300">{s.type_structure}</span>
                        </td>
                        <td className="py-3">
                          <StatutBadge statut={s.abonnement.statut} />
                          {s.abonnement.jours_restants > 0 && (
                            <span className="text-xs text-gray-400 ml-2">
                              {s.abonnement.jours_restants}j
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-sm">{s.stats.nombre_produits}</td>
                        <td className="py-3 text-sm">{formatMontant(s.stats.chiffre_affaire)} F</td>
                        <td className="py-3">
                          <button className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-400">
                  {structuresTotal} structure{structuresTotal > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStructuresPage(p => Math.max(1, p - 1))}
                    disabled={structuresPage === 1}
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm">
                    Page {structuresPage} / {Math.ceil(structuresTotal / ITEMS_PER_PAGE) || 1}
                  </span>
                  <button
                    onClick={() => setStructuresPage(p => p + 1)}
                    disabled={structuresPage >= Math.ceil(structuresTotal / ITEMS_PER_PAGE)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Onglet Abonnements */}
          {activeTab === 'abonnements' && (
            <>
              {/* Filtres */}
              <div className="flex gap-3 mb-4">
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value as StatutAbonnement)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIF">Actif</option>
                  <option value="EXPIRE">Expiré</option>
                  <option value="EN_ATTENTE">En attente</option>
                </select>
              </div>

              {/* Liste abonnements */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3 font-medium">Structure</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Statut</th>
                      <th className="pb-3 font-medium">Période</th>
                      <th className="pb-3 font-medium">Montant</th>
                      <th className="pb-3 font-medium">Jours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abonnements.map((a) => (
                      <tr key={a.id_abonnement} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{a.structure.nom_structure}</p>
                            <p className="text-xs text-gray-400">{a.structure.type_structure}</p>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            a.type_abonnement === 'ANNUEL'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {a.type_abonnement}
                          </span>
                        </td>
                        <td className="py-3">
                          <StatutBadge statut={a.statut} />
                        </td>
                        <td className="py-3 text-sm">
                          <div className="flex items-center gap-1 text-gray-300">
                            <Calendar className="w-3 h-3" />
                            {formatDate(a.date_debut)} - {formatDate(a.date_fin)}
                          </div>
                        </td>
                        <td className="py-3 text-sm">{formatMontant(a.montant)} F</td>
                        <td className="py-3">
                          {a.jours_restants > 0 ? (
                            <span className={`text-sm font-medium ${
                              a.jours_restants <= 7 ? 'text-orange-400' : 'text-emerald-400'
                            }`}>
                              {a.jours_restants}j
                            </span>
                          ) : (
                            <span className="text-sm text-red-400">Expiré</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-400">
                  {abonnementsTotal} abonnement{abonnementsTotal > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAbonnementsPage(p => Math.max(1, p - 1))}
                    disabled={abonnementsPage === 1}
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm">
                    Page {abonnementsPage} / {Math.ceil(abonnementsTotal / ITEMS_PER_PAGE) || 1}
                  </span>
                  <button
                    onClick={() => setAbonnementsPage(p => p + 1)}
                    disabled={abonnementsPage >= Math.ceil(abonnementsTotal / ITEMS_PER_PAGE)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Onglet Ventes */}
          {activeTab === 'ventes' && <AdminVentesTab />}

          {/* Onglet Utilisateurs */}
          {activeTab === 'utilisateurs' && <AdminUsersTab />}

          {/* Onglet Partenaires */}
          {activeTab === 'partenaires' && <AdminPartenairesTab />}

          {/* Onglet Codes Promo */}
          {activeTab === 'codes-promo' && <AdminCodesPromoTab />}
        </div>
      </div>
    </div>
  );
}
