'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  Key,
  Phone,
  Calendar,
  RefreshCw,
  Loader2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import adminService from '@/services/admin.service';
import {
  AdminUtilisateur,
  AdminUtilisateursStats,
  AdminAllUtilisateursParams,
  AdminReferenceData
} from '@/types/admin.types';

// ========================================
// Types locaux
// ========================================
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

// ========================================
// Composant KPI Card
// ========================================
function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
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
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-white/70 text-xs mt-1">{subtitle}</p>
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
// Composant Badge
// ========================================
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
      {children}
    </span>
  );
}

// ========================================
// Composant Barre de progression
// ========================================
function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500'
  };

  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`${colorMap[color] || 'bg-blue-500'} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

// ========================================
// Types pour le tri
// ========================================
type UserSortColumn = 'username' | 'structure' | 'groupe' | 'statut' | 'date_creation';
type UserSortDirection = 'asc' | 'desc';

// ========================================
// Composant Principal
// ========================================
export default function AdminUsersTab() {
  // États
  const [loading, setLoading] = useState(true);
  const [utilisateurs, setUtilisateurs] = useState<AdminUtilisateur[]>([]);
  const [stats, setStats] = useState<AdminUtilisateursStats | null>(null);
  const [refData, setRefData] = useState<AdminReferenceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 15;

  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroupe, setFilterGroupe] = useState<number | undefined>();
  const [filterProfil, setFilterProfil] = useState<number | undefined>();
  const [filterActif, setFilterActif] = useState<boolean | undefined>();
  const [orderBy, setOrderBy] = useState<'createdat' | 'username' | 'login' | 'structure'>('createdat');

  // Tri colonnes tableau
  const [sortColumn, setSortColumn] = useState<UserSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<UserSortDirection>('asc');

  // Chargement des données de référence
  const loadRefData = useCallback(async () => {
    try {
      const response = await adminService.getReferenceData();
      if (response.success && response.data) {
        setRefData(response.data);
      }
    } catch (err) {
      console.warn('Erreur chargement données de référence:', err);
    }
  }, []);

  // Chargement des utilisateurs
  const loadUtilisateurs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: AdminAllUtilisateursParams = {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
        order_by: orderBy,
        order_dir: 'DESC'
      };

      if (search) params.search = search;
      if (filterGroupe !== undefined) params.id_groupe = filterGroupe;
      if (filterProfil !== undefined) params.id_profil = filterProfil;
      if (filterActif !== undefined) params.actif = filterActif;

      const response = await adminService.getAllUtilisateurs(params);

      if (response.success && response.data) {
        setUtilisateurs(response.data.utilisateurs || []);
        setStats(response.data.stats);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError('Erreur lors du chargement des utilisateurs');
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
      setError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterGroupe, filterProfil, filterActif, orderBy]);

  // Chargement initial
  useEffect(() => {
    loadRefData();
  }, [loadRefData]);

  useEffect(() => {
    loadUtilisateurs();
  }, [loadUtilisateurs]);

  // Reset page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [search, filterGroupe, filterProfil, filterActif]);

  // Formatage date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Couleur du groupe
  const getGroupeColor = (nom: string): string => {
    const lower = nom?.toLowerCase() || '';
    if (lower.includes('admin')) return 'purple';
    if (lower.includes('vendeur')) return 'blue';
    if (lower.includes('caissier')) return 'green';
    if (lower.includes('gerant') || lower.includes('manager')) return 'orange';
    return 'gray';
  };

  // Gestion du tri des colonnes
  const handleUserSort = (column: UserSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getUserSortIcon = (column: UserSortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-500" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-orange-400" />
      : <ArrowDown className="w-4 h-4 text-orange-400" />;
  };

  // Tri des utilisateurs
  const sortedUtilisateurs = [...utilisateurs].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;
    switch (sortColumn) {
      case 'username':
        comparison = (a.username || '').localeCompare(b.username || '');
        break;
      case 'structure':
        comparison = (a.structure?.nom_structure || '').localeCompare(b.structure?.nom_structure || '');
        break;
      case 'groupe':
        comparison = (a.groupe?.nom_groupe || '').localeCompare(b.groupe?.nom_groupe || '');
        break;
      case 'statut':
        comparison = (a.actif ? 1 : 0) - (b.actif ? 1 : 0);
        break;
      case 'date_creation':
        comparison = new Date(a.date_creation || 0).getTime() - new Date(b.date_creation || 0).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calcul max pour barres
  const maxParGroupe = stats?.par_groupe
    ? Math.max(...Object.values(stats.par_groupe))
    : 1;

  if (loading && utilisateurs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-400">Chargement des utilisateurs...</span>
      </div>
    );
  }

  if (error && utilisateurs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadUtilisateurs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-gray-400 text-sm">{total} utilisateurs au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={loadUtilisateurs}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Utilisateurs"
            value={stats.total_utilisateurs}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Actifs"
            value={stats.utilisateurs_actifs}
            subtitle={`${Math.round((stats.utilisateurs_actifs / stats.total_utilisateurs) * 100)}%`}
            icon={<UserCheck className="w-5 h-5" />}
            color="green"
          />
          <KPICard
            title="Inactifs"
            value={stats.utilisateurs_inactifs}
            icon={<UserX className="w-5 h-5" />}
            color="red"
          />
          <KPICard
            title="Nouveaux ce mois"
            value={stats.nouveaux_ce_mois}
            icon={<UserPlus className="w-5 h-5" />}
            color="orange"
          />
        </div>
      )}

      {/* Filtres dépliables */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, login, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtre Groupe */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Groupe</label>
            <select
              value={filterGroupe ?? ''}
              onChange={(e) => setFilterGroupe(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Tous les groupes</option>
              {refData?.groupes?.map(g => (
                <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe}</option>
              ))}
            </select>
          </div>

          {/* Filtre Profil */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Profil</label>
            <select
              value={filterProfil ?? ''}
              onChange={(e) => setFilterProfil(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Tous les profils</option>
              {refData?.profils?.map(p => (
                <option key={p.id_profil} value={p.id_profil}>{p.nom_profil}</option>
              ))}
            </select>
          </div>

          {/* Filtre Statut */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Statut</label>
            <select
              value={filterActif === undefined ? '' : filterActif.toString()}
              onChange={(e) => setFilterActif(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>

          {/* Tri */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Trier par</label>
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value as typeof orderBy)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="createdat">Date création</option>
              <option value="username">Nom</option>
              <option value="login">Login</option>
              <option value="structure">Structure</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Grille 2 colonnes : Liste + Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste des utilisateurs (2/3) */}
        <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700 bg-gray-800/50">
                  <th className="p-3 font-medium">
                    <button
                      onClick={() => handleUserSort('username')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Utilisateur
                      {getUserSortIcon('username')}
                    </button>
                  </th>
                  <th className="p-3 font-medium">
                    <button
                      onClick={() => handleUserSort('structure')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Structure
                      {getUserSortIcon('structure')}
                    </button>
                  </th>
                  <th className="p-3 font-medium">
                    <button
                      onClick={() => handleUserSort('groupe')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Groupe
                      {getUserSortIcon('groupe')}
                    </button>
                  </th>
                  <th className="p-3 font-medium">
                    <button
                      onClick={() => handleUserSort('statut')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Statut
                      {getUserSortIcon('statut')}
                    </button>
                  </th>
                  <th className="p-3 font-medium">
                    <button
                      onClick={() => handleUserSort('date_creation')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Créé le
                      {getUserSortIcon('date_creation')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUtilisateurs.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {user.login}
                        </p>
                        {user.telephone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.telephone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-white truncate max-w-[150px]" title={user.structure?.nom_structure}>
                            {user.structure?.nom_structure || 'Système'}
                          </p>
                          <p className="text-xs text-gray-500">{user.structure?.type_structure}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <Badge color={getGroupeColor(user.groupe?.nom_groupe)}>
                          {user.groupe?.nom_groupe || 'N/A'}
                        </Badge>
                        <p className="text-xs text-gray-500">{user.profil?.nom_profil}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {user.actif ? (
                          <Badge color="green">Actif</Badge>
                        ) : (
                          <Badge color="red">Inactif</Badge>
                        )}
                        {user.pwd_changed ? (
                          <p className="text-xs text-emerald-500 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> MDP modifié
                          </p>
                        ) : (
                          <p className="text-xs text-orange-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> MDP initial
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.date_creation)}
                      </div>
                    </td>
                  </tr>
                ))}
                {utilisateurs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-gray-700 bg-gray-800/30">
            <span className="text-sm text-gray-400">
              {total} utilisateur{total > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-300">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats par groupe/profil (1/3) */}
        <div className="space-y-4">
          {/* Par Groupe */}
          {stats?.par_groupe && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Par Groupe
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.par_groupe).map(([groupe, count], idx) => {
                  const colors = ['purple', 'blue', 'green', 'orange', 'cyan'];
                  return (
                    <div key={groupe}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate flex-1">{groupe}</span>
                        <span className="text-emerald-400 font-medium text-sm ml-2">
                          {count}
                        </span>
                      </div>
                      <ProgressBar
                        value={count}
                        max={maxParGroupe}
                        color={colors[idx % colors.length]}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Par Profil */}
          {stats?.par_profil && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Par Profil
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.par_profil).map(([profil, count]) => (
                  <div key={profil} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{profil}</span>
                    <Badge color="blue">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats MDP */}
          {stats && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-400" />
                Sécurité MDP
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">MDP modifié</span>
                  <span className="text-emerald-400 font-medium">{stats.pwd_changed}</span>
                </div>
                <ProgressBar
                  value={stats.pwd_changed}
                  max={stats.total_utilisateurs}
                  color="green"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">MDP initial</span>
                  <span className="text-orange-400 font-medium">{stats.pwd_not_changed}</span>
                </div>
                <ProgressBar
                  value={stats.pwd_not_changed}
                  max={stats.total_utilisateurs}
                  color="orange"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
