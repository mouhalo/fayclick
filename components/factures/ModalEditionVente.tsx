/**
 * Modal d'édition d'une vente payée du jour (PRD §7.3).
 *
 * - Branché sur le store DÉDIÉ `panierEditionStore` (isolation totale, voir store).
 * - Validation stock PAR DELTA (gérée dans le store).
 * - Ajout d'article via recherche produit (réutilise produitsService.searchProduits).
 * - Affiche l'écart prévisionnel live (complément à encaisser / monnaie à rendre).
 *
 * Le bouton « Enregistrer » délègue au parent via onSave (qui appelle
 * factureService.modifierFacture — livré par kader_backend).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, Search, Loader2, Save, AlertTriangle } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslations } from '@/hooks/useTranslations';
import { usePanierEditionStore } from '@/stores/panierEditionStore';
import { produitsService } from '@/services/produits.service';
import { Produit } from '@/types/produit';
import { formatAmount } from '@/lib/utils';

interface ModalEditionVenteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé au clic « Enregistrer ». Le parent exécute modifierFacture(...). */
  onSave: () => Promise<void>;
  /** true pendant l'appel modifierFacture (désactive les actions) */
  saving: boolean;
}

export function ModalEditionVente({
  isOpen,
  onClose,
  onSave,
  saving,
}: ModalEditionVenteProps) {
  const { isMobile } = useBreakpoint();
  const t = useTranslations('invoices');

  const {
    numFacture,
    articles,
    remise,
    setQuantity,
    incrementQuantity,
    removeArticle,
    addNewArticle,
    updateRemise,
    getSousTotal,
    getMontantsFacture,
    getEcartPrevisionnel,
  } = usePanierEditionStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Produit[]>([]);
  const [searching, setSearching] = useState(false);
  const [stockWarning, setStockWarning] = useState<string>('');
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const montants = getMontantsFacture();
  const ecart = getEcartPrevisionnel();
  const sousTotal = getSousTotal();

  // Recherche produit avec debounce 300ms
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const terme = searchTerm.trim();
    if (terme.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await produitsService.searchProduits(terme);
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // Message de stock insuffisant temporaire
  const flashStockWarning = useCallback((msg: string) => {
    setStockWarning(msg);
    setTimeout(() => setStockWarning(''), 2500);
  }, []);

  const handleIncrement = (id_produit: number) => {
    const ok = incrementQuantity(id_produit, 1);
    if (!ok) {
      const art = articles.find((a) => a.id_produit === id_produit);
      flashStockWarning(
        art?.stockInconnu
          ? t('edition.stockUnknown', { name: art?.nom_produit || '' })
          : t('edition.stockError', { name: art?.nom_produit || '' })
      );
    }
  };

  const handleSetQuantity = (id_produit: number, value: string) => {
    const qty = parseInt(value, 10);
    if (Number.isNaN(qty)) return;
    const ok = setQuantity(id_produit, qty);
    if (!ok) {
      const art = articles.find((a) => a.id_produit === id_produit);
      flashStockWarning(
        art?.stockInconnu
          ? t('edition.stockUnknown', { name: art?.nom_produit || '' })
          : t('edition.stockError', { name: art?.nom_produit || '' })
      );
    }
  };

  const handleAddProduct = (produit: Produit) => {
    const ok = addNewArticle(produit, 1);
    if (!ok) {
      flashStockWarning(t('edition.stockError', { name: produit.nom_produit }));
      return;
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemiseChange = (value: string) => {
    const v = parseInt(value, 10);
    updateRemise(Number.isNaN(v) ? 0 : v);
  };

  if (!isOpen) return null;

  const articlesVides = articles.length === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-2 sm:p-4"
        onClick={saving ? undefined : onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg truncate">
                {t('edition.title')}
              </h2>
              <p className="text-indigo-100 text-xs sm:text-sm truncate">
                {t('edition.badge', { num: numFacture || '' })}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!saving) onClose();
              }}
              disabled={saving}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corps scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Recherche / ajout d'article */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('edition.searchPlaceholder')}
                  disabled={saving}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                />
                {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id_produit}
                      onClick={() => handleAddProduct(p)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-indigo-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {p.nom_produit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatAmount(p.prix_vente)} ·{' '}
                          {t('edition.stockLabel', { count: p.niveau_stock ?? 0 })}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avertissement stock */}
            {stockWarning && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{stockWarning}</span>
              </div>
            )}

            {/* Liste des articles */}
            {articlesVides ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {t('edition.emptyWarning')}
              </div>
            ) : (
              <div className="space-y-2">
                {articles.map((a) => {
                  const prixUnit = a.prix_applique ?? a.prix_vente;
                  return (
                    <div
                      key={a.id_produit}
                      className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {a.nom_produit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatAmount(prixUnit)} ×{' '}
                          <span className="font-semibold text-gray-700">{a.quantity}</span>{' '}
                          = {formatAmount(prixUnit * a.quantity)}
                          {a.stockInconnu && (
                            <span className="ml-1 text-amber-500">
                              · {t('edition.stockUnknownBadge')}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Stepper quantité */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleSetQuantity(a.id_produit, String(a.quantity - 1))}
                          disabled={saving}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                          aria-label={t('edition.decrease')}
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-800">
                          {a.quantity}
                        </span>
                        <button
                          onClick={() => handleIncrement(a.id_produit)}
                          disabled={saving}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                          aria-label={t('edition.increase')}
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeArticle(a.id_produit)}
                        disabled={saving}
                        className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0 disabled:opacity-50"
                        aria-label={t('edition.removeArticle')}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Remise globale */}
            <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <label htmlFor="edition-remise" className="text-sm font-medium text-gray-700">
                {t('edition.remiseLabel')}
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="edition-remise"
                  type="number"
                  min={0}
                  value={remise || ''}
                  onChange={(e) => handleRemiseChange(e.target.value)}
                  disabled={saving}
                  className="w-24 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
                />
                <span className="text-xs text-gray-500">FCFA</span>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="bg-indigo-50/60 rounded-xl p-3 space-y-1.5 border border-indigo-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('edition.subtotal')}</span>
                <span className="font-medium">{formatAmount(sousTotal)}</span>
              </div>
              {remise > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('edition.remise')}</span>
                  <span className="font-medium">- {formatAmount(remise)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-indigo-100">
                <span>{t('edition.net')}</span>
                <span>{formatAmount(montants.montant_net)}</span>
              </div>

              {/* Écart prévisionnel */}
              {ecart !== 0 && (
                <div
                  className={`flex justify-between text-sm font-semibold pt-1 ${
                    ecart > 0 ? 'text-orange-600' : 'text-blue-600'
                  }`}
                >
                  <span>
                    {ecart > 0
                      ? t('edition.complementPreview')
                      : t('edition.refundPreview')}
                  </span>
                  <span>{formatAmount(Math.abs(ecart))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {t('edition.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={saving || articlesVides}
              className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('edition.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('edition.save')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEditionVente;
