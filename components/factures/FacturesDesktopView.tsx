'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Zap,
  Search,
  Calendar,
  User as UserIcon,
  Phone,
  Filter,
  RotateCcw,
  Eye,
  Printer,
  Trash2,
  CreditCard,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader,
} from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { ListePaiements } from '@/components/factures/ListePaiements';
import { ProformasTab } from '@/components/proformas/ProformasTab';
import { User } from '@/types/auth';
import {
  GetMyFactureResponse,
  FactureComplete,
  FiltresFactures,
} from '@/types/facture';

interface FacturesDesktopViewProps {
  user: User;
  structure: any;
  facturesResponse: GetMyFactureResponse | null;
  facturesFiltreesEtTriees: FactureComplete[];
  facturesPage: FactureComplete[];
  currentPage: number;
  totalPages: number;
  filtres: FiltresFactures;
  paiementsCount: number;
  loading: boolean;
  isRefreshing: boolean;
  error: string;
  canViewMontants: boolean;
  comptePrive: boolean;
  hasActiveFilters: boolean;
  // Handlers
  onFiltersChange: (f: FiltresFactures) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onViewFacture: (f: FactureComplete) => void;
  onPayFacture: (f: FactureComplete) => void;
  onShareFacture: (f: FactureComplete) => void;
  onDeleteFacture: (f: FactureComplete) => void;
  onImprimer: (f: FactureComplete) => void;
  onVoirRecu: (f: FactureComplete) => void;
  onViewRecu: (p: any) => void;
  onDownloadRecu: (p: any) => void;
  // Sidebar handlers
  onShowCoffreModal: () => void;
  onShowLogoutModal: () => void;
  onShowProfilModal: () => void;
  isTablet: boolean;
}

