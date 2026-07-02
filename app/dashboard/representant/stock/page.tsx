/**
 * Mon Stock — Liste complète des produits affectés au représentant connecté
 *
 * Vue lecture seule (le rep ne peut pas modifier ses affectations).
 * Le prix de vente imposé est affiché en évidence — c'est le prix qui sera
 * appliqué automatiquement lors de la vente, en lecture seule côté rep.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import affectationService from '@/services/affectation.service';
import {
  AffectationData,
  getValeurStockAffecte,
  isStockBas,
} from '@/types/affectation';

export default function MonStockPage() {
  const { user } = useAuth();
  const [stock, setStock] = useState<AffectationData[]>([]);
  const [totalProduits, setTotalProduits] = useState(0);
  const [valeurStockTotal, setValeurStockTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const filtered = stock.filter((a) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      a.nom_produit?.toLowerCase().includes(q) ||
      a.code_barre?.toLowerCase().includes(q) ||
      a.nom_categorie?.toLowerCase().includes(q)
    );
  });

  const nbStockBas = stock.filter(isStockBas).length;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-700 text-white p-4 rounded-b-2xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/dashboard/representant"
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Mon stock</h1>
            <p className="text-xs text-fuchsia-100">
              {totalProduits} produit{totalProduits > 1 ? 's' : ''} affecté
              {totalProduits > 1 ? 's' : ''} ·{' '}
              {valeurStockTotal.toLocaleString('fr-FR')} FCFA total
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Recherche */}
        {stock.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans mon stock…"
              className="w-full pl-10 pr-3 py-2 bg-white/15 backdrop-blur-sm rounded-lg text-sm text-white placeholder-white/60 border border-white/20 focus:outline-none focus:bg-white/25"
            />
          </div>
        )}
      </header>

      <main className="px-4 mt-4 space-y-3">
        {/* Alerte stock bas */}
        {nbStockBas > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 flex-1">
              {nbStockBas} produit{nbStockBas > 1 ? 's' : ''} en stock bas —
              pensez à demander un réapprovisionnement.
            </p>
          </motion.div>
        )}

        {/* États */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Chargement du stock…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-medium text-center">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 px-4 py-2 bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-colors text-sm"
            >
              Réessayer
            </button>
          </div>
        ) : stock.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              Aucun stock affecté
            </h3>
            <p className="text-sm text-gray-500">
              Demandez à votre administrateur de vous affecter des produits
              avec leurs prix de vente.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">
            Aucun produit ne correspond à votre recherche.
          </p>
        ) : (
          /* Liste */
          <div className="space-y-2">
            {filtered.map((aff, i) => (
              <motion.article
                key={aff.id_affectation}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-white rounded-xl border p-3 ${
                  isStockBas(aff) ? 'border-orange-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {aff.nom_produit || `Produit #${aff.id_produit}`}
                    </h3>
                    {aff.nom_categorie && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {aff.nom_categorie}
                      </p>
                    )}
                  </div>
                  {isStockBas(aff) && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded flex-shrink-0">
                      Stock bas
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Stock</p>
                    <p className="font-bold text-gray-900">
                      {aff.quantite_restante.toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="bg-fuchsia-50 rounded-lg p-2">
                    <p className="text-xs text-fuchsia-600">Prix imposé</p>
                    <p className="font-bold text-fuchsia-700">
                      {aff.prix_vente_rep.toLocaleString('fr-FR')}
                      <span className="text-xs ml-0.5">F</span>
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2">
                    <p className="text-xs text-purple-600">Valeur</p>
                    <p className="font-bold text-purple-700">
                      {(aff.valeur_stock_restant ?? getValeurStockAffecte(aff)).toLocaleString('fr-FR')}
                      <span className="text-xs ml-0.5">F</span>
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
