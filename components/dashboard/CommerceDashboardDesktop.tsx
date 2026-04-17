'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Zap, Eye, EyeOff, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { User } from '@/types/auth';
import { formatAmount } from '@/utils/formatAmount';
import { useDashboardCommerceComplet } from '@/hooks/useDashboardCommerceComplet';
import { useTranslations } from '@/hooks/useTranslations';
import type {
  DashboardCommerceGraphiqueJour,
  DashboardCommerceTopArticle,
  DashboardCommerceTopClient,
  DashboardCommerceDerniereFacture,
} from '@/types/dashboard';

interface CommerceDashboardDesktopProps {
  user: User;
  notificationCount: number;
  canViewCA: boolean;
  canAccessFeature: (feature: string) => boolean;
  showAbonnementModal: (feature: string) => void;
  onShowCoffreModal: () => void;
  onShowLogoutModal: () => void;
  onShowNotificationsModal: () => void;
  onShowProfilModal: () => void;
  isTablet: boolean;
}

// Compteur anime interne
function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count}</>;
}

// Skeleton loader generique
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded ${className || 'w-full h-6'}`} />;
}

// Composant graphique barres CSS
function WeeklyBarChart({ data, canViewCA }: { data: DashboardCommerceGraphiqueJour[]; canViewCA: boolean }) {
  const t = useTranslations('commerceDashboard');
  const maxMontant = Math.max(...data.map(d => d.montant), 1);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
        {t('chart.title')}
      </h3>
      <div className="flex items-end justify-between gap-3 h-48">
        {data.map((d) => {
          const heightPct = (d.montant / maxMontant) * 100;
          return (
            <div key={d.jour} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full relative" style={{ height: '160px' }}>
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 xl:w-10 rounded-t-lg transition-all duration-700 ease-out flex items-start justify-center pt-1 overflow-hidden"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: heightPct > 0 ? '28px' : '0px',
                    background: `linear-gradient(to top, #16a34d, #22c55e)`,
                  }}
                >
                  {heightPct > 12 && (
                    <span className="text-[9px] xl:text-[10px] text-white font-semibold leading-none text-center whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '100%' }}>
                      {canViewCA ? formatAmount(d.montant) : '***'}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-600">{d.jour}</span>
              {d.nb_ventes > 0 && (
                <span className="text-[10px] text-gray-400">
                  {d.nb_ventes > 1
                    ? t('chart.salePlural', { count: d.nb_ventes })
                    : t('chart.saleSingular', { count: d.nb_ventes })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant Top 5 Produits
function TopProducts({ data, canViewCA }: { data: DashboardCommerceTopArticle[]; canViewCA: boolean }) {
  const t = useTranslations('commerceDashboard');
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
        {t('topProducts.title')}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('topProducts.empty')}</p>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.rang} className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                ${p.rang === 1 ? 'bg-yellow-100 text-yellow-700' :
                  p.rang === 2 ? 'bg-gray-100 text-gray-600' :
                  p.rang === 3 ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-50 text-gray-500'}
              `}>
                {p.rang}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.nom_produit}</p>
                <p className="text-xs text-gray-500">{t('topProducts.soldCount', { count: p.quantite })}</p>
              </div>
              <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                {canViewCA ? `${p.montant.toLocaleString('fr-FR')} F` : '***'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Composant Top 5 Clients
function TopClients({ data, canViewCA }: { data: DashboardCommerceTopClient[]; canViewCA: boolean }) {
  const t = useTranslations('commerceDashboard');
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
        {t('topClients.title')}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('topClients.empty')}</p>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.rang} className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                ${c.rang === 1 ? 'bg-blue-100 text-blue-700' :
                  c.rang === 2 ? 'bg-indigo-100 text-indigo-600' :
                  c.rang === 3 ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-50 text-gray-500'}
              `}>
                {c.rang}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.nom_client}</p>
                <p className="text-xs text-gray-500">
                  {c.nb_factures > 1
                    ? t('topClients.invoicePlural', { count: c.nb_factures })
                    : t('topClients.invoiceSingular', { count: c.nb_factures })}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                {canViewCA ? `${c.montant.toLocaleString('fr-FR')} F` : '***'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Composant Dernieres Factures
function RecentInvoices({
  data,
  onNavigate,
  canViewCA,
}: {
  data: DashboardCommerceDerniereFacture[];
  onNavigate: (path: string) => void;
  canViewCA: boolean;
}) {
  const t = useTranslations('commerceDashboard');
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {t('recentInvoices.title')}
        </h3>
        <button
          onClick={() => onNavigate('/dashboard/commerce/factures')}
          className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
        >
          {t('recentInvoices.viewAll')}
        </button>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('recentInvoices.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">{t('recentInvoices.colRef')}</th>
                <th className="text-left pb-2 font-medium">{t('recentInvoices.colClient')}</th>
                <th className="text-right pb-2 font-medium">{t('recentInvoices.colAmount')}</th>
                <th className="text-center pb-2 font-medium">{t('recentInvoices.colStatus')}</th>
                <th className="text-right pb-2 font-medium">{t('recentInvoices.colDate')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv) => (
                <tr key={inv.id_facture} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 font-medium text-gray-700">#{inv.num_facture}</td>
                  <td className="py-2.5 text-gray-600 max-w-[120px] truncate">{inv.nom_client}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-800">
                    {canViewCA ? `${inv.montant_total.toLocaleString('fr-FR')} F` : '***'}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`
                      inline-block px-2 py-0.5 rounded-full text-xs font-medium
                      ${inv.statut === 'PAYEE'
                        ? 'bg-green-100 text-green-700'
                        : inv.statut === 'PARTIELLE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }
                    `}>
                      {inv.statut === 'PAYEE'
                        ? t('recentInvoices.statusPaid')
                        : inv.statut === 'PARTIELLE'
                        ? t('recentInvoices.statusPartial')
                        : t('recentInvoices.statusPending')}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-gray-500">
                    {new Date(inv.date_facture).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Variation badge
function VariationBadge({ value }: { value: number }) {
  const t = useTranslations('commerceDashboard');
  if (value === 0) return <span className="text-xs text-gray-400">--</span>;
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
      <span className="text-gray-400 font-normal ml-1">{t('variation.vsLastWeek')}</span>
    </div>
  );
}

export default function CommerceDashboardDesktop({
  user,
  notificationCount,
  canViewCA,
  canAccessFeature,
  showAbonnementModal,
  onShowCoffreModal,
  onShowLogoutModal,
  onShowNotificationsModal,
  onShowProfilModal,
  isTablet,
}: CommerceDashboardDesktopProps) {
  const router = useRouter();
  const t = useTranslations('commerceDashboard');
  const [showValeurStock, setShowValeurStock] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);

  // Charger les donnees reelles
  const { data, isLoading, error, refresh } = useDashboardCommerceComplet(user.id_structure);

  // Sync collapsed avec isTablet
  useEffect(() => {
    setSidebarCollapsed(isTablet);
  }, [isTablet]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  // KPI config
  const kpiCards = data ? [
    {
      label: t('kpi.salesToday'),
      value: data.kpis.nb_ventes_jour,
      variation: data.kpis.variation_ventes,
      isMoney: false,
      color: 'border-orange-500',
      bg: 'bg-orange-50',
    },
    {
      label: t('kpi.clientsToday'),
      value: data.kpis.nb_clients_jour,
      variation: data.kpis.variation_clients,
      isMoney: false,
      color: 'border-green-500',
      bg: 'bg-green-50',
    },
    {
      label: t('kpi.caWeek'),
      value: data.kpis.ca_semaine,
      variation: data.kpis.variation_ca,
      isMoney: true,
      color: 'border-violet-500',
      bg: 'bg-violet-50',
      hidden: !canViewCA,
    },
    {
      label: t('kpi.avgBasket'),
      value: data.kpis.panier_moyen_semaine,
      variation: data.kpis.variation_panier,
      isMoney: true,
      color: 'border-red-500',
      bg: 'bg-red-50',
      hidden: !canViewCA,
    },
  ] : [];

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
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                {t('welcome')} <span className="text-green-700">{user.nom_structure}</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">{t('online')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              onClick={onShowNotificationsModal}
              className="relative w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Vente Flash */}
            <button
              onClick={() => {
                if (!canAccessFeature('Vente Flash')) {
                  showAbonnementModal('Vente Flash');
                  return;
                }
                router.push('/dashboard/commerce/venteflash');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>{t('venteFlashBtn')}</span>
            </button>
          </div>
        </header>

        {/* Contenu scrollable */}
        <div className="p-6 space-y-6">

          {/* Etat erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('retry')}
              </button>
            </div>
          )}

          {/* KPI Cards */}
          <div className={`grid gap-4 ${isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border border-white/50">
                  <SkeletonBlock className="w-20 h-3 mb-3" />
                  <SkeletonBlock className="w-28 h-7 mb-2" />
                  <SkeletonBlock className="w-32 h-3" />
                </div>
              ))
            ) : (
              kpiCards.filter(k => !k.hidden).map((kpi) => (
                <div
                  key={kpi.label}
                  className={`bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-l-4 ${kpi.color} border border-white/50 hover:shadow-lg transition-shadow`}
                >
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    {kpi.isMoney
                      ? `${kpi.value.toLocaleString('fr-FR')} F`
                      : <AnimatedCounter value={kpi.value} />
                    }
                  </p>
                  <VariationBadge value={kpi.variation} />
                </div>
              ))
            )}
          </div>

          {/* Rangee 2 : Graphique + Top Produits */}
          <div className={`grid gap-6 ${isTablet ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {isLoading ? (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                  <SkeletonBlock className="w-40 h-4 mb-4" />
                  <SkeletonBlock className="w-full h-48" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                  <SkeletonBlock className="w-40 h-4 mb-4" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock key={i} className="w-full h-8 mb-2" />
                  ))}
                </div>
              </>
            ) : data ? (
              <>
                <WeeklyBarChart data={data.graphique_semaine} canViewCA={canViewCA} />
                <TopProducts data={data.top_articles} canViewCA={canViewCA} />
              </>
            ) : null}
          </div>

          {/* Rangee 3 : Stats Globales + Dernieres Factures */}
          <div className={`grid gap-6 ${isTablet ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Stats Globales */}
            {isLoading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                <SkeletonBlock className="w-32 h-4 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonBlock key={i} className="w-full h-24 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : data ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  {t('stats.title')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Produits */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-100">
                    <span className="text-2xl block mb-2">📦</span>
                    <p className="text-2xl font-bold text-gray-800">
                      <AnimatedCounter value={data.stats_globales.total_produits} />
                    </p>
                    <p className="text-xs text-gray-600 font-semibold uppercase mt-1">{t('stats.products')}</p>
                  </div>

                  {/* Valeur Stock */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-100 relative">
                    {canViewCA && (
                      <button
                        onClick={() => setShowValeurStock(!showValeurStock)}
                        className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded-full transition-colors"
                      >
                        {showValeurStock
                          ? <Eye className="w-4 h-4 text-gray-600" />
                          : <EyeOff className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                    )}
                    <span className="text-2xl block mb-2">💰</span>
                    <p className="text-lg font-bold text-gray-800">
                      {!canViewCA
                        ? <span className="tracking-wider">***</span>
                        : showValeurStock
                        ? `${data.stats_globales.valeur_stock_pv.toLocaleString('fr-FR')} F`
                        : <span className="tracking-wider">••••••</span>
                      }
                    </p>
                    <p className="text-xs text-gray-600 font-semibold uppercase mt-1">{t('stats.stockValue')}</p>
                  </div>

                  {/* Ventes du mois */}
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-100">
                    <span className="text-2xl block mb-2">📊</span>
                    <p className="text-2xl font-bold text-gray-800">
                      <AnimatedCounter value={data.stats_globales.nb_ventes_mois} />
                    </p>
                    <p className="text-xs text-gray-600 font-semibold uppercase mt-1">{t('stats.monthlySales')}</p>
                  </div>

                  {/* Clients actifs */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-100">
                    <span className="text-2xl block mb-2">👥</span>
                    <p className="text-2xl font-bold text-gray-800">
                      <AnimatedCounter value={data.stats_globales.nb_clients_mois} />
                    </p>
                    <p className="text-xs text-gray-600 font-semibold uppercase mt-1">{t('stats.activeClients')}</p>
                  </div>

                  {/* CA du mois (colonne pleine largeur) */}
                  {canViewCA && (
                    <div className="col-span-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
                      <span className="text-2xl block mb-2">💵</span>
                      <p className="text-xl font-bold text-gray-800">
                        {data.stats_globales.ca_mois.toLocaleString('fr-FR')} F
                      </p>
                      <p className="text-xs text-gray-600 font-semibold uppercase mt-1">{t('stats.monthlyCA')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Dernieres Factures */}
            {isLoading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                <SkeletonBlock className="w-36 h-4 mb-4" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} className="w-full h-8 mb-2" />
                ))}
              </div>
            ) : data ? (
              <RecentInvoices data={data.dernieres_factures} onNavigate={handleNavigate} canViewCA={canViewCA} />
            ) : null}
          </div>

          {/* Rangee 4 : Top 5 Clients + Depenses du Mois */}
          <div className={`grid gap-6 ${isTablet ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {isLoading ? (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                  <SkeletonBlock className="w-32 h-4 mb-4" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock key={i} className="w-full h-8 mb-2" />
                  ))}
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                  <SkeletonBlock className="w-40 h-4 mb-4" />
                  <SkeletonBlock className="w-full h-20" />
                </div>
              </>
            ) : data ? (
              <>
                <TopClients data={data.top_clients} canViewCA={canViewCA} />

                {/* Depenses du Mois */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                    {t('expenses.title')}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-gray-800">
                        {canViewCA ? `${data.depenses_mois.total.toLocaleString('fr-FR')} F` : '***'}
                      </p>
                      {canViewCA && <VariationBadge value={data.depenses_mois.variation} />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
                        {data.depenses_mois.nb_depenses > 1
                          ? t('expenses.countPlural', { count: data.depenses_mois.nb_depenses })
                          : t('expenses.countSingular', { count: data.depenses_mois.nb_depenses })}
                      </span>
                      <span>{t('expenses.thisMonth')}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
