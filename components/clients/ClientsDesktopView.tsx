'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RotateCcw,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  AlertCircle,
  FileDown,
  Printer,
  Filter,
  ChevronDown,
  X,
  Loader,
} from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { User } from '@/types/auth';
import { ClientWithStats, StatistiquesFactures } from '@/types/client';
import { ClientAdvancedFilters } from '@/components/clients';
import { clientsService } from '@/services/clients.service';

type FilterOperator = '=' | '<' | '>';

interface ClientsDesktopViewProps {
  user: User;
  clients: ClientWithStats[];
  clientsWithAdvancedFilters: ClientWithStats[];
  paginatedClients: ClientWithStats[];
  statistiquesGlobales: { nombre_total_clients: number; montant_impaye_structure: number } | null;
  currentPage: number;
  totalPages: number;
  searchInput: string;
  isLoadingClients: boolean;
  refreshing: boolean;
  errorClients: string | null;
  advancedFilters: ClientAdvancedFilters;
  // Handlers
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onAddClient: () => void;
  onEditClient: (c: ClientWithStats) => void;
  onViewDetails: (c: ClientWithStats) => void;
  onAdvancedFiltersChange: (filters: ClientAdvancedFilters) => void;
  // Sidebar
  onShowCoffreModal: () => void;
  onShowLogoutModal: () => void;
  onShowProfilModal: () => void;
  isTablet: boolean;
}