export default function FacturesDesktopView({
  user,
  structure,
  facturesResponse,
  facturesFiltreesEtTriees,
  facturesPage,
  currentPage,
  totalPages,
  filtres,
  paiementsCount,
  loading,
  isRefreshing,
  error,
  canViewMontants,
  comptePrive,
  hasActiveFilters,
  onFiltersChange,
  onRefresh,
  onPageChange,
  onViewFacture,
  onPayFacture,
  onShareFacture,
  onDeleteFacture,
  onImprimer,
  onVoirRecu,
  onViewRecu,
  onDownloadRecu,
  onShowCoffreModal,
  onShowLogoutModal,
  onShowProfilModal,
  isTablet,
}: FacturesDesktopViewProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);
  const [activeTab, setActiveTab] = useState<'factures' | 'paiements' | 'proformas'>('factures');

  // Sync collapsed avec isTablet
  useEffect(() => {
    setSidebarCollapsed(isTablet);
  }, [isTablet]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  // KPI data
  const kpiData = useMemo(() => {
    const resume = facturesResponse?.resume_global;
    const factures = facturesFiltreesEtTriees;

    const totalVentes = hasActiveFilters ? factures.length : (resume?.nombre_factures || 0);
    const montantTotal = hasActiveFilters
      ? factures.reduce((s, f) => s + (f.facture?.montant || 0), 0)
      : (resume?.montant_total || 0);
    const montantPaye = hasActiveFilters
      ? factures.reduce((s, f) => s + (f.facture?.mt_acompte || 0), 0)
      : (resume?.montant_paye || 0);
    const montantImpaye = hasActiveFilters
      ? factures.reduce((s, f) => s + (f.facture?.mt_restant || 0), 0)
      : (resume?.montant_impaye || 0);
    const pctPaye = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0;

    return { totalVentes, montantTotal, montantPaye, montantImpaye, pctPaye };
  }, [facturesResponse, facturesFiltreesEtTriees, hasActiveFilters]);

  // Items per page for display
  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + facturesPage.length, facturesFiltreesEtTriees.length);

  // Local filter state for instant typing
  const [searchLocal, setSearchLocal] = useState(filtres.searchTerm || '');
  const [dateDebut, setDateDebut] = useState(filtres.periode?.debut || '');
  const [dateFin, setDateFin] = useState(filtres.periode?.fin || '');
  const [nomClient, setNomClient] = useState(filtres.nom_client || '');
  const [telClient, setTelClient] = useState(filtres.tel_client || '');
  const [statut, setStatut] = useState(filtres.statut || 'TOUS');
  const [sortBy, setSortBy] = useState(filtres.sortBy || 'date');
  const [sortOrder, setSortOrder] = useState(filtres.sortOrder || 'desc');

  // Push filter changes upstream
  const applyFilters = (overrides?: Partial<FiltresFactures>) => {
    onFiltersChange({
      searchTerm: searchLocal,
      periode: dateDebut || dateFin ? { debut: dateDebut, fin: dateFin } : undefined,
      nom_client: nomClient || undefined,
      tel_client: telClient || undefined,
      statut: statut as any,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      ...overrides,
    });
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      applyFilters({ searchTerm: searchLocal });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const handleResetFilters = () => {
    setSearchLocal('');
    setDateDebut('');
    setDateFin('');
    setNomClient('');
    setTelClient('');
    setStatut('TOUS');
    setSortBy('date');
    setSortOrder('desc');
    onFiltersChange({ sortBy: 'date', sortOrder: 'desc', statut: 'TOUS' });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format montant
  const formatMontant = (val: number) => {
    if (!canViewMontants) return '******';
    return `${val.toLocaleString('fr-FR')} FCFA`;
  };

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
              <h1 className="text-lg font-bold text-gray-800">Gestion des Factures</h1>
              <p className="text-xs text-gray-500">Gerez vos factures et paiements</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => router.push('/dashboard/commerce/venteflash')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Vente Flash</span>
            </button>
          </div>
        </header>

        {/* Contenu scrollable */}
        <div className="p-6 space-y-5">
          {/* Erreur globale */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Onglets */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('factures')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'factures'
                  ? 'bg-[#18542e] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Factures {facturesResponse?.total_factures ? `(${facturesResponse.total_factures})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('paiements')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'paiements'
                  ? 'bg-[#18542e] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Paiements {paiementsCount > 0 ? `(${paiementsCount})` : ''}
            </button>

            {comptePrive && (
              <button
                onClick={() => setActiveTab('proformas')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === 'proformas'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Proformas
              </button>
            )}

            {isRefreshing && (
              <Loader className="w-4 h-4 text-green-600 animate-spin ml-2" />
            )}
          </div>

          {activeTab === 'factures' ? (
            <>
              {/* 4 KPI Cards */}
              <div className={`grid gap-4 ${isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {/* Total Ventes */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-orange-500 border border-white/50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Ventes</p>
                      <p className="text-2xl font-bold text-gray-800">{kpiData.totalVentes}</p>
                    </div>
                  </div>
                </div>

                {/* Montant Total */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-green-500 border border-white/50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Montant Total</p>
                      <p className="text-xl font-bold text-gray-800">{formatMontant(kpiData.montantTotal)}</p>
                    </div>
                  </div>
                </div>

                {/* Montant Paye */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-emerald-500 border border-white/50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Montant Paye</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-gray-800">{formatMontant(kpiData.montantPaye)}</p>
                        {canViewMontants && kpiData.pctPaye > 0 && (
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {kpiData.pctPaye}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impayes */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-red-500 border border-white/50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Impayes</p>
                      <p className="text-xl font-bold text-red-600">{formatMontant(kpiData.montantImpaye)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barre de filtres */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 p-4">
                <div className={`flex items-end gap-3 flex-wrap ${isTablet ? '' : ''}`}>
                  {/* Recherche */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Recherche</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchLocal}
                        onChange={(e) => setSearchLocal(e.target.value)}
                        placeholder="N facture, client, tel..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Date debut */}
                  <div className="min-w-[140px]">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Date debut</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={dateDebut}
                        onChange={(e) => {
                          setDateDebut(e.target.value);
                          setTimeout(() => applyFilters({ periode: { debut: e.target.value, fin: dateFin } }), 0);
                        }}
                        className="w-full pl-9 pr-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Date fin */}
                  <div className="min-w-[140px]">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Date fin</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={dateFin}
                        onChange={(e) => {
                          setDateFin(e.target.value);
                          setTimeout(() => applyFilters({ periode: { debut: dateDebut, fin: e.target.value } }), 0);
                        }}
                        className="w-full pl-9 pr-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Nom client */}
                  {!isTablet && (
                    <div className="min-w-[140px]">
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Client</label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={nomClient}
                          onChange={(e) => {
                            setNomClient(e.target.value);
                            setTimeout(() => applyFilters({ nom_client: e.target.value || undefined }), 300);
                          }}
                          placeholder="Nom client"
                          className="w-full pl-9 pr-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Telephone */}
                  {!isTablet && (
                    <div className="min-w-[130px]">
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Telephone</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={telClient}
                          onChange={(e) => {
                            setTelClient(e.target.value);
                            setTimeout(() => applyFilters({ tel_client: e.target.value || undefined }), 300);
                          }}
                          placeholder="77XXXXXXX"
                          className="w-full pl-9 pr-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Statut */}
                  <div className="min-w-[120px]">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Statut</label>
                    <select
                      value={statut}
                      onChange={(e) => {
                        setStatut(e.target.value);
                        applyFilters({ statut: e.target.value as any });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                    >
                      <option value="TOUS">Tous</option>
                      <option value="PAYEE">Payee</option>
                      <option value="IMPAYEE">Impayee</option>
                    </select>
                  </div>

                  {/* Tri */}
                  <div className="min-w-[120px]">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Trier par</label>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        applyFilters({ sortBy: e.target.value as any });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                    >
                      <option value="date">Date</option>
                      <option value="montant">Montant</option>
                      <option value="client">Client</option>
                    </select>
                  </div>

                  {/* Reset */}
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    title="Reinitialiser les filtres"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#18542e] text-white">
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">N Facture</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Client</th>
                        {!isTablet && (
                          <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Telephone</th>
                        )}
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Montant</th>
                        <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Statut</th>
                        <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturesPage.length === 0 ? (
                        <tr>
                          <td colSpan={isTablet ? 6 : 7} className="text-center py-12 text-gray-400">
                            <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">Aucune facture trouvee</p>
                            <p className="text-xs mt-1">Modifiez vos filtres pour voir des resultats</p>
                          </td>
                        </tr>
                      ) : (
                        facturesPage.map((fc, idx) => {
                          const f = fc.facture;
                          const isPaid = f.libelle_etat === 'PAYEE';
                          const hasRemise = f.mt_remise > 0;

                          return (
                            <tr
                              key={f.id_facture}
                              className={`border-b border-gray-100 hover:bg-green-50/60 transition-colors cursor-pointer ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                              }`}
                              onClick={() => onViewFacture(fc)}
                            >
                              <td className="px-4 py-3">
                                <span className="font-semibold text-gray-800">{f.num_facture}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-700">{f.nom_client || 'CLIENT_ANONYME'}</span>
                              </td>
                              {!isTablet && (
                                <td className="px-4 py-3">
                                  <span className="text-gray-500">{f.tel_client || '-'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3">
                                <span className="text-gray-500">{formatDate(f.date_facture)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-semibold text-gray-800">
                                    {formatMontant(f.montant)}
                                  </span>
                                  {hasRemise && canViewMontants && (
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                                      -{f.mt_remise.toLocaleString('fr-FR')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                    isPaid
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {f.libelle_etat}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Voir */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onViewFacture(fc); }}
                                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                                    title="Voir details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Imprimer / Recu */}
                                  {isPaid && (
                                    comptePrive ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onImprimer(fc); }}
                                        className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors"
                                        title="Imprimer"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onVoirRecu(fc); }}
                                        className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors"
                                        title="Voir recu"
                                      >
                                        <Receipt className="w-4 h-4" />
                                      </button>
                                    )
                                  )}

                                  {/* Payer si impayee */}
                                  {!isPaid && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onPayFacture(fc); }}
                                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors"
                                      title="Payer"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Supprimer (admin only) */}
                                  {user.id_profil === 1 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDeleteFacture(fc); }}
                                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
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
                      <span className="font-semibold">{facturesFiltreesEtTriees.length}</span> factures
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
                                ? 'bg-[#18542e] text-white'
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
            </>
          ) : activeTab === 'paiements' ? (
            /* Onglet Paiements */
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-6">
              <ListePaiements
                onViewRecu={onViewRecu}
                onDownloadRecu={onDownloadRecu}
                canViewMontants={canViewMontants}
              />
            </div>
          ) : (
            /* Onglet Proformas */
            <div className="bg-gradient-to-br from-green-900/90 to-green-950/90 rounded-xl shadow-md border border-green-700/30 p-6">
              <ProformasTab canViewMontants={canViewMontants} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
