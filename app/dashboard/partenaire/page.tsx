'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Receipt,
  Users,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  LogOut,
  Handshake,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Percent,
  Wallet,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import partenaireService from '@/services/partenaire.service';
import PartenaireVentesTab from '@/components/partenaire/PartenaireVentesTab';
import { ModalDetailStructure } from '@/components/admin/ModalDetailStructure';
import {
  PartenaireStats,
  PartenaireStructureItem,
  PartenaireListStructuresParams,
  PARTENAIRE_TYPE_STRUCTURE_OPTIONS,
  PARTENAIRE_STATUT_ABONNEMENT_OPTIONS
} from '@/types/partenaire.types';

// ========================================
// Types onglets
// ========================================
type TabType = 'structures' | 'ventes';

// ========================================
// Types tri
// ========================================
type SortColumn = 'nom_structure' | 'type_structure' | 'statut_abonnement' | 'nb_produits' | 'nb_factures';
type SortDirection = 'asc' | 'desc';

// ========================================
// Composant StatCard
// ========================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
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
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
          <p className="text-xs text-white/60 mt-1">{subtitle}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-lg">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ========================================
// Composant Badge Statut Abonnement
// ========================================
function StatutBadge({ statut, joursRestants }: { statut: string; joursRestants?: number }) {
  const config = {
    ACTIF: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
    EXPIRE: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
    SANS_ABONNEMENT: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Clock },
    EN_ATTENTE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock }
  };

  const { bg, text, icon: Icon } = config[statut as keyof typeof config] || config.SANS_ABONNEMENT;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${text}`} />
      <span className={`text-xs font-medium ${text}`}>
        {statut === 'ACTIF' && joursRestants !== undefined
          ? `${joursRestants}j`
          : statut.replace('_', ' ')
        }
      </span>
    </div>
  );
}

// ========================================
// Page Dashboard Partenaire
// ========================================
export default function DashboardPartenairePage() {
  const router = useRouter();
  const { user, partenaire, logout, isAuthenticated, isHydrated } = useAuth();

  // État chargement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [stats, setStats] = useState<PartenaireStats | null>(null);
  const [structures, setStructures] = useState<PartenaireStructureItem[]>([]);
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [revenuTotal, setRevenuTotal] = useState<number>(0);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 15,
    offset: 0,
    pages: 0,
    current_page: 1
  });

  // Onglet actif
  const [activeTab, setActiveTab] = useState<TabType>('structures');

  // Clé pour forcer le rafraîchissement de l'onglet Ventes
  const [ventesRefreshKey, setVentesRefreshKey] = useState(0);

  // Filtres
  const [filters, setFilters] = useState<PartenaireListStructuresParams>({
    limit: 15,
    offset: 0,
    search: '',
    type_structure: '',
    statut_abonnement: ''
  });
  const [searchInput, setSearchInput] = useState('');

  // Tri
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal détail structure
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ========================================
  // Vérification d'accès
  // ========================================
  useEffect(() => {
    if (!isHydrated) return;

    // Vérifier que l'utilisateur est un partenaire
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Vérifier id_groupe = 4 (partenaire)
    if (user?.id_groupe !== 4) {
      console.warn('Accès refusé: pas un partenaire');
      router.push('/dashboard');
      return;
    }

    // Vérifier que les infos partenaire sont disponibles
    if (!partenaire) {
      console.warn('Infos partenaire non disponibles');
      setError('Impossible de charger les informations du partenaire');
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [isHydrated, isAuthenticated, user, partenaire, router]);

  // ========================================
  // Chargement des données
  // ========================================
  const loadStats = useCallback(async () => {
    if (!partenaire?.id_partenaire) return;

    try {
      const response = await partenaireService.getStats(partenaire.id_partenaire);
      if (response.success && response.structures) {
        // Les stats sont directement dans la réponse (pas dans response.data)
        setStats(response);
      } else {
        setError(response.message || 'Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      setError('Erreur de connexion au serveur');
    }
  }, [partenaire?.id_partenaire]);

  const loadStructures = useCallback(async () => {
    if (!partenaire?.id_partenaire) return;

    try {
      const response = await partenaireService.getStructures(partenaire.id_partenaire, filters);
      if (response.success) {
        // Les données sont directement dans la réponse (pas dans response.data)
        setStructures(response.structures || []);
        // Récupérer commission et revenu total
        setCommissionPct(response.commission_pct || 0);
        setRevenuTotal(response.revenu_total_partenaire || 0);
        const total = response.total || 0;
        const limit = response.limit || 15;
        setPagination({
          total,
          limit,
          offset: response.offset || 0,
          pages: Math.ceil(total / limit),
          current_page: Math.floor((response.offset || 0) / limit) + 1
        });
      } else {
        setError(response.message || 'Erreur lors du chargement des structures');
      }
    } catch (err) {
      console.error('Erreur chargement structures:', err);
      setError('Erreur de connexion au serveur');
    }
  }, [partenaire?.id_partenaire, filters]);

  // Charger les données initiales
  useEffect(() => {
    if (partenaire?.id_partenaire && !loading) {
      loadStats();
      loadStructures();
    }
  }, [partenaire?.id_partenaire, loading, loadStats, loadStructures]);

  // ========================================
  // Gestion de la recherche
  // ========================================
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchInput,
      offset: 0
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0
    }));
  };

  // ========================================
  // Pagination
  // ========================================
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters(prev => ({
      ...prev,
      offset: (newPage - 1) * prev.limit!
    }));
  };

  // ========================================
  // Tri
  // ========================================
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Inverser la direction si même colonne
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, commencer par asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-500" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-orange-400" />
      : <ArrowDown className="w-4 h-4 text-orange-400" />;
  };

  // Structures triées
  const sortedStructures = [...structures].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortColumn) {
      case 'nom_structure':
        aValue = a.nom_structure.toLowerCase();
        bValue = b.nom_structure.toLowerCase();
        break;
      case 'type_structure':
        aValue = a.type_structure.toLowerCase();
        bValue = b.type_structure.toLowerCase();
        break;
      case 'statut_abonnement':
        aValue = a.statut_abonnement.toLowerCase();
        bValue = b.statut_abonnement.toLowerCase();
        break;
      case 'nb_produits':
        aValue = a.nb_produits || 0;
        bValue = b.nb_produits || 0;
        break;
      case 'nb_factures':
        aValue = a.nb_factures || 0;
        bValue = b.nb_factures || 0;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // ========================================
  // Formatage
  // ========================================
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  // ========================================
  // Écran de chargement
  // ========================================
  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-white">Chargement du dashboard partenaire...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // Rendu principal
  // ========================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {partenaire?.nom_partenaire || 'Dashboard Partenaire'}
                </h1>
                <p className="text-gray-400 text-sm flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded font-mono text-xs">
                    {partenaire?.code_promo}
                  </span>
                  <span className="hidden sm:inline">-</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {partenaire?.jours_restants}j restants
                  </span>
                </p>
                {/* Commission et Revenu */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 rounded-lg">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-sm">{commissionPct}%</span>
                    <span className="text-emerald-300/70 text-xs">commission</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 rounded-lg">
                    <Wallet className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm">
                      {new Intl.NumberFormat('fr-FR').format(revenuTotal)}
                    </span>
                    <span className="text-purple-300/70 text-xs">FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'structures') {
                  loadStats();
                  loadStructures();
                } else {
                  // Force le rechargement du composant Ventes
                  setVentesRefreshKey(prev => prev + 1);
                }
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

        {/* Message d'erreur */}
        {error && (
          <div className="p-4 rounded-lg mb-6 flex items-center gap-2 bg-red-500/20 border border-red-500 text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              &times;
            </button>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('structures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'structures'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Structures
          </button>
          <button
            onClick={() => setActiveTab('ventes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'ventes'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Ventes
          </button>
        </div>

        {/* Contenu onglet Structures */}
        {activeTab === 'structures' && (
          <>
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
              title="Abonnements"
              value={stats.abonnements.actifs}
              subtitle={`${stats.abonnements.expires} expirés`}
              icon={<Users className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              title="CA Total"
              value={formatMontant(stats.finances.chiffre_affaires_total)}
              subtitle={`${stats.finances.total_factures} factures`}
              icon={<TrendingUp className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              title="CA Mois"
              value={formatMontant(stats.finances.chiffre_affaires_mois)}
              subtitle="ce mois"
              icon={<Receipt className="w-6 h-6" />}
              color="orange"
            />
          </div>
        )}

        {/* Filtres */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une structure..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Filtre type */}
            <select
              value={filters.type_structure || ''}
              onChange={(e) => handleFilterChange('type_structure', e.target.value)}
              className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              {PARTENAIRE_TYPE_STRUCTURE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Filtre statut */}
            <select
              value={filters.statut_abonnement || ''}
              onChange={(e) => handleFilterChange('statut_abonnement', e.target.value)}
              className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              {PARTENAIRE_STATUT_ABONNEMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Bouton rechercher */}
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
            >
              Filtrer
            </button>
          </div>
        </div>

        {/* Tableau des structures */}
        <div className="bg-gray-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('nom_structure')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      Structure
                      {getSortIcon('nom_structure')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 hidden md:table-cell">
                    <button
                      onClick={() => handleSort('type_structure')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      Type
                      {getSortIcon('type_structure')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('statut_abonnement')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto"
                    >
                      Abonnement
                      {getSortIcon('statut_abonnement')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 hidden sm:table-cell">
                    <button
                      onClick={() => handleSort('nb_produits')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto"
                    >
                      Produits
                      {getSortIcon('nb_produits')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('nb_factures')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto"
                    >
                      Factures
                      {getSortIcon('nb_factures')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {sortedStructures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <img
                        src="/images/mascotte.png"
                        alt="Aucune structure"
                        className="w-12 h-12 mx-auto mb-2 opacity-50"
                      />
                      <p>Aucune structure trouvée</p>
                      <p className="text-sm mt-1">Les structures inscrites avec votre code promo apparaîtront ici</p>
                    </td>
                  </tr>
                ) : (
                  sortedStructures.map((structure) => {
                    // Calculer jours restants si fin_abonnement disponible
                    let joursRestants: number | undefined;
                    if (structure.fin_abonnement) {
                      const finDate = new Date(structure.fin_abonnement);
                      const today = new Date();
                      const diffTime = finDate.getTime() - today.getTime();
                      joursRestants = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    }

                    return (
                      <tr key={structure.id_structure} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src="/images/mascotte.png"
                              alt="Structure"
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-white">{structure.nom_structure}</p>
                              <p className="text-xs text-gray-400 md:hidden">{structure.type_structure}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
                            {structure.type_structure}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatutBadge
                            statut={structure.statut_abonnement}
                            joursRestants={joursRestants}
                          />
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1.5">
                            <Package className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-white">{structure.nb_produits || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-gray-300">{structure.nb_factures}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedStructureId(structure.id_structure);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-700/30 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Page {pagination.current_page} sur {pagination.pages} ({pagination.total} structures)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 bg-orange-600 rounded-lg font-medium">
                  {pagination.current_page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.pages}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info onglet Structures */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Les données affichées concernent uniquement les structures inscrites avec votre code promo <span className="text-orange-400 font-mono">{partenaire?.code_promo}</span></p>
        </div>
          </>
        )}

        {/* Contenu onglet Ventes */}
        {activeTab === 'ventes' && partenaire?.id_partenaire && (
          <PartenaireVentesTab
            key={ventesRefreshKey}
            idPartenaire={partenaire.id_partenaire}
          />
        )}
      </div>

      {/* Modal détail structure */}
      <ModalDetailStructure
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedStructureId(null);
        }}
        idStructure={selectedStructureId}
      />
    </div>
  );
}
