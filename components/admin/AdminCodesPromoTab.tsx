'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Tag,
  Users,
  TrendingUp,
  Percent,
  Calendar,
  RefreshCw,
  Loader2,
  Building2,
  ChevronDown,
  Handshake,
  UserPlus,
  BarChart3
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { AdminStatsCodesPromo, AdminStatsCodesPromoParams } from '@/types/admin.types';

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
// Composant Barre de progression
// ========================================
function ProgressBar({ value, max, color = 'blue', showLabel = false }: { value: number; max: number; color?: string; showLabel?: boolean }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500'
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-700 rounded-full h-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`${colorMap[color] || 'bg-blue-500'} h-3 rounded-full`}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// ========================================
// Composant Graphique Barres (simple)
// ========================================
interface BarChartProps {
  data: Array<{
    label: string;
    viaPartenaires: number;
    viaFayclick: number;
  }>;
}

function SimpleBarChart({ data }: BarChartProps) {
  const maxValue = Math.max(...data.flatMap(d => [d.viaPartenaires, d.viaFayclick]));

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{item.label}</span>
            <span>{item.viaPartenaires + item.viaFayclick} total</span>
          </div>
          <div className="flex gap-1 h-6">
            {/* Via Partenaires (orange) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxValue > 0 ? (item.viaPartenaires / maxValue) * 100 : 0}%` }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-l"
              title={`Partenaires: ${item.viaPartenaires}`}
            />
            {/* Via FayClick (bleu) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxValue > 0 ? (item.viaFayclick / maxValue) * 100 : 0}%` }}
              transition={{ duration: 0.5, delay: idx * 0.1 + 0.2 }}
              className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-r"
              title={`FayClick: ${item.viaFayclick}`}
            />
          </div>
        </div>
      ))}
      {/* Légende */}
      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span className="text-xs text-gray-400">Via Partenaires</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-xs text-gray-400">Via FayClick</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Mois en français
// ========================================
const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ========================================
// Composant Principal
// ========================================
export default function AdminCodesPromoTab() {
  // États
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStatsCodesPromo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres période
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [mois, setMois] = useState<number | undefined>();

  // Chargement des stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: AdminStatsCodesPromoParams = { annee };
      if (mois !== undefined) params.mois = mois;

      const response = await adminService.getStatsCodesPromo(params);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      console.error('Erreur chargement stats codes promo:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  }, [annee, mois]);

  // Chargement initial
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Préparer les données du graphique évolution mensuelle
  const chartData = stats?.evolution_mensuelle?.map(item => ({
    label: MOIS_FR[item.mois - 1]?.substring(0, 3) || `M${item.mois}`,
    viaPartenaires: item.via_partenaires,
    viaFayclick: item.via_fayclick
  })) || [];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="ml-3 text-gray-400">Chargement des statistiques...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
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
            <Tag className="w-6 h-6 text-purple-400" />
            Statistiques Codes Promo
          </h2>
          <p className="text-gray-400 text-sm">
            Période : {stats?.periode?.date_debut ? new Date(stats.periode.date_debut).toLocaleDateString('fr-FR') : ''} - {stats?.periode?.date_fin ? new Date(stats.periode.date_fin).toLocaleDateString('fr-FR') : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sélecteur année */}
          <div className="relative">
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="appearance-none px-3 py-2 pr-8 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Sélecteur mois */}
          <div className="relative">
            <select
              value={mois ?? ''}
              onChange={(e) => setMois(e.target.value ? Number(e.target.value) : undefined)}
              className="appearance-none px-3 py-2 pr-8 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">Année complète</option>
              {MOIS_FR.map((nom, idx) => (
                <option key={idx} value={idx + 1}>{nom}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats?.resume && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Inscriptions"
            value={stats.resume.total_inscriptions}
            icon={<UserPlus className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Via Partenaires"
            value={stats.resume.via_partenaires}
            subtitle={`${stats.resume.taux_parrainage.toFixed(1)}% du total`}
            icon={<Handshake className="w-5 h-5" />}
            color="orange"
          />
          <KPICard
            title="Via FayClick"
            value={stats.resume.via_fayclick}
            subtitle="Code FAYCLICK"
            icon={<Tag className="w-5 h-5" />}
            color="purple"
          />
          <KPICard
            title="Taux Parrainage"
            value={`${stats.resume.taux_parrainage.toFixed(1)}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
          />
        </div>
      )}

      {/* Grille 2 colonnes : Graphique + Classement */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Graphique évolution mensuelle */}
        {chartData.length > 0 && !mois && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Évolution Mensuelle
            </h3>
            <SimpleBarChart data={chartData} />
          </div>
        )}

        {/* Taux parrainage visuel */}
        {stats?.resume && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-400" />
              Répartition des Inscriptions
            </h3>
            <div className="space-y-6">
              {/* Partenaires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-gray-300">Via Partenaires</span>
                  </div>
                  <span className="text-lg font-bold text-orange-400">{stats.resume.via_partenaires}</span>
                </div>
                <ProgressBar
                  value={stats.resume.via_partenaires}
                  max={stats.resume.total_inscriptions}
                  color="orange"
                  showLabel
                />
              </div>

              {/* FayClick */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Via FayClick (Direct)</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{stats.resume.via_fayclick}</span>
                </div>
                <ProgressBar
                  value={stats.resume.via_fayclick}
                  max={stats.resume.total_inscriptions}
                  color="blue"
                  showLabel
                />
              </div>

              {/* Indicateur de performance */}
              <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Performance Partenaires</span>
                  <span className={`text-lg font-bold ${
                    stats.resume.taux_parrainage >= 30 ? 'text-emerald-400' :
                    stats.resume.taux_parrainage >= 15 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {stats.resume.taux_parrainage >= 30 ? 'Excellent' :
                     stats.resume.taux_parrainage >= 15 ? 'Bon' : 'À améliorer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tableau par code promo */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-400" />
            Classement par Code Promo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700 bg-gray-800/50">
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Code Promo</th>
                <th className="p-3 font-medium">Partenaire</th>
                <th className="p-3 font-medium text-center">Structures</th>
                <th className="p-3 font-medium text-center">Actives</th>
                <th className="p-3 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody>
              {stats?.par_code_promo?.map((code, idx) => {
                const tauxActif = code.nombre_structures > 0
                  ? (code.structures_actives / code.nombre_structures) * 100
                  : 0;
                return (
                  <tr key={code.code_promo} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="p-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-yellow-900' :
                        idx === 1 ? 'bg-gray-300 text-gray-800' :
                        idx === 2 ? 'bg-orange-600 text-orange-100' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Tag className={`w-4 h-4 ${
                          code.code_promo === 'FAYCLICK' ? 'text-purple-400' : 'text-orange-400'
                        }`} />
                        <span className={`font-mono font-medium ${
                          code.code_promo === 'FAYCLICK' ? 'text-purple-400' : 'text-orange-400'
                        }`}>
                          {code.code_promo}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {code.partenaire ? (
                        <div className="flex items-center gap-2">
                          <Handshake className="w-4 h-4 text-gray-500" />
                          <span className="text-white">{code.partenaire}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">FayClick Direct</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-white font-medium">{code.nombre_structures}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-emerald-400 font-medium">{code.structures_actives}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px]">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                tauxActif >= 70 ? 'bg-emerald-500' :
                                tauxActif >= 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(tauxActif, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${
                          tauxActif >= 70 ? 'text-emerald-400' :
                          tauxActif >= 40 ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {tauxActif.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!stats?.par_code_promo || stats.par_code_promo.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Aucune donnée disponible pour cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