export default function ClientsDesktopView({
  user,
  clients,
  clientsWithAdvancedFilters,
  paginatedClients,
  statistiquesGlobales,
  currentPage,
  totalPages,
  searchInput,
  isLoadingClients,
  refreshing,
  errorClients,
  advancedFilters,
  onSearchChange,
  onPageChange,
  onRefresh,
  onAddClient,
  onEditClient,
  onViewDetails,
  onAdvancedFiltersChange,
  onShowCoffreModal,
  onShowLogoutModal,
  onShowProfilModal,
  isTablet,
}: ClientsDesktopViewProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);
  const [searchLocal, setSearchLocal] = useState(searchInput);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const formatMontant = (val: number) => {
    return `${val.toLocaleString('fr-FR')} FCFA`;
  };

  // Export CSV (reutilise la logique de FilterHeaderClientsGlass)
  const handleExportCSV = useCallback(() => {
    if (clientsWithAdvancedFilters.length === 0) {
      alert('Aucun client a exporter');
      return;
    }
    setIsExporting(true);
    try {
      const headers = ['Nom Client', 'Telephone', 'Nbre Factures', 'Total Paye', 'Impaye'];
      const rows = clientsWithAdvancedFilters.map(({ client, statistiques_factures }) => [
        (client?.nom_client || '').replace(/[;,]/g, ' '),
        client?.tel_client || '',
        (statistiques_factures?.nombre_factures ?? 0).toString(),
        (statistiques_factures?.montant_paye ?? 0).toString(),
        (statistiques_factures?.montant_impaye ?? 0).toString()
      ]);
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      link.download = `clients_${(user.nom_structure || 'Structure').replace(/\s+/g, '_')}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export CSV:', error);
      alert('Erreur lors de l\'export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [clientsWithAdvancedFilters, user.nom_structure]);

  // Impression (reutilise la logique de FilterHeaderClientsGlass)
  const handlePrint = useCallback(() => {
    if (clientsWithAdvancedFilters.length === 0) {
      alert('Aucun client a imprimer');
      return;
    }
    const formatM = (m: number | undefined | null) => (m ?? 0).toLocaleString('fr-FR') + ' F';
    const totaux = clientsWithAdvancedFilters.reduce((acc, { statistiques_factures }) => ({
      factures: acc.factures + (statistiques_factures?.nombre_factures ?? 0),
      paye: acc.paye + (statistiques_factures?.montant_paye ?? 0),
      impaye: acc.impaye + (statistiques_factures?.montant_impaye ?? 0)
    }), { factures: 0, paye: 0, impaye: 0 });
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const nomStructure = user.nom_structure || 'Structure';

    const printHTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Liste des Clients - ${nomStructure}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,sans-serif;padding:20px;color:#333}.header{text-align:center;margin-bottom:25px;padding-bottom:15px;border-bottom:2px solid #16a34a}.header h1{color:#16a34a;font-size:22px;margin-bottom:5px}.header p{color:#666;font-size:14px}.meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;color:#666}table{width:100%;border-collapse:collapse;font-size:12px}th{background:linear-gradient(135deg,#16a34a,#22c55e);color:white;padding:10px 8px;text-align:left;font-weight:600}th:nth-child(3),th:nth-child(4),th:nth-child(5){text-align:right}td{padding:8px;border-bottom:1px solid #e5e7eb}td:nth-child(3),td:nth-child(4),td:nth-child(5){text-align:right;font-family:'Consolas',monospace}tr:nth-child(even){background-color:#f9fafb}tr:hover{background-color:#f0fdf4}.impaye{color:#dc2626;font-weight:600}.paye{color:#16a34a}.footer{margin-top:20px;padding-top:15px;border-top:2px solid #16a34a}.totaux{display:flex;justify-content:flex-end;gap:30px;font-size:13px;font-weight:600}.totaux span{color:#666}.totaux .value{color:#16a34a}.totaux .impaye-total{color:#dc2626}@media print{body{padding:10px}}</style></head><body><div class="header"><h1>Liste des Clients</h1><p>${nomStructure}</p></div><div class="meta"><span>Total: ${clientsWithAdvancedFilters.length} client(s)</span><span>Imprime le ${dateStr}</span></div><table><thead><tr><th>Nom Client</th><th>Telephone</th><th>Nbre Factures</th><th>Total Paye</th><th>Impaye</th></tr></thead><tbody>${clientsWithAdvancedFilters.map(({ client, statistiques_factures }) => `<tr><td>${client?.nom_client || '-'}</td><td>${client?.tel_client || '-'}</td><td>${statistiques_factures?.nombre_factures ?? 0}</td><td class="paye">${formatM(statistiques_factures?.montant_paye)}</td><td class="${(statistiques_factures?.montant_impaye ?? 0) > 0 ? 'impaye' : ''}">${formatM(statistiques_factures?.montant_impaye)}</td></tr>`).join('')}</tbody></table><div class="footer"><div class="totaux"><div><span>Total Factures:</span> <span class="value">${totaux.factures}</span></div><div><span>Total Paye:</span> <span class="value">${formatM(totaux.paye)}</span></div><div><span>Total Impaye:</span> <span class="impaye-total">${formatM(totaux.impaye)}</span></div></div></div></body></html>`;

    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden';
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printHTML);
      frameDoc.close();
      printFrame.onload = () => {
        setTimeout(() => {
          try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) { window.print(); }
          setTimeout(() => { document.body.removeChild(printFrame); }, 1000);
        }, 500);
      };
    }
  }, [clientsWithAdvancedFilters, user.nom_structure]);

  const hasAdvancedFiltersActive = !!(advancedFilters.facturesValue || advancedFilters.payeValue || advancedFilters.impayeValue);

  // Pagination display
  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + paginatedClients.length, clientsWithAdvancedFilters.length);

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
              <h1 className="text-lg font-bold text-gray-800">Gestion des Clients</h1>
              <p className="text-xs text-gray-500">{user.nom_structure}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || clientsWithAdvancedFilters.length === 0}
              className="flex items-center gap-2 px-3 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              title="Exporter CSV"
            >
              <FileDown className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {!isTablet && <span>Export CSV</span>}
            </button>
            <button
              onClick={handlePrint}
              disabled={clientsWithAdvancedFilters.length === 0}
              className="flex items-center gap-2 px-3 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              title="Imprimer"
            >
              <Printer className="w-4 h-4" />
              {!isTablet && <span>Imprimer</span>}
            </button>
            <button
              onClick={onAddClient}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Client</span>
            </button>
          </div>
        </header>

        {/* Contenu scrollable */}
        <div className="p-6 space-y-5">
          {/* 3 KPI Cards */}
          <div className={`grid gap-4 ${isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {/* Total Clients */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-emerald-500 border border-white/50 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-800">{statistiquesGlobales?.nombre_total_clients ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Total Impayes */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-red-500 border border-white/50 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Impayes</p>
                  <p className="text-xl font-bold text-red-600">{formatMontant(statistiquesGlobales?.montant_impaye_structure ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Resultats filtres */}
            <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 border-blue-500 border border-white/50 hover:shadow-lg transition-shadow ${isTablet ? 'col-span-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Resultats Filtres</p>
                  <p className="text-2xl font-bold text-gray-800">{clientsWithAdvancedFilters.length}</p>
                  <p className="text-xs text-gray-400">client(s) affiches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barre recherche + filtres */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLocal}
                  onChange={(e) => setSearchLocal(e.target.value)}
                  placeholder="Rechercher par nom, telephone, adresse..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                {searchLocal && (
                  <button
                    onClick={() => setSearchLocal('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors border ${
                  showAdvancedFilters || hasAdvancedFiltersActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                {!isTablet && <span>Filtres</span>}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
                title="Actualiser"
              >
                <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {!isTablet && <span>Actualiser</span>}
              </button>
            </div>

            {/* Filtres avances */}
            {showAdvancedFilters && (
              <div className={`grid gap-3 pt-2 border-t border-gray-100 ${isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {/* Nb factures */}
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Nombre de factures</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={advancedFilters.facturesOp}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, facturesOp: e.target.value as FilterOperator })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="=">=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={advancedFilters.facturesValue}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, facturesValue: e.target.value })}
                      placeholder="0"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Montant achete */}
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Montant achete (FCFA)</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={advancedFilters.payeOp}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, payeOp: e.target.value as FilterOperator })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="=">=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={advancedFilters.payeValue}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, payeValue: e.target.value })}
                      placeholder="0"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Montant impayes */}
                <div className={isTablet ? 'col-span-2' : ''}>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Montant impayes (FCFA)</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={advancedFilters.impayeOp}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, impayeOp: e.target.value as FilterOperator })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="=">=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={advancedFilters.impayeValue}
                      onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, impayeValue: e.target.value })}
                      placeholder="0"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Reset filtres */}
                {hasAdvancedFiltersActive && (
                  <div className={isTablet ? 'col-span-2' : 'col-span-3'}>
                    <button
                      onClick={() => onAdvancedFiltersChange({
                        facturesOp: '=', facturesValue: '',
                        payeOp: '=', payeValue: '',
                        impayeOp: '=', impayeValue: ''
                      })}
                      className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      Reinitialiser les filtres
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Nom Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Telephone</th>
                    {!isTablet && (
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Adresse</th>
                    )}
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Nb Factures</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total Paye</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Impaye</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingClients ? (
                    <tr>
                      <td colSpan={isTablet ? 6 : 7} className="text-center py-12">
                        <Loader className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                        <p className="text-gray-500">Chargement des clients...</p>
                      </td>
                    </tr>
                  ) : errorClients ? (
                    <tr>
                      <td colSpan={isTablet ? 6 : 7} className="text-center py-12">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="text-red-500 font-medium mb-2">{errorClients}</p>
                        <button onClick={onRefresh} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200 transition-colors">
                          Reessayer
                        </button>
                      </td>
                    </tr>
                  ) : paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={isTablet ? 6 : 7} className="text-center py-12 text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">Aucun client trouve</p>
                        <p className="text-xs mt-1">Modifiez vos filtres ou ajoutez un nouveau client</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((cws, idx) => {
                      const { client, statistiques_factures } = cws;
                      const hasImpaye = (statistiques_factures?.montant_impaye ?? 0) > 0;

                      return (
                        <tr
                          key={client.id_client}
                          className={`border-b border-gray-100 hover:bg-green-50/60 transition-colors cursor-pointer ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-green-50/30'
                          }`}
                          onClick={() => onViewDetails(cws)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800">{client.nom_client}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600">{client.tel_client}</span>
                          </td>
                          {!isTablet && (
                            <td className="px-4 py-3">
                              <span className="text-gray-500 truncate block max-w-[200px]">{client.adresse || '-'}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-gray-700">{statistiques_factures?.nombre_factures ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              {formatMontant(statistiques_factures?.montant_paye ?? 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hasImpaye ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                {formatMontant(statistiques_factures.montant_impaye)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); onViewDetails(cws); }}
                                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                                title="Voir details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditClient(cws); }}
                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
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
                  <span className="font-semibold">{clientsWithAdvancedFilters.length}</span> clients
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
                            ? 'bg-gradient-to-r from-green-700 to-emerald-700 text-white'
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
