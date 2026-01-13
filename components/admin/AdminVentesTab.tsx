'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Building2,
  Percent,
  BarChart3,
  Trophy,
  Filter,
  RefreshCw,
  ChevronDown,
  Loader2
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { AdminStatsProduits, AdminStatsProduitsParams } from '@/types/admin.types';

// ========================================
// Types locaux
// ========================================
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'cyan';
  trend?: string;
}

// ========================================
// Composant KPI Card
// ========================================
function KPICard({ title, value, subtitle, icon, color, trend }: KPICardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600'
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
          {trend && (
            <p className="text-white/90 text-xs mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
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
// Composant Principal
// ========================================
export default function AdminVentesTab() {
  // États
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStatsProduits | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [mois, setMois] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Constantes
  const MOIS_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Formatage montants
  const formatMontant = (montant: number) => {
    if (montant >= 1000000) {
      return `${(montant / 1000000).toFixed(1)}M`;
    }
    if (montant >= 1000) {
      return `${(montant / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const formatMontantFull = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  // Chargement des données
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: AdminStatsProduitsParams = {
        annee,
        mois,
        limit_top: 10
      };

      const response = await adminService.getStatsProduits(params);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError('Erreur lors du chargement des données');
      }
    } catch (err) {
      console.error('Erreur chargement stats ventes:', err);
      setError('Impossible de charger les statistiques de ventes');
    } finally {
      setLoading(false);
    }
  }, [annee, mois]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Calcul du max pour les barres de progression
  const maxCaStructure = stats?.par_structure?.[0]?.chiffre_affaire || 1;
  const maxQteProduit = stats?.top_produits?.[0]?.quantite_vendue || 1;
  const maxCaCategorie = stats?.par_categorie?.[0]?.chiffre_affaire || 1;

  // Chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-400">Chargement des statistiques...</span>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const { resume_global, par_categorie, par_structure, top_produits, evolution, periode } = stats;

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-400" />
            Analyse des Ventes
          </h2>
          <p className="text-gray-400 text-sm">{periode.label}</p>
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
            onClick={loadStats}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtres dépliables */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1">Année</label>
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              {[2024, 2025, 2026].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mois</label>
            <select
              value={mois || ''}
              onChange={(e) => setMois(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="">Année complète</option>
              {MOIS_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Chiffre d'Affaires"
          value={`${formatMontant(resume_global.chiffre_affaire_total)} F`}
          subtitle={`${formatMontantFull(resume_global.chiffre_affaire_total)} FCFA`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title="Marge Totale"
          value={`${formatMontant(resume_global.marge_totale)} F`}
          subtitle={`Taux: ${resume_global.taux_marge_moyen}%`}
          icon={<Percent className="w-5 h-5" />}
          color="green"
        />
        <KPICard
          title="Volume Vendu"
          value={formatMontant(resume_global.quantite_totale_vendue)}
          subtitle={`${resume_global.nombre_produits_distincts} produits`}
          icon={<Package className="w-5 h-5" />}
          color="purple"
        />
        <KPICard
          title="Panier Moyen"
          value={`${formatMontant(resume_global.panier_moyen)} F`}
          subtitle={`${resume_global.nombre_factures} factures`}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="orange"
        />
        <KPICard
          title="Boutiques Actives"
          value={resume_global.nombre_structures_actives.toString()}
          subtitle="structures"
          icon={<Building2 className="w-5 h-5" />}
          color="cyan"
        />
      </div>

      {/* Graphique d'évolution avec filtres intégrés */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        {/* Header avec dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Évolution {mois ? 'Journalière' : 'Mensuelle'}
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={mois || ''}
              onChange={(e) => setMois(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Toute l'année</option>
              {MOIS_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Graphique amélioré */}
        {evolution && evolution.length > 0 ? (
          <div className="relative">
            {/* Lignes de grille horizontales avec valeurs */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '24px' }}>
              {[100, 75, 50, 25, 0].map((percent) => {
                const maxCA = Math.max(...evolution.map(e => e.chiffre_affaire));
                const value = (maxCA * percent) / 100;
                return (
                  <div key={percent} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14 text-right">{formatMontant(value)}</span>
                    <div className="flex-1 border-t border-gray-700/50" />
                  </div>
                );
              })}
            </div>

            {/* Barres */}
            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2 pl-16">
              {evolution.map((item, idx) => {
                const maxCA = Math.max(...evolution.map(e => e.chiffre_affaire));
                const heightPercent = maxCA > 0 ? (item.chiffre_affaire / maxCA) * 100 : 0;
                const barHeight = Math.max(heightPercent, 3); // Minimum 3% pour voir les petites valeurs
                return (
                  <div key={idx} className="flex flex-col items-center min-w-[45px] group relative">
                    {/* Valeur au-dessus de la barre */}
                    <div
                      className="absolute text-xs font-medium text-emerald-400 whitespace-nowrap transition-all"
                      style={{ bottom: `calc(${barHeight}% + 28px)` }}
                    >
                      {formatMontant(item.chiffre_affaire)}
                    </div>
                    {/* Barre */}
                    <div className="relative w-full h-40 flex items-end justify-center">
                      <div
                        className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-300 shadow-lg shadow-blue-500/20"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    {/* Label mois */}
                    <span className="text-xs text-gray-400 mt-1 font-medium">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            Aucune donnée pour cette période
          </div>
        )}
      </div>

      {/* Grille 2 colonnes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Produits */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Top 10 Produits
            <span className="text-xs text-gray-400 font-normal ml-2">par quantité vendue</span>
          </h3>
          <div className="space-y-3">
            {top_produits?.slice(0, 10).map((produit, idx) => {
              const medals = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
              return (
                <div key={produit.id_produit} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-bold w-6 ${medals[idx] || 'text-gray-500'}`}>
                        {idx + 1}.
                      </span>
                      <span className="text-sm truncate" title={produit.nom_produit}>
                        {produit.nom_produit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-emerald-400 font-medium">
                        {formatMontant(produit.chiffre_affaire)} F
                      </span>
                      <span className="text-gray-400 text-xs">
                        {produit.quantite_vendue} unités
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={produit.quantite_vendue} max={maxQteProduit} color="purple" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Par Catégorie */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Répartition par Catégorie
          </h3>
          <div className="space-y-3">
            {par_categorie?.map((cat, idx) => {
              const colors = ['blue', 'green', 'orange', 'purple', 'cyan'];
              const totalCA = par_categorie.reduce((sum, c) => sum + c.chiffre_affaire, 0);
              const percentage = totalCA > 0 ? ((cat.chiffre_affaire / totalCA) * 100).toFixed(1) : '0';
              return (
                <div key={cat.categorie}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm truncate flex-1">{cat.categorie}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-medium text-sm">
                        {formatMontant(cat.chiffre_affaire)} F
                      </span>
                      <span className="text-gray-400 text-xs w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={cat.chiffre_affaire}
                    max={maxCaCategorie}
                    color={colors[idx % colors.length]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Structures */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          Classement des Boutiques
          <span className="text-xs text-gray-400 font-normal ml-2">par chiffre d'affaires</span>
        </h3>
        <div className="space-y-3">
          {par_structure?.map((struct, idx) => {
            const totalCA = par_structure.reduce((sum, s) => sum + s.chiffre_affaire, 0);
            const percentage = totalCA > 0 ? ((struct.chiffre_affaire / totalCA) * 100).toFixed(1) : '0';
            const medals = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
            return (
              <div key={struct.id_structure}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`font-bold w-6 ${medals[idx] || 'text-gray-500'}`}>
                      {idx + 1}.
                    </span>
                    <span className="text-sm truncate" title={struct.nom_structure}>
                      {struct.nom_structure}
                    </span>
                    <span className="text-xs text-gray-500 hidden md:inline">
                      ({struct.type_structure})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium text-sm">
                      {formatMontant(struct.chiffre_affaire)} F
                    </span>
                    <span className="text-gray-400 text-xs w-12 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={struct.chiffre_affaire} max={maxCaStructure} color="cyan" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
