/**
 * Vente Représentant — Page de vente terrain
 *
 * Mobile-first : 90% des reps sur smartphone terrain.
 *
 * Contraintes métier (cf. PRD § 3.3 et décisions D4/D7) :
 *   - Liste produits filtrée sur affectation_produit_representant (qte > 0)
 *   - Prix de vente = aff.prix_vente_rep, LECTURE SEULE (prix imposé)
 *   - Quantité max = aff.quantite_restante
 *   - Aucune remise possible (figée pour préserver la marge admin)
 *   - Mode encaissement selon user.mode_encaissement
 *
 * Workflow :
 *   1. Sélection produits (search + add)
 *   2. Panier latéral (qty +/-)
 *   3. Choix mode de paiement (selon user.mode_encaissement)
 *   4. Validation → create_facture_representant (via vente-representant.service.ts)
 *   5. Modal succès avec référence facture + reset panier
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Package,
  Plus,
  Minus,
  X,
  Search,
  Wallet,
  Banknote,
  CheckCircle2,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import affectationService from '@/services/affectation.service';
import venteRepresentantService, {
  ModePaiementRep,
  ArticleVenteRep,
  CreateFactureRepParams,
} from '@/services/vente-representant.service';
import { AffectationData } from '@/types/affectation';

interface PanierLigne extends ArticleVenteRep {
  id_affectation: number;
  nom_produit: string;
  quantite_disponible: number; // limite stock
}

// Codes d'erreur métier → messages utilisateur clairs
const ERROR_MESSAGES: Record<string, string> = {
  MODULE_INACTIF: 'Le module de vente représentant est désactivé pour votre structure.',
  REP_INVALIDE: 'Représentant invalide ou inactif.',
  MODE_INVALIDE: 'Mode de paiement invalide.',
  ARTICLES_VIDES: 'Le panier est vide.',
  FORMAT_ARTICLES_INVALIDE: "Erreur interne : format des articles invalide.",
  ARTICLE_NON_AFFECTE: "Un des articles n'est plus affecté à votre stock.",
  PRIX_NON_AUTORISE:
    "Le prix d'un article ne correspond plus au prix imposé. Rechargez la page et réessayez.",
  STOCK_INSUFFISANT_REP: 'Stock insuffisant pour un ou plusieurs articles.',
  FACTURE_ERREUR: 'Erreur lors de la création de la facture.',
  ERROR: 'Une erreur est survenue lors de la vente.',
};

export default function VenteRepresentantPage() {
  const { user } = useAuth();

  const [stock, setStock] = useState<AffectationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [panier, setPanier] = useState<PanierLigne[]>([]);
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  const [modePaiement, setModePaiement] = useState<ModePaiementRep>('CASH');
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [factureCreee, setFactureCreee] = useState<{
    reference?: string;
    montant?: number;
    nbArticles?: number;
  } | null>(null);

  const isLibre = user?.mode_encaissement === 'LIBRE';

  // Si mode WALLET_STRUCTURE → seuls les wallets disponibles (paiement va structure)
  // Si mode LIBRE → CASH par défaut + tous wallets manuels
  const modesPaiementDisponibles: ModePaiementRep[] = isLibre
    ? ['CASH', 'OM', 'WAVE', 'FREE']
    : ['OM', 'WAVE', 'FREE'];

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await affectationService.getStockRepresentant(user.id);
      if (!res.success) {
        setError(res.message || 'Erreur de chargement du stock');
        setStock([]);
        return;
      }
      const produits = Array.isArray(res.produits) ? res.produits : [];
      setStock(produits.filter((a) => a.quantite_restante > 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Par défaut, sélectionner le 1er mode disponible
    if (modesPaiementDisponibles.length > 0) {
      setModePaiement(modesPaiementDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLibre]);

  // ─── Panier ────────────────────────────────────────────────
  const addToPanier = (aff: AffectationData) => {
    setPanier((prev) => {
      const existing = prev.find((l) => l.id_affectation === aff.id_affectation);
      if (existing) {
        if (existing.quantite + 1 > aff.quantite_restante) {
          toast.error(`Stock max atteint pour "${aff.nom_produit}"`);
          return prev;
        }
        return prev.map((l) =>
          l.id_affectation === aff.id_affectation
            ? { ...l, quantite: l.quantite + 1 }
            : l
        );
      }
      return [
        ...prev,
        {
          id_affectation: aff.id_affectation,
          id_produit: aff.id_produit,
          nom_produit: aff.nom_produit || `Produit #${aff.id_produit}`,
          quantite: 1,
          prix: aff.prix_vente_rep,
          quantite_disponible: aff.quantite_restante,
        },
      ];
    });
  };

  const updateQty = (id_affectation: number, qty: number) => {
    setPanier((prev) =>
      prev
        .map((l) => {
          if (l.id_affectation !== id_affectation) return l;
          const max = l.quantite_disponible;
          const safe = Math.max(0, Math.min(qty, max));
          return { ...l, quantite: safe };
        })
        .filter((l) => l.quantite > 0)
    );
  };

  const removeLigne = (id_affectation: number) => {
    setPanier((prev) => prev.filter((l) => l.id_affectation !== id_affectation));
  };

  const clearPanier = () => {
    setPanier([]);
    setNomClient('');
    setTelClient('');
  };

  // ─── Totaux ────────────────────────────────────────────────
  const total = useMemo(
    () => panier.reduce((acc, l) => acc + l.quantite * l.prix, 0),
    [panier]
  );
  const nbArticles = panier.reduce((acc, l) => acc + l.quantite, 0);

  // ─── Filtrage produits ─────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return stock;
    const q = search.trim().toLowerCase();
    return stock.filter(
      (a) =>
        a.nom_produit?.toLowerCase().includes(q) ||
        a.nom_categorie?.toLowerCase().includes(q) ||
        a.code_barre?.includes(q)
    );
  }, [stock, search]);

  // ─── Soumission ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (panier.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    if (!user?.id_structure || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }

    const articles: ArticleVenteRep[] = panier.map((l) => ({
      id_produit: l.id_produit,
      quantite: l.quantite,
      prix: l.prix,
    }));

    const params: CreateFactureRepParams = {
      date_facture: new Date().toISOString().slice(0, 10),
      id_structure: user.id_structure,
      id_representant: user.id,
      tel_client: telClient.trim() || '771234567',
      nom_client_payeur: nomClient.trim() || 'CLIENT_ANONYME',
      articles,
      // Paiement immédiat (CASH/wallet) : acompte = total (la vente est soldée)
      mt_acompte: total,
      mode_paiement: modePaiement,
    };

    setSubmitting(true);
    try {
      const res = await venteRepresentantService.createFacture(params);
      if (res.success) {
        setFactureCreee({
          reference: res.data?.reference_facture,
          montant: res.data?.montant_total ?? total,
          nbArticles: res.data?.nb_articles ?? nbArticles,
        });
        clearPanier();
        setShowCheckout(false);
        // Recharger le stock pour refléter la décrémentation
        load();
      } else {
        const message =
          (res.code && ERROR_MESSAGES[res.code]) || res.message || 'Erreur lors de la vente';
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-700 text-white p-4 rounded-b-2xl shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/dashboard/representant"
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ShoppingCart className="w-5 h-5" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">Nouvelle vente</h1>
            <p className="text-xs text-fuchsia-100">
              {isLibre ? 'Encaissement libre' : 'Wallet structure'} ·{' '}
              {stock.length} produit{stock.length > 1 ? 's' : ''} dispo
            </p>
          </div>
        </div>

        {/* Recherche */}
        {stock.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-10 pr-3 py-2 bg-white/15 backdrop-blur-sm rounded-lg text-sm text-white placeholder-white/60 border border-white/20 focus:outline-none focus:bg-white/25"
            />
          </div>
        )}
      </header>

      <main className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-7 h-7 text-fuchsia-500 animate-spin mb-2" />
            <p className="text-sm text-gray-500">Chargement…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : stock.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Aucun produit vendable
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Demandez à votre administrateur de vous affecter du stock.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">
            Aucun produit ne correspond à votre recherche.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((aff) => {
              const enPanier = panier.find(
                (l) => l.id_affectation === aff.id_affectation
              );
              return (
                <button
                  key={aff.id_affectation}
                  type="button"
                  onClick={() => addToPanier(aff)}
                  className={`bg-white border rounded-xl p-3 text-left transition-all hover:shadow-md hover:border-fuchsia-300 active:scale-[0.98] ${
                    enPanier
                      ? 'border-fuchsia-400 ring-2 ring-fuchsia-100'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">
                      {aff.nom_produit || `Produit #${aff.id_produit}`}
                    </h3>
                    {enPanier && (
                      <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 text-xs font-bold rounded">
                        ×{enPanier.quantite}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className="text-sm font-bold text-gray-900">
                        {aff.quantite_restante.toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-fuchsia-600 flex items-center justify-end gap-1">
                        <Lock className="w-3 h-3" />
                        Prix imposé
                      </p>
                      <p className="text-base font-bold text-fuchsia-700">
                        {aff.prix_vente_rep.toLocaleString('fr-FR')}{' '}
                        <span className="text-xs">F</span>
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer panier sticky */}
      <AnimatePresence>
        {panier.length > 0 && !showCheckout && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40"
          >
            <div className="p-3">
              {/* Détails panier rapide */}
              <div className="mb-2 max-h-32 overflow-y-auto space-y-1">
                {panier.map((l) => (
                  <div
                    key={l.id_affectation}
                    className="flex items-center justify-between gap-2 text-sm py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-700">{l.nom_produit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(l.id_affectation, l.quantite - 1)}
                        className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-7 text-center">
                        {l.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(l.id_affectation, l.quantite + 1)}
                        disabled={l.quantite >= l.quantite_disponible}
                        className="p-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLigne(l.id_affectation)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-fuchsia-700 w-20 text-right">
                      {(l.quantite * l.prix).toLocaleString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">
                    {nbArticles} article{nbArticles > 1 ? 's' : ''} · Total
                  </p>
                  <p className="text-xl font-bold text-fuchsia-700">
                    {total.toLocaleString('fr-FR')}{' '}
                    <span className="text-sm">FCFA</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  className="px-5 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Encaisser
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Checkout */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={total}
        nbArticles={nbArticles}
        modePaiement={modePaiement}
        modesDisponibles={modesPaiementDisponibles}
        onChangeMode={setModePaiement}
        nomClient={nomClient}
        telClient={telClient}
        onChangeNom={setNomClient}
        onChangeTel={setTelClient}
        onSubmit={handleSubmit}
        submitting={submitting}
        isLibre={isLibre}
      />

      {/* Modal Succès */}
      <SuccessModal
        isOpen={!!factureCreee}
        reference={factureCreee?.reference}
        montant={factureCreee?.montant}
        nbArticles={factureCreee?.nbArticles}
        onClose={() => setFactureCreee(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL CHECKOUT
// ─────────────────────────────────────────────────────────────

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  nbArticles: number;
  modePaiement: ModePaiementRep;
  modesDisponibles: ModePaiementRep[];
  onChangeMode: (m: ModePaiementRep) => void;
  nomClient: string;
  telClient: string;
  onChangeNom: (s: string) => void;
  onChangeTel: (s: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  isLibre: boolean;
}

const MODE_ICONS: Record<ModePaiementRep, React.ReactNode> = {
  CASH: <Banknote className="w-5 h-5" />,
  OM: <Wallet className="w-5 h-5" />,
  WAVE: <Wallet className="w-5 h-5" />,
  FREE: <Wallet className="w-5 h-5" />,
};

const MODE_LABELS: Record<ModePaiementRep, string> = {
  CASH: 'Espèces',
  OM: 'Orange Money',
  WAVE: 'Wave',
  FREE: 'Free Money',
};

function CheckoutModal({
  isOpen,
  onClose,
  total,
  nbArticles,
  modePaiement,
  modesDisponibles,
  onChangeMode,
  nomClient,
  telClient,
  onChangeNom,
  onChangeTel,
  onSubmit,
  submitting,
  isLibre,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
            <h2 className="text-lg font-semibold">Encaissement</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Total */}
            <div className="text-center bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-4">
              <p className="text-xs text-fuchsia-600 font-semibold uppercase">
                Total à encaisser
              </p>
              <p className="text-3xl font-bold text-fuchsia-700 mt-1">
                {total.toLocaleString('fr-FR')}{' '}
                <span className="text-lg">FCFA</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {nbArticles} article{nbArticles > 1 ? 's' : ''}
              </p>
            </div>

            {/* Note encaissement libre */}
            {isLibre && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Encaissement libre</strong> — Le montant sera ajouté à
                votre solde à reverser à l&apos;administrateur.
              </div>
            )}

            {/* Mode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {modesDisponibles.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChangeMode(m)}
                    disabled={submitting}
                    className={`p-3 border-2 rounded-xl flex items-center gap-2 transition-colors ${
                      modePaiement === m
                        ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700'
                        : 'border-gray-200 hover:border-fuchsia-300 text-gray-700'
                    }`}
                  >
                    {MODE_ICONS[m]}
                    <span className="text-sm font-medium">{MODE_LABELS[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Client (optionnel) */}
            <details className="border border-gray-200 rounded-lg">
              <summary className="cursor-pointer p-3 text-sm font-medium text-gray-700">
                Client (optionnel)
              </summary>
              <div className="p-3 pt-0 space-y-2">
                <input
                  type="text"
                  value={nomClient}
                  onChange={(e) => onChangeNom(e.target.value)}
                  disabled={submitting}
                  placeholder="Nom du client (par défaut : CLIENT_ANONYME)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-500"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  value={telClient}
                  onChange={(e) =>
                    onChangeTel(e.target.value.replace(/\D/g, ''))
                  }
                  disabled={submitting}
                  placeholder="Téléphone (9 chiffres)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </details>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encaissement…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL SUCCÈS
// ─────────────────────────────────────────────────────────────

interface SuccessModalProps {
  isOpen: boolean;
  reference?: string;
  montant?: number;
  nbArticles?: number;
  onClose: () => void;
}

function SuccessModal({
  isOpen,
  reference,
  montant,
  nbArticles,
  onClose,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex p-4 bg-emerald-100 rounded-full mb-3"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Vente enregistrée
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            La facture a été créée et votre stock a été mis à jour.
          </p>
          {(reference || montant !== undefined) && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
              {reference && (
                <p className="text-xs text-gray-500">
                  Référence :{' '}
                  <span className="font-mono font-semibold text-gray-900">
                    {reference}
                  </span>
                </p>
              )}
              {montant !== undefined && (
                <p className="text-xs text-gray-500">
                  Montant :{' '}
                  <span className="font-mono font-semibold text-gray-900">
                    {montant.toLocaleString('fr-FR')} FCFA
                  </span>
                </p>
              )}
              {nbArticles !== undefined && (
                <p className="text-xs text-gray-500">
                  Articles :{' '}
                  <span className="font-mono font-semibold text-gray-900">
                    {nbArticles}
                  </span>
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-colors"
          >
            Nouvelle vente
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
