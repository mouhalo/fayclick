/**
 * ModalGestionFournisseurs — Modal CRUD + Selection des fournisseurs
 *
 * EPIC 1 — Phase 4 (UI Module Fournisseurs)
 * Reference : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-007)
 *
 * Deux modes d'utilisation :
 *   1. Mode SELECTION   : selectionMode=true + onSelectFournisseur fourni
 *      → Affiche un bouton "Selectionner" sur chaque ligne, ferme la modal au clic
 *   2. Mode GESTION pur : selectionMode=false (ou omis)
 *      → Affiche uniquement les actions Edit / Delete
 *
 * Dans les deux modes, les actions Edit / Delete restent disponibles.
 *
 * Donnees : fournisseurService.getListFournisseurs() (cache 5 min, refresh manuel)
 * Recherche : locale via fournisseurService.searchFournisseurByName() (insensible casse + accents)
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Plus,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  Edit3,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Package,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fournisseurService,
  FournisseurApiException,
} from '@/services/fournisseur.service';
import type { Fournisseur } from '@/types/fournisseur';
import { ModalCreerFournisseur } from './ModalCreerFournisseur';

interface ModalGestionFournisseursProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback de selection — declenche en mode `selectionMode=true` au clic sur "Selectionner" */
  onSelectFournisseur?: (fournisseur: Fournisseur) => void;
  /** Active le mode selection (affiche le bouton "Selectionner" sur chaque ligne) */
  selectionMode?: boolean;
}

