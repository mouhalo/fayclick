/**
 * RepresentantsManagement — Onglet Settings pour gérer les représentants
 *
 * Pattern miroir de UsersManagement (chargement direct via service, pas de hook
 * wrapper, full reload après action).
 *
 * GATING : ce composant n'est rendu que si `structure.compte_distributeur === true`.
 * Le contrôle est fait dans app/settings/page.tsx avant l'import.
 *
 * Stage A : pas d'affectation de stock (Stage B, hors scope). Les actions
 * couvertes ici sont : créer, modifier, suspendre, réactiver, réinitialiser MDP.
 *
 * Cf. docs/superpowers/plans/2026-07-01-representants-stage-a.md
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Loader2, Plus, AlertCircle, Search, Pause, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import representantService from '@/services/representant.service';
import { RepresentantData } from '@/types/representant';
import RepresentantCard from '@/components/representants/RepresentantCard';
import ModalCreerRepresentant from '@/components/representants/ModalCreerRepresentant';
import ModalPasswordRevealRep from '@/components/representants/ModalPasswordRevealRep';

interface RepresentantsManagementProps {
  onShowMessage?: (message: string, type: 'success' | 'error') => void;
  /** Limite maximale (depuis param_structure.nb_reps_max — défaut 5) */
  maxRepresentants?: number;
}

