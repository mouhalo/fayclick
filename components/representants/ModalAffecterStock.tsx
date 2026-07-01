/**
 * ModalAffecterStock — Affecter et gérer le stock d'un représentant
 *
 * Modal unifiée pour :
 *   - Voir le stock actuellement affecté au rep (list)
 *   - Ajouter une nouvelle affectation produit (form)
 *   - Modifier le prix imposé (inline)
 *   - Retirer du stock (mouvement RETOUR avec motif)
 *
 * Portage Stage B1 (2026-07-01) : réconcilié avec les signatures RÉELLES de
 * `services/affectation.service.ts` — toutes les méthodes prennent UN SEUL
 * objet params (id_admin inclus dedans), pas un second argument `id_admin`.
 *
 * Cf. docs/superpowers/plans/2026-07-01-representants-stock-b1.md
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Package,
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save,
  Edit3,
  RotateCcw,
  PackageX,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import affectationService from '@/services/affectation.service';
import { produitsService } from '@/services/produits.service';
import {
  AffectationData,
  AffecterProduitParams,
  getValeurStockAffecte,
  isStockBas,
} from '@/types/affectation';
import { RepresentantData } from '@/types/representant';
import { Produit } from '@/types/produit';

interface ModalAffecterStockProps {
  isOpen: boolean;
  onClose: () => void;
  representant: RepresentantData | null;
}

type ModalMode = 'list' | 'affecter';

interface EditingAction {
  aff: AffectationData;
  action: 'PRIX' | 'RETOUR';
}

interface AffecterFormState {
  id_produit: number;
  produit_label: string;
  quantite: number;
  prix_vente_rep: number;
  seuil_alerte_stock: number;
  motif: string;
}

const DEFAULT_FORM: AffecterFormState = {
  id_produit: 0,
  produit_label: '',
  quantite: 0,
  prix_vente_rep: 0,
  seuil_alerte_stock: 0,
  motif: '',
};

export function ModalAffecterStock({
  isOpen,
  onClose,
  representant,
}: ModalAffecterStockProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ModalMode>('list');

  // Stock actuel
  const [stock, setStock] = useState<AffectationData[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  // Form affecter
  const [form, setForm] = useState<AffecterFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Produits pour picker
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loadingProduits, setLoadingProduits] = useState(false);
  const [searchProduit, setSearchProduit] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pageProduits, setPageProduits] = useState(1); // pagination 50/page

  // Action inline (remplace window.prompt) : modifier prix / retourner stock
  const [editingAction, setEditingAction] = useState<EditingAction | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionMotif, setActionMotif] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStock = useCallback(async () => {
    if (!representant?.id_representant) return;
    setLoadingStock(true);
    setStockError(null);
    const t0 = Date.now();
    console.log('[ModalAffecterStock] Chargement stock rep', representant.id_representant);

    // Timeout défensif 10s
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout chargement stock (10s)')), 10000)
    );

    try {
      const res = await Promise.race([
        affectationService.getStockRepresentant(representant.id_representant),
        timeoutPromise,
      ]);
      const data = Array.isArray(res.produits) ? res.produits : [];
      console.log(`[ModalAffecterStock] Stock chargé en ${Date.now() - t0}ms (${data.length} produits)`);
      if (!res.success) {
        setStockError(res.message || 'Erreur de chargement du stock');
      }
      setStock(data);
    } catch (err) {
      console.error('[ModalAffecterStock] Erreur loadStock:', err);
      setStockError(err instanceof Error ? err.message : 'Erreur de chargement');
      setStock([]); // garde un array vide pour ne pas casser le rendu
    } finally {
      setLoadingStock(false);
    }
  }, [representant?.id_representant]);

  const loadProduits = useCallback(async () => {
    if (produits.length > 0) return; // déjà chargé
    setLoadingProduits(true);
    const t0 = Date.now();
    console.log('[ModalAffecterStock] Chargement produits...');

    // Timeout défensif : si la requête ne revient pas dans 15s, on coupe et on log
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout chargement produits (15s)')), 15000)
    );

    try {
      // Filtrer enStock=true pour exclure les ruptures (pas pertinent pour l'affectation)
      // et limiter le résultat à un nombre raisonnable
      const res = await Promise.race([
        produitsService.getListeProduits({ enStock: true }),
        timeoutPromise,
      ]);
      const data = Array.isArray(res.data) ? res.data : [];
      console.log(
        `[ModalAffecterStock] ${data.length} produits chargés en ${Date.now() - t0}ms`
      );
      // Limiter à 500 pour performances UI (10 pages de 50)
      // La recherche permet d'affiner si plus de produits en BD
      setProduits(data.slice(0, 500));
    } catch (err) {
      console.error('[ModalAffecterStock] Erreur chargement produits:', err);
      // En cas d'erreur, on remet à vide pour pas garder un état incohérent
      setProduits([]);
    } finally {
      setLoadingProduits(false);
    }
  }, [produits.length]);

  useEffect(() => {
    if (isOpen && representant) {
      setMode('list');
      setForm(DEFAULT_FORM);
      setFormError(null);
      setEditingAction(null);
      setActionValue('');
      setActionMotif('');
      setActionError(null);
      loadStock();
      // Pré-charger les produits en arrière-plan (UX : si admin clique
      // "Affecter un produit", la liste est déjà prête)
      loadProduits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, representant]);

  const handleClose = () => {
    if (saving || actionSaving) return;
    setMode('list');
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowPicker(false);
    setSearchProduit('');
    setEditingAction(null);
    setActionValue('');
    setActionMotif('');
    setActionError(null);
    onClose();
  };

  const handleSwitchToAffecter = () => {
    setMode('affecter');
    setForm(DEFAULT_FORM);
    setFormError(null);
    loadProduits();
  };

  const handleSelectProduit = (p: Produit) => {
    setForm({
      ...form,
      id_produit: p.id_produit,
      produit_label: p.nom_produit,
      // Pré-remplir prix_vente_rep avec le prix de vente du produit (modifiable)
      prix_vente_rep: form.prix_vente_rep || p.prix_vente || 0,
    });
    setShowPicker(false);
    setSearchProduit('');
  };

  const handleSaveAffectation = async () => {
    if (!user?.id_structure || !user?.id || !representant?.id_representant) {
      toast.error('Session invalide');
      return;
    }
    setFormError(null);

    if (form.id_produit <= 0) {
      setFormError('Sélectionnez un produit');
      return;
    }
    if (form.quantite <= 0) {
      setFormError('La quantité doit être strictement positive');
      return;
    }
    if (form.prix_vente_rep <= 0) {
      setFormError('Le prix de vente imposé doit être strictement positif');
      return;
    }

    const payload: AffecterProduitParams = {
      id_structure: user.id_structure,
      id_produit: form.id_produit,
      id_representant: representant.id_representant,
      quantite: form.quantite,
      prix_vente_rep: form.prix_vente_rep,
      seuil_alerte_stock:
        form.seuil_alerte_stock > 0 ? form.seuil_alerte_stock : undefined,
      motif: form.motif.trim() || undefined,
      id_admin: user.id,
    };

    setSaving(true);
    try {
      const res = await affectationService.affecterProduit(payload);
      if (res.success) {
        toast.success(res.message || 'Produit affecté avec succès');
        setMode('list');
        setForm(DEFAULT_FORM);
        loadStock();
      } else {
        setFormError(res.message || "Erreur lors de l'affectation");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  };

  // Ouvre le panneau inline "Modifier le prix" pour une affectation donnée
  const openModifierPrix = (aff: AffectationData) => {
    setEditingAction({ aff, action: 'PRIX' });
    setActionValue(String(aff.prix_vente_rep));
    setActionMotif('');
    setActionError(null);
  };

  // Ouvre le panneau inline "Retourner du stock" pour une affectation donnée
  const openRetour = (aff: AffectationData) => {
    setEditingAction({ aff, action: 'RETOUR' });
    setActionValue(String(aff.quantite_restante));
    setActionMotif('');
    setActionError(null);
  };

  const resetActionState = () => {
    setEditingAction(null);
    setActionValue('');
    setActionMotif('');
    setActionError(null);
  };

  const handleCancelAction = () => {
    if (actionSaving) return;
    resetActionState();
  };

  const handleConfirmAction = async () => {
    if (!editingAction || !user?.id) return;
    const { aff, action } = editingAction;
    setActionError(null);

    if (action === 'PRIX') {
      const nouveauPrix = Number(actionValue);
      if (isNaN(nouveauPrix) || nouveauPrix <= 0) {
        setActionError('Prix invalide');
        return;
      }
      setActionSaving(true);
      try {
        const res = await affectationService.modifierPrix({
          id_affectation: aff.id_affectation,
          nouveau_prix: nouveauPrix,
          motif: actionMotif.trim() || undefined,
          id_admin: user.id,
        });
        if (res.success) {
          toast.success(res.message || 'Prix modifié');
          resetActionState();
          loadStock();
        } else {
          setActionError(res.message || 'Erreur lors de la modification');
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setActionSaving(false);
      }
      return;
    }

    // action === 'RETOUR'
    const qty = Number(actionValue);
    if (isNaN(qty) || qty <= 0 || qty > aff.quantite_restante) {
      setActionError(`Quantité invalide (doit être entre 1 et ${aff.quantite_restante})`);
      return;
    }
    if (!actionMotif || actionMotif.trim().length < 3) {
      setActionError('Le motif est obligatoire (3 caractères min)');
      return;
    }
    setActionSaving(true);
    try {
      const res = await affectationService.retirerStock({
        id_affectation: aff.id_affectation,
        quantite: qty,
        motif: actionMotif.trim(),
        id_admin: user.id,
      });
      if (res.success) {
        toast.success(res.message || 'Stock retourné au stock global');
        resetActionState();
        loadStock();
      } else {
        setActionError(res.message || 'Erreur lors du retour');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setActionSaving(false);
    }
  };

  // Filtrer produits par recherche (front, sur tous les produits chargés)
  const allFilteredProduits = produits.filter((p) => {
    if (!searchProduit.trim()) return true;
    const q = searchProduit.trim().toLowerCase();
    return (
      p.nom_produit?.toLowerCase().includes(q) ||
      p.code_produit?.toLowerCase().includes(q) ||
      p.code_barre?.includes(q)
    );
  });

  // Pagination 50/page sur les résultats filtrés
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(allFilteredProduits.length / PAGE_SIZE));
  const safePage = Math.min(pageProduits, totalPages);
  const filteredProduits = allFilteredProduits.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Reset page à 1 quand la recherche change
  useEffect(() => {
    setPageProduits(1);
  }, [searchProduit]);

  // Calcul KPIs
  const totalProduits = stock.length;
  const totalValeur = stock.reduce((acc, a) => acc + getValeurStockAffecte(a), 0);
  const nbStockBas = stock.filter(isStockBas).length;

  if (!isOpen || !representant) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-fuchsia-500 to-purple-600">
            <div className="flex items-center gap-3 text-white min-w-0">
              {mode === 'affecter' && (
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="p-1.5 hover:bg-white/20 rounded-lg"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <Package className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {mode === 'affecter' ? 'Affecter un produit' : 'Stock affecté'}
                </h2>
                <p className="text-xs text-fuchsia-100 truncate">
                  {representant.prenom_rep} {representant.nom_rep} · @
                  {representant.username}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="p-2 hover:bg-white/20 rounded-lg text-white disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu — selon mode */}
          <div className="flex-1 overflow-y-auto">
            {mode === 'list' ? (
              editingAction ? (
                <ActionPanel
                  editingAction={editingAction}
                  value={actionValue}
                  onValueChange={setActionValue}
                  motif={actionMotif}
                  onMotifChange={setActionMotif}
                  error={actionError}
                  saving={actionSaving}
                  onCancel={handleCancelAction}
                  onConfirm={handleConfirmAction}
                />
              ) : (
                <ListView
                  stock={stock}
                  loading={loadingStock}
                  error={stockError}
                  onRetry={loadStock}
                  onModifierPrix={openModifierPrix}
                  onRetour={openRetour}
                  totalProduits={totalProduits}
                  totalValeur={totalValeur}
                  nbStockBas={nbStockBas}
                />
              )
            ) : (
              <FormView
                form={form}
                onChange={setForm}
                produits={filteredProduits}
                totalProduitsFiltres={allFilteredProduits.length}
                currentPage={safePage}
                totalPages={totalPages}
                onPrevPage={() => setPageProduits((p) => Math.max(1, p - 1))}
                onNextPage={() => setPageProduits((p) => Math.min(totalPages, p + 1))}
                showPicker={showPicker}
                onTogglePicker={() => setShowPicker(!showPicker)}
                searchProduit={searchProduit}
                onSearchChange={setSearchProduit}
                onSelectProduit={handleSelectProduit}
                loadingProduits={loadingProduits}
                error={formError}
                saving={saving}
              />
            )}
          </div>

          {/* Footer — masqué pendant l'édition inline (ActionPanel a ses propres boutons) */}
          {!editingAction && (
          <div className="p-4 border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
            {mode === 'list' ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToAffecter}
                  className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Affecter un produit</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveAffectation}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Affectation…</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Affecter</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// SOUS-VUES
// ─────────────────────────────────────────────────────────────

interface ListViewProps {
  stock: AffectationData[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onModifierPrix: (aff: AffectationData) => void;
  onRetour: (aff: AffectationData) => void;
  totalProduits: number;
  totalValeur: number;
  nbStockBas: number;
}

function ListView({
  stock,
  loading,
  error,
  onRetry,
  onModifierPrix,
  onRetour,
  totalProduits,
  totalValeur,
  nbStockBas,
}: ListViewProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Chargement du stock…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-red-600 font-medium text-center">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-colors text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (stock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <PackageX className="w-14 h-14 text-gray-300 mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Aucun produit affecté
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Cliquez sur &quot;Affecter un produit&quot; ci-dessous pour transférer du
          stock à ce représentant avec un prix imposé.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-3 text-center">
          <p className="text-xs text-fuchsia-600 font-semibold">Produits</p>
          <p className="text-2xl font-bold text-fuchsia-700 mt-1">
            {totalProduits}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-xs text-purple-600 font-semibold">Valeur stock</p>
          <p className="text-base font-bold text-purple-700 mt-1">
            {totalValeur.toLocaleString('fr-FR')}{' '}
            <span className="text-xs">FCFA</span>
          </p>
        </div>
        <div
          className={`border rounded-lg p-3 text-center ${
            nbStockBas > 0
              ? 'bg-orange-50 border-orange-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              nbStockBas > 0 ? 'text-orange-600' : 'text-emerald-600'
            }`}
          >
            Stock bas
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              nbStockBas > 0 ? 'text-orange-700' : 'text-emerald-700'
            }`}
          >
            {nbStockBas}
          </p>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {stock.map((aff) => {
          const valeur = getValeurStockAffecte(aff);
          const bas = isStockBas(aff);
          return (
            <motion.div
              key={aff.id_affectation}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`border rounded-lg p-3 ${
                bas
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {aff.nom_produit || `Produit #${aff.id_produit}`}
                    </h4>
                    {bas && (
                      <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-semibold rounded">
                        Stock bas
                      </span>
                    )}
                  </div>
                  {aff.nom_categorie && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Catégorie : {aff.nom_categorie}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className="font-bold text-gray-900">
                        {aff.quantite_restante.toLocaleString('fr-FR')}
                        <span className="text-xs text-gray-500 ml-1">
                          / {aff.quantite_affectee.toLocaleString('fr-FR')}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Prix imposé</p>
                      <p className="font-bold text-fuchsia-600">
                        {aff.prix_vente_rep.toLocaleString('fr-FR')}
                        <span className="text-xs ml-0.5">F</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Valeur</p>
                      <p className="font-bold text-gray-900">
                        {valeur.toLocaleString('fr-FR')}
                        <span className="text-xs ml-0.5">F</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onModifierPrix(aff)}
                    className="p-2 rounded-lg bg-gray-50 hover:bg-fuchsia-50 hover:text-fuchsia-600 text-gray-500 transition-colors"
                    title="Modifier le prix imposé"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {aff.quantite_restante > 0 && (
                    <button
                      type="button"
                      onClick={() => onRetour(aff)}
                      className="p-2 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
                      title="Retourner du stock"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

interface ActionPanelProps {
  editingAction: EditingAction;
  value: string;
  onValueChange: (v: string) => void;
  motif: string;
  onMotifChange: (v: string) => void;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Panneau inline remplaçant les anciens window.prompt() pour :
 *   - "Modifier le prix imposé" (action = 'PRIX')
 *   - "Retourner du stock" (action = 'RETOUR')
 */
function ActionPanel({
  editingAction,
  value,
  onValueChange,
  motif,
  onMotifChange,
  error,
  saving,
  onCancel,
  onConfirm,
}: ActionPanelProps) {
  const { aff, action } = editingAction;
  const isPrix = action === 'PRIX';

  const numValue = Number(value);
  const valueValid = isPrix
    ? !isNaN(numValue) && numValue > 0
    : !isNaN(numValue) && numValue > 0 && numValue <= aff.quantite_restante;
  const motifValid = isPrix ? true : motif.trim().length >= 3;
  const canConfirm = valueValid && motifValid && !saving;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-gray-800">
        {isPrix ? (
          <Edit3 className="w-4 h-4 text-fuchsia-600" />
        ) : (
          <RotateCcw className="w-4 h-4 text-red-500" />
        )}
        <h3 className="font-semibold">
          {isPrix ? 'Modifier le prix imposé' : 'Retourner du stock'}
        </h3>
      </div>

      <p className="text-sm text-gray-600">
        Produit :{' '}
        <span className="font-medium text-gray-900">
          {aff.nom_produit || `Produit #${aff.id_produit}`}
        </span>
      </p>
      {isPrix ? (
        <p className="text-xs text-gray-500">
          Prix actuel : {aff.prix_vente_rep.toLocaleString('fr-FR')} FCFA
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Stock chez le rep : {aff.quantite_restante.toLocaleString('fr-FR')}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isPrix
            ? 'Nouveau prix imposé (FCFA) *'
            : `Quantité à retourner (max ${aff.quantite_restante}) *`}
        </label>
        <input
          type="number"
          min={1}
          max={isPrix ? undefined : aff.quantite_restante}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={saving}
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
          placeholder={isPrix ? 'Ex: 1500' : 'Ex: 5'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isPrix ? 'Motif (optionnel)' : 'Motif (obligatoire, 3 caractères min) *'}
        </label>
        <textarea
          rows={2}
          value={motif}
          onChange={(e) => onMotifChange(e.target.value)}
          maxLength={200}
          disabled={saving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 resize-none"
          placeholder={
            isPrix ? 'Ex: Ajustement tarif saisonnier' : 'Ex: invendu, fin contrat'
          }
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enregistrement…</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Confirmer</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

interface FormViewProps {
  form: AffecterFormState;
  onChange: (f: AffecterFormState) => void;
  produits: Produit[]; // page courante (50 max)
  totalProduitsFiltres: number;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  showPicker: boolean;
  onTogglePicker: () => void;
  searchProduit: string;
  onSearchChange: (s: string) => void;
  onSelectProduit: (p: Produit) => void;
  loadingProduits: boolean;
  error: string | null;
  saving: boolean;
}

function FormView({
  form,
  onChange,
  produits,
  totalProduitsFiltres,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  showPicker,
  onTogglePicker,
  searchProduit,
  onSearchChange,
  onSelectProduit,
  loadingProduits,
  error,
  saving,
}: FormViewProps) {
  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Produit picker */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          <Package className="w-3.5 h-3.5" />
          Produit à affecter *
        </label>
        <button
          type="button"
          onClick={onTogglePicker}
          disabled={saving}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-left bg-white hover:border-fuchsia-500 flex items-center justify-between disabled:opacity-50"
        >
          <span className={form.id_produit > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {form.id_produit > 0
              ? form.produit_label
              : 'Cliquer pour sélectionner un produit…'}
          </span>
          <Tag className="w-4 h-4 text-fuchsia-500" />
        </button>

        {showPicker && (
          <div className="mt-2 border border-gray-200 rounded-lg bg-white flex flex-col max-h-96">
            {/* Barre de recherche sticky */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={searchProduit}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Rechercher par nom, code, code-barres…"
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-fuchsia-500"
                  autoFocus
                />
              </div>
              {totalProduitsFiltres > 0 && (
                <p className="text-xs text-gray-500 mt-1.5 px-1">
                  {totalProduitsFiltres} produit{totalProduitsFiltres > 1 ? 's' : ''}{' '}
                  trouvé{totalProduitsFiltres > 1 ? 's' : ''} · Page {currentPage}/
                  {totalPages}
                </p>
              )}
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto">
              {loadingProduits ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-5 h-5 text-fuchsia-500 animate-spin inline mb-2" />
                  <p className="text-xs text-gray-500">Chargement des produits…</p>
                </div>
              ) : produits.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">
                  {searchProduit.trim()
                    ? `Aucun produit ne correspond à "${searchProduit}"`
                    : 'Aucun produit disponible'}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {produits.map((p) => (
                    <li key={p.id_produit}>
                      <button
                        type="button"
                        onClick={() => onSelectProduit(p)}
                        className="w-full text-left px-3 py-2 hover:bg-fuchsia-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {p.nom_produit}
                        </p>
                        <p className="text-xs text-gray-500">
                          Stock global : {p.niveau_stock ?? '?'} · Prix vente :{' '}
                          {(p.prix_vente || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Navbar pagination sticky en bas */}
            {!loadingProduits && totalPages > 1 && (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onPrevPage}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 rounded text-fuchsia-600 hover:bg-fuchsia-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Précédent
                </button>
                <span className="text-xs text-gray-600 font-medium">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 rounded text-fuchsia-600 hover:bg-fuchsia-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantité + Prix */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantité à affecter *
          </label>
          <input
            type="number"
            min={1}
            value={form.quantite || ''}
            onChange={(e) => onChange({ ...form, quantite: Number(e.target.value) || 0 })}
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Ex: 50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix de vente imposé *
          </label>
          <input
            type="number"
            min={1}
            value={form.prix_vente_rep || ''}
            onChange={(e) =>
              onChange({ ...form, prix_vente_rep: Number(e.target.value) || 0 })
            }
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
            placeholder="FCFA"
          />
          <p className="text-xs text-gray-500 mt-1">
            Le rep verra ce prix en lecture seule.
          </p>
        </div>
      </div>

      {/* Seuil alerte stock (optionnel) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Seuil d&apos;alerte stock bas (optionnel)
        </label>
        <input
          type="number"
          min={0}
          value={form.seuil_alerte_stock || ''}
          onChange={(e) =>
            onChange({ ...form, seuil_alerte_stock: Number(e.target.value) || 0 })
          }
          disabled={saving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
          placeholder="Ex: 5 — alerte si stock rep descend en dessous"
        />
      </div>

      {/* Motif (optionnel) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Motif (optionnel — tracé dans le journal d&apos;audit)
        </label>
        <textarea
          rows={2}
          value={form.motif}
          onChange={(e) => onChange({ ...form, motif: e.target.value })}
          maxLength={200}
          disabled={saving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 resize-none"
          placeholder="Ex: Dotation mensuelle, lancement nouveau produit, etc."
        />
      </div>
    </div>
  );
}

export default ModalAffecterStock;
