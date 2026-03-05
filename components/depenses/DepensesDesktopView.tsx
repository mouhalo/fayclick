'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RotateCcw,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  Loader,
} from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { User } from '@/types/auth';
import type { DepensesData, Depense } from '@/types/depense.types';

interface DepensesDesktopViewProps {
  user: User;
  data: DepensesData;
  depensesFiltrees: Depense[];
  depensesPaginees: Depense[];
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  loading: boolean;
  // Handlers
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onAjouter: () => void;
  onEditer: (d: Depense) => void;
  onSupprimer: (d: Depense) => void;
  onOpenTypesModal: () => void;
  // Sidebar
  onShowCoffreModal: () => void;
  onShowLogoutModal: () => void;
  onShowProfilModal: () => void;
  isTablet: boolean;
}

export default function DepensesDesktopView({
  user,
  data,
  depensesFiltrees,
  depensesPaginees,
  currentPage,
  totalPages,
  searchQuery,
  loading,
  onSearchChange,
  onPageChange,
  onRefresh,
  onAjouter,
  onEditer,
  onSupprimer,
  onOpenTypesModal,
  onShowCoffreModal,
  onShowLogoutModal,
  onShowProfilModal,
  isTablet,
}: DepensesDesktopViewProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);
  const [searchLocal, setSearchLocal] = useState(searchQuery);

  useEffect(() => {
    setSidebarCollapsed(isTablet);
  }, [isTablet]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      onSearchChange(searchLocal);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMontant = (val: number) => {
    return `${val.toLocaleString('fr-FR')} FCFA`;
  };

  // KPI : type le plus couteux
  const topType = useMemo(() => {
    if (!data.depenses_par_type || data.depenses_par_type.length === 0) return null;
    return data.depenses_par_type.reduce((max, t) =>
      t.total_depenses > max.total_depenses ? t : max
    , data.depenses_par_type[0]);
  }, [data.depenses_par_type]);

  // Pagination display
  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + depensesPaginees.length, depensesFiltrees.length);

  return (
    <div className="min-h-screen flex bg-[#f0fdf4]">
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onNavigate={handleNavigate}
        onLogout={onShowLogoutModal}
        onCoffreClick={onShowCoffreModal}
        onProfilClick={onShowProfilModal}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Zone principale */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Top Bar sticky */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/commerce')}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Gestion des Depenses</h1>
              <p className="text-xs text-gray-500">Suivez et gerez vos depenses</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenTypesModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all"
            >
              <Settings className="w-4 h-4" />
              {!isTablet && <span>Gerer Types</span>}
            </button>
            <button
              onClick={onAjouter}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Depense</span>
            </button>
          </div>
        </header>

        {/* Contenu scrollable */}
        <div className="p-6 space-y-5">
          {/* 3 KPI Cards */}
          <div className={`grid gap-4 ${isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {/* Nombre + Total */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-blue-500 border border-white/50 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Depenses</p>
                  <p className="text-2xl font-bold text-gray-800">{data.resume_depenses.nb_depenses}</p>
                  <p className="text-sm font-semibold text-blue-600">{formatMontant(data.resume_depenses.total_depenses)}</p>
                </div>
              </div>
            </div>

            {/* Type le plus couteux */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-orange-500 border border-white/50 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Type le plus couteux</p>
                  {topType ? (
                    <>
                      <p className="text-lg font-bold text-gray-800 truncate">{topType.nom_type}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-600">{formatMontant(topType.total_depenses)}</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                          {topType.pourcentage_total.toFixed(0)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Aucune donnee</p>
                  )}
                </div>
              </div>
            </div>

            {/* Depense moyenne + variation */}
            <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-green-500 border border-white/50 hover:shadow-lg transition-shadow ${isTablet ? 'col-span-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Depense Moyenne</p>
                  <p className="text-2xl font-bold text-gray-800">{formatMontant(data.resume_depenses.depense_moyenne)}</p>
                  {data.resume_depenses.variation_depenses !== 0 && (
                    <div className="flex items-center gap-1">
                      {data.resume_depenses.variation_depenses > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <span className={`text-xs font-semibold ${data.resume_depenses.variation_depenses > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {data.resume_depenses.variation_depenses > 0 ? '+' : ''}{data.resume_depenses.variation_depenses.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">vs periode precedente</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Barre recherche */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLocal}
                  onChange={(e) => setSearchLocal(e.target.value)}
                  placeholder="Rechercher par type, description, montant..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                title="Actualiser"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {!isTablet && <span>Actualiser</span>}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Type</th>
                    {!isTablet && (
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Description</th>
                    )}
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Montant</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depensesPaginees.length === 0 ? (
                    <tr>
                      <td colSpan={isTablet ? 4 : 5} className="text-center py-12 text-gray-400">
                        <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">Aucune depense trouvee</p>
                        <p className="text-xs mt-1">Modifiez votre recherche ou ajoutez une depense</p>
                      </td>
                    </tr>
                  ) : (
                    depensesPaginees.map((depense, idx) => (
                      <tr
                        key={depense.id_depense}
                        className={`border-b border-gray-100 hover:bg-blue-50/60 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{formatDate(depense.date_depense)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {depense.nom_type}
                          </span>
                        </td>
                        {!isTablet && (
                          <td className="px-4 py-3">
                            <span className="text-gray-600 line-clamp-1">{depense.description || '-'}</span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-green-600">{formatMontant(depense.montant)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditer(depense); }}
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onSupprimer(depense); }}
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Affichage de <span className="font-semibold">{startIndex + 1}</span> a{' '}
                  <span className="font-semibold">{endIndex}</span> sur{' '}
                  <span className="font-semibold">{depensesFiltrees.length}</span> depenses
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