export function RepresentantsManagement({
  onShowMessage,
  maxRepresentants,
}: RepresentantsManagementProps) {
  const { user } = useAuth();
  const [representants, setRepresentants] = useState<RepresentantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRep, setEditingRep] = useState<RepresentantData | null>(null);
  const [resetPwdRep, setResetPwdRep] = useState<RepresentantData | null>(null);
  const [confirmSuspendRep, setConfirmSuspendRep] = useState<RepresentantData | null>(null);
  const [suspending, setSuspending] = useState(false);

  const MAX_REPS = maxRepresentants ?? 5;
  const limiteAtteinte = representants.length >= MAX_REPS;

  const loadRepresentants = useCallback(async () => {
    if (!user?.id_structure) {
      setError('Structure non identifiée');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await representantService.getRepresentants(user.id_structure);
      const data = Array.isArray(response.data) ? response.data : [];
      setRepresentants(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(msg);
      onShowMessage?.(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id_structure, onShowMessage]);

  useEffect(() => {
    loadRepresentants();
  }, [loadRepresentants]);

  const handleOpenCreate = () => {
    setEditingRep(null);
    setShowCreateModal(true);
  };

  const handleEdit = (rep: RepresentantData) => {
    setEditingRep(rep);
    setShowCreateModal(true);
  };

  // ────────────────────────────────────────────────────────────
  // SUSPENDRE — confirmation via modale inline (pas de window.confirm)
  // ────────────────────────────────────────────────────────────

  const handleSuspendre = (rep: RepresentantData) => {
    setConfirmSuspendRep(rep);
  };

  const handleConfirmSuspendre = async () => {
    if (!confirmSuspendRep || !user?.id_structure || !user?.id) return;
    setSuspending(true);
    try {
      const res = await representantService.suspendre({
        id_structure: user.id_structure,
        id_representant: confirmSuspendRep.id_representant,
        id_admin: user.id,
      });
      if (res.success) {
        toast.success(res.message || 'Représentant suspendu');
        onShowMessage?.(res.message || 'Représentant suspendu', 'success');
        setConfirmSuspendRep(null);
        loadRepresentants();
      } else {
        toast.error(res.message || 'Erreur lors de la suspension');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSuspending(false);
    }
  };

  const handleReactiver = async (rep: RepresentantData) => {
    if (!user?.id_structure || !user?.id) return;
    try {
      const res = await representantService.reactiver({
        id_structure: user.id_structure,
        id_representant: rep.id_representant,
        id_admin: user.id,
      });
      if (res.success) {
        toast.success(res.message || 'Représentant réactivé');
        onShowMessage?.(res.message || 'Représentant réactivé', 'success');
        loadRepresentants();
      } else {
        toast.error(res.message || 'Erreur lors de la réactivation');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ────────────────────────────────────────────────────────────
  // RESET MDP — modale de révélation (ModalPasswordRevealRep gère l'appel API)
  // ────────────────────────────────────────────────────────────

  const handleResetPwd = (rep: RepresentantData) => {
    setResetPwdRep(rep);
  };

  const handleCreateSuccess = () => {
    loadRepresentants();
  };

  // Filtrage local par recherche (defensive : si PG renvoie non-array, on garde [])
  const filteredReps = (Array.isArray(representants) ? representants : []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.username?.toLowerCase().includes(q) ||
      r.nom_rep?.toLowerCase().includes(q) ||
      r.prenom_rep?.toLowerCase().includes(q) ||
      r.telephone?.includes(q) ||
      r.localite?.nom_localite?.toLowerCase().includes(q)
    );
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Chargement des représentants…</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={loadRepresentants}
          className="mt-4 px-4 py-2 bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CTA Ajouter */}
      <button
        type="button"
        onClick={handleOpenCreate}
        disabled={limiteAtteinte}
        className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3 ${
          limiteAtteinte
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 hover:shadow-lg'
        }`}
      >
        <Plus className="h-5 w-5" />
        {limiteAtteinte
          ? `${representants.length}/${MAX_REPS} représentants — limite atteinte`
          : `Ajouter un représentant (${representants.length}/${MAX_REPS})`}
      </button>

      {/* Bandeau limite */}
      {limiteAtteinte && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Limite maximale atteinte</p>
            <p className="text-xs text-orange-700 mt-1">
              Vous avez atteint la limite de {MAX_REPS} représentants pour votre abonnement. Pour
              en ajouter un nouveau, suspendez ou supprimez un représentant existant.
            </p>
          </div>
        </div>
      )}

      {/* Recherche */}
      {representants.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, username, téléphone, localité…"
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm"
          />
        </div>
      )}

      {/* Liste / Empty state */}
      {representants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center"
        >
          <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            Aucun représentant pour l&apos;instant
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Créez votre premier représentant pour démarrer votre réseau de distribution.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer mon premier représentant
          </button>
        </motion.div>
      ) : filteredReps.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          Aucun représentant ne correspond à votre recherche.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReps.map((rep, index) => (
            <RepresentantCard
              key={rep.id_representant}
              representant={rep}
              index={index}
              onEdit={handleEdit}
              onSuspendre={handleSuspendre}
              onReactiver={handleReactiver}
              onResetPwd={handleResetPwd}
            />
          ))}
        </div>
      )}

      {/* Modal création / édition */}
      {user?.id_structure && (
        <ModalCreerRepresentant
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRep(null);
          }}
          idStructure={user.id_structure}
          representantToEdit={editingRep}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Modal réinitialisation + révélation mot de passe */}
      {user?.id_structure && user?.id && (
        <ModalPasswordRevealRep
          isOpen={!!resetPwdRep}
          onClose={() => setResetPwdRep(null)}
          representant={resetPwdRep}
          idStructure={user.id_structure}
          idAdmin={user.id}
          onSuccess={loadRepresentants}
        />
      )}

      {/* Confirmation de suspension (remplace window.confirm) */}
      <AnimatePresence>
        {confirmSuspendRep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !suspending && setConfirmSuspendRep(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-red-200 bg-red-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Pause className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Suspendre le représentant
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !suspending && setConfirmSuspendRep(null)}
                  disabled={suspending}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-700">
                  Suspendre{' '}
                  <span className="font-semibold">
                    {confirmSuspendRep.prenom_rep} {confirmSuspendRep.nom_rep}
                  </span>{' '}
                  ? Il ne pourra plus se connecter ni vendre tant qu&apos;il n&apos;est pas
                  réactivé.
                </p>
              </div>

              <div className="p-4 border-t border-gray-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSuspendRep(null)}
                  disabled={suspending}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuspendre}
                  disabled={suspending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {suspending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suspension…</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Suspendre</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RepresentantsManagement;