export function ModalGestionFournisseurs({
  isOpen,
  onClose,
  onSelectFournisseur,
  selectionMode = false,
}: ModalGestionFournisseursProps) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal create/edit
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<
    Fournisseur | undefined
  >(undefined);

  // Etat de suppression (id en cours)
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /**
   * Chargement de la liste (avec ou sans force refresh)
   */
  const loadFournisseurs = useCallback(
    async (forceRefresh: boolean = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fournisseurService.getListFournisseurs(
          forceRefresh
        );
        setFournisseurs(
          Array.isArray(response.fournisseurs) ? response.fournisseurs : []
        );
      } catch (err) {
        const msg =
          err instanceof FournisseurApiException
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Erreur de chargement des fournisseurs';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Chargement initial a l'ouverture
  useEffect(() => {
    if (isOpen) {
      loadFournisseurs(false);
    }
  }, [isOpen, loadFournisseurs]);

  // Reset search a la fermeture
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setEditingFournisseur(undefined);
      setShowCreateModal(false);
    }
  }, [isOpen]);

  /**
   * Recherche locale (memoised pour eviter recalculs inutiles).
   * Utilise la meme normalisation que le service (case + accents).
   */
  const filtered = useMemo(() => {
    if (!search.trim()) return fournisseurs;
    const needle = search
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
    return fournisseurs.filter((f) => {
      const haystack = [
        f.nom_fournisseur,
        f.tel_fournisseur || '',
        f.email_fournisseur || '',
      ]
        .join(' ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [fournisseurs, search]);

  const handleRefresh = () => {
    loadFournisseurs(true);
  };

  const handleOpenCreate = () => {
    setEditingFournisseur(undefined);
    setShowCreateModal(true);
  };

  const handleEdit = (f: Fournisseur) => {
    setEditingFournisseur(f);
    setShowCreateModal(true);
  };

  /**
   * Confirmation native + soft delete (actif=FALSE cote PG).
   * Refresh force apres succes.
   */
  const handleDelete = async (f: Fournisseur) => {
    const confirm = window.confirm(
      `Desactiver le fournisseur "${f.nom_fournisseur}" ?\n\n` +
        (f.nb_bons_commandes > 0
          ? `Il a ${f.nb_bons_commandes} bon(s) de commande historique(s) — l'historique sera conserve.\n\n`
          : '') +
        'Le fournisseur n\'apparaitra plus dans la liste mais pourra etre recree si necessaire.'
    );
    if (!confirm) return;

    setDeletingId(f.id_fournisseur);
    try {
      const res = await fournisseurService.deleteFournisseur(f.id_fournisseur);
      if (res.success) {
        toast.success(res.message || 'Fournisseur desactive');
        await loadFournisseurs(true);
      } else {
        toast.error(res.message || 'Erreur lors de la desactivation');
      }
    } catch (err) {
      const msg =
        err instanceof FournisseurApiException
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Erreur inattendue';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Callback succes ModalCreerFournisseur.
   * On force un refresh pour avoir nb_bons_commandes et tous les champs canoniques.
   */
  const handleCreateOrEditSuccess = async (_fournisseur: Fournisseur) => {
    void _fournisseur; // non utilise — on refait un fetch pour avoir la donnee canonique
    await loadFournisseurs(true);
  };

  const handleSelect = (f: Fournisseur) => {
    if (onSelectFournisseur) {
      onSelectFournisseur(f);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-sky-500">
              <div className="flex items-center gap-2 text-white min-w-0">
                <Building2 className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {selectionMode
                      ? 'Selectionner un fournisseur'
                      : 'Gestion des fournisseurs'}
                  </h2>
                  <p className="text-xs text-white/80">
                    {fournisseurs.length} fournisseur
                    {fournisseurs.length > 1 ? 's' : ''} actif
                    {fournisseurs.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white disabled:opacity-50"
                  aria-label="Rafraichir la liste"
                  title="Rafraichir la liste"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barre actions (recherche + nouveau) — sticky */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm space-y-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, telephone ou email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  aria-label="Rechercher un fournisseur"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Fournisseur</span>
              </button>
            </div>

            {/* Contenu — liste */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-gray-500 text-sm">
                    Chargement des fournisseurs...
                  </p>
                </div>
              )}

              {/* Error */}
              {!isLoading && error && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                  <p className="text-red-600 font-medium mb-1">{error}</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Reessayer
                  </button>
                </div>
              )}

              {/* Empty state (aucun fournisseur dans la base) */}
              {!isLoading && !error && fournisseurs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <Inbox className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">
                    Aucun fournisseur
                  </p>
                  <p className="text-gray-500 text-sm">
                    Creez le premier fournisseur pour commencer.
                  </p>
                </div>
              )}

              {/* Empty search */}
              {!isLoading &&
                !error &&
                fournisseurs.length > 0 &&
                filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Search className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-700 font-medium mb-1">
                      Aucun resultat
                    </p>
                    <p className="text-gray-500 text-sm">
                      Aucun fournisseur ne correspond a &laquo; {search} &raquo;
                    </p>
                  </div>
                )}

              {/* Liste */}
              {!isLoading && !error && filtered.length > 0 && (
                <ul className="space-y-2">
                  {filtered.map((f, idx) => (
                    <motion.li
                      key={f.id_fournisseur}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md rounded-xl p-3 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {f.nom_fournisseur}
                            </h3>
                            {f.nb_bons_commandes > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                                <Package className="w-3 h-3" />
                                {f.nb_bons_commandes} bon
                                {f.nb_bons_commandes > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                            {f.tel_fournisseur && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {f.tel_fournisseur}
                              </span>
                            )}
                            {f.email_fournisseur && (
                              <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                                <Mail className="w-3 h-3" />
                                {f.email_fournisseur}
                              </span>
                            )}
                          </div>

                          {f.ninea && (
                            <p className="mt-1 text-[10px] text-gray-500">
                              NINEA : {f.ninea}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {selectionMode && onSelectFournisseur && (
                              <button
                                type="button"
                                onClick={() => handleSelect(f)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Selectionner</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEdit(f)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition-colors"
                              aria-label={`Modifier ${f.nom_fournisseur}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Modifier</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(f)}
                              disabled={deletingId === f.id_fournisseur}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Desactiver ${f.nom_fournisseur}`}
                            >
                              {deletingId === f.id_fournisseur ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">
                                {deletingId === f.id_fournisseur
                                  ? 'Suppression...'
                                  : 'Desactiver'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal creation / edition (z-index superieur, gere par la modal elle-meme) */}
      <ModalCreerFournisseur
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingFournisseur(undefined);
        }}
        onSuccess={handleCreateOrEditSuccess}
        fournisseurToEdit={editingFournisseur}
      />
    </>
  );
}

export default ModalGestionFournisseurs;
