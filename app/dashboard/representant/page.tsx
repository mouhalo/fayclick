/**
 * Dashboard Représentant — Page d'accueil de l'espace rep
 *
 * Mobile-first absolu (90% des reps sur smartphone terrain).
 * Résumé du stock affecté + navigation vers les sous-espaces.
 *
 * Source données :
 *   - get_stock_representant(id_rep) → stock affecté + KPIs dérivés
 *
 * Cf. docs/specs/SPEC_FRONTEND_RESEAU_DISTRIBUTION.md
 *
 * Note (Stage B3.1) : les sous-espaces stock/vente/reversements ne sont
 * pas encore implémentés — les cartes de navigation existent déjà pour
 * préparer le terrain, "Mes factures" reste désactivé (à venir).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  FileText,
  MapPin,
  Wallet,
  TrendingUp,
  LogOut,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import affectationService from '@/services/affectation.service';
import { AffectationData, getValeurStockAffecte, isStockBas } from '@/types/affectation';

export default function DashboardRepresentantPage() {
  const { user, structure, logout } = useAuth();
  const [stock, setStock] = useState<AffectationData[]>([]);
  const [totalProduits, setTotalProduits] = useState(0);
  const [valeurStockTotal, setValeurStockTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await affectationService.getStockRepresentant(user.id);
      if (!res.success) {
        setError(res.message || 'Erreur de chargement du stock');
        setStock([]);
        setTotalProduits(0);
        setValeurStockTotal(0);
        return;
      }
      const produits = Array.isArray(res.produits) ? res.produits : [];
      setStock(produits);
      setTotalProduits(res.total_produits ?? produits.length);
      setValeurStockTotal(res.valeur_totale_stock ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Dérivés du stock
  const stocksBas = stock.filter(isStockBas);
  const nbStockBas = stocksBas.length;
  const stockPreview = [...stock]
    .sort(
      (a, b) => getValeurStockAffecte(b) - getValeurStockAffecte(a)
    )
    .slice(0, 3);

  const nomAffiche =
    [user?.prenom_rep, user?.nom_rep].filter(Boolean).join(' ') ||
    user?.username ||
    'Représentant';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header gradient */}
      <header className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-700 text-white p-5 rounded-b-3xl shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-fuchsia-100/90 font-medium">
              {greeting()},
            </p>
            <h1 className="text-2xl font-bold truncate">{nomAffiche}</h1>
            {structure?.nom_structure && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-fuchsia-100">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{structure.nom_structure}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              aria-label="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-6 space-y-4">
        {/* KPI cards */}
        <section className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Package className="w-5 h-5" />}
            label="Produits affectés"
            value={loading ? '…' : String(totalProduits)}
            color="from-fuchsia-500 to-purple-600"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Valeur stock"
            value={loading ? '…' : `${valeurStockTotal.toLocaleString('fr-FR')} F`}
            color="from-purple-500 to-indigo-600"
          />
        </section>

        {/* Alerte stock bas */}
        {nbStockBas > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">
                {nbStockBas} produit{nbStockBas > 1 ? 's' : ''} en stock bas
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                Demandez un réapprovisionnement à votre administrateur.
              </p>
            </div>
          </motion.div>
        )}

        {/* Actions rapides */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Actions rapides
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              href="/dashboard/representant/vente"
              icon={<ShoppingCart className="w-6 h-6" />}
              label="Nouvelle vente"
              color="from-fuchsia-500 to-purple-600"
              primary
              disabled
              comingSoon
            />
            <ActionButton
              href="/dashboard/representant/stock"
              icon={<Package className="w-6 h-6" />}
              label="Mon stock"
              color="from-purple-500 to-indigo-600"
              disabled
              comingSoon
            />
            <ActionButton
              href="/dashboard/representant/factures"
              icon={<FileText className="w-6 h-6" />}
              label="Mes factures"
              color="from-indigo-500 to-blue-600"
              disabled
              comingSoon
            />
            <ActionButton
              href="/dashboard/representant/reversements"
              icon={<Wallet className="w-6 h-6" />}
              label="Reversements"
              color="from-orange-500 to-amber-600"
              disabled
              comingSoon
            />
          </div>
        </section>

        {/* Stock preview */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Mon stock (top 3)
            </h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-6 flex justify-center">
              <Loader2 className="w-5 h-5 text-fuchsia-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          ) : stockPreview.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Aucun stock affecté pour le moment
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Demandez à votre administrateur de vous affecter du stock pour
                commencer à vendre.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stockPreview.map((aff, i) => (
                <motion.div
                  key={aff.id_affectation}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white border rounded-xl p-3 flex items-center justify-between gap-3 ${
                    isStockBas(aff) ? 'border-orange-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {aff.nom_produit || `Produit #${aff.id_produit}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Stock :{' '}
                      <span className="font-semibold">
                        {aff.quantite_restante.toLocaleString('fr-FR')}
                      </span>{' '}
                      · Prix imposé :{' '}
                      <span className="font-semibold text-fuchsia-600">
                        {aff.prix_vente_rep.toLocaleString('fr-FR')} F
                      </span>
                    </p>
                  </div>
                  {isStockBas(aff) && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                      Bas
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 py-4">
          FayClick · Réseau Distribution
        </p>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div
        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white mb-2`}
      >
        {icon}
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}

function ActionButton({
  href,
  icon,
  label,
  color,
  primary = false,
  disabled = false,
  comingSoon = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  primary?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  if (disabled) {
    return (
      <div className="relative bg-gray-100 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[110px] gap-2 opacity-60 cursor-not-allowed">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm font-semibold text-gray-500 text-center">
          {label}
        </span>
        {comingSoon && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-semibold rounded uppercase">
            Bientôt
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`relative rounded-xl p-4 flex flex-col items-center justify-center min-h-[110px] gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
        primary
          ? `bg-gradient-to-br ${color} text-white`
          : 'bg-white border border-gray-200 text-gray-800'
      }`}
    >
      <div className={primary ? 'text-white' : 'text-fuchsia-600'}>{icon}</div>
      <span className="text-sm font-semibold text-center">{label}</span>
    </Link>
  );
}
