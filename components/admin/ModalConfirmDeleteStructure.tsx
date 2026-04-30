/**
 * Modal de suppression définitive d'une structure (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § 3.3 (US-3)
 *
 * UX critique : suppression irréversible avec confirmation forte.
 * - Snapshot des données affichées avant suppression
 * - Champ texte de confirmation (saisie du nom EXACT, case-sensitive)
 * - Bouton désactivé tant que `inputValue !== nom_structure`
 * - Garde-fou : structure id=0 (admin système) → désactivée intégralement
 *
 * Backend : `delete_structure(p_id_structure, p_id_admin)` gère le snapshot
 * complet dans admin_actions_log + cascade DELETE.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Building2,
  Users,
  Receipt,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';
import { StructureDetailData } from '@/types/admin.types';

interface ModalConfirmDeleteStructureProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
  /** Callback exécuté après suppression réussie — typiquement ferme le modal détail parent + refresh la liste */
  onDeleted?: () => void;
}

interface SnapshotData {
  nom_structure: string;
  type_structure: string;
  /** Nombre de factures total — issu de `getDetailStructure().data.stats.nombre_factures_total` */
  nb_factures: number | null;     // null si l'appel détail a échoué
  nb_utilisateurs: number;
}

export function ModalConfirmDeleteStructure({
  isOpen,
  onClose,
  idStructure,
  onDeleted
}: ModalConfirmDeleteStructureProps) {
  const { user } = useAuth();

  // États
  const [loadingData, setLoadingData] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Garde-fou structure système
  const isSystemStructure = idStructure === 0;

  useEffect(() => {
    if (isOpen && idStructure !== null && !isSystemStructure) {
      loadSnapshot();
    }
  }, [isOpen, idStructure, isSystemStructure]);

  const handleClose = () => {
    if (deleting) return; // Empêcher la fermeture pendant la suppression
    setSnapshot(null);
    setInputValue('');
    setError(null);
    setDeleting(false);
    onClose();
  };

  const loadSnapshot = async () => {
    if (!idStructure) return;
    setLoadingData(true);
    setError(null);
    try {
      // Récupération en parallèle :
      // - getUneStructure : nom, type, utilisateurs
      // - getDetailStructure : nombre_factures_total (snapshot avant suppression)
      // L'appel détail est best-effort : si échec, on continue avec nb_factures=null
      const [uneRes, detailRes] = await Promise.allSettled([
        adminService.getUneStructure(idStructure),
        adminService.getDetailStructure(idStructure)
      ]);

      if (
        uneRes.status === 'fulfilled' &&
        uneRes.value.success &&
        uneRes.value.data
      ) {
        const data = uneRes.value.data as StructureDetailData;

        // nb_factures depuis getDetailStructure (best-effort)
        let nbFactures: number | null = null;
        if (
          detailRes.status === 'fulfilled' &&
          detailRes.value.success &&
          detailRes.value.data?.stats?.nombre_factures_total !== undefined
        ) {
          nbFactures = detailRes.value.data.stats.nombre_factures_total;
        } else if (detailRes.status === 'rejected') {
          SecurityService.secureLog(
            'warn',
            '[ModalConfirmDeleteStructure] getDetailStructure a échoué (non bloquant)',
            detailRes.reason
          );
        }

        setSnapshot({
          nom_structure: data.nom_structure || '',
          type_structure: data.type_structure || '-',
          nb_factures: nbFactures,
          nb_utilisateurs: data.utilisateurs?.coalesce?.length ?? 0
        });
      } else {
        const reason =
          uneRes.status === 'rejected' ? uneRes.reason : 'Réponse invalide';
        SecurityService.secureLog(
          'error',
          '[ModalConfirmDeleteStructure] erreur getUneStructure',
          reason
        );
        setError('Impossible de charger les informations de la structure');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalConfirmDeleteStructure] erreur snapshot', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDelete = async () => {
    if (!idStructure || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }
    if (!snapshot) {
      toast.error('Données de la structure non chargées');
      return;
    }
    // Vérification stricte : nom EXACT case-sensitive
    if (inputValue !== snapshot.nom_structure) {
      toast.error('Le nom saisi ne correspond pas');
      return;
    }

    setDeleting(true);
    try {
      const response = await adminService.deleteStructure({
        id_structure: idStructure,
        id_admin: user.id
      });

      if (response.success) {
        // Construire un message enrichi avec les nombres remontés du backend
        const baseMsg = response.message || 'Structure supprimée avec succès';
        const details: string[] = [];
        if (typeof response.nb_factures_supprimees === 'number') {
          details.push(`${response.nb_factures_supprimees} facture${response.nb_factures_supprimees > 1 ? 's' : ''}`);
        }
        if (typeof response.nb_users_supprimes === 'number') {
          details.push(`${response.nb_users_supprimes} utilisateur${response.nb_users_supprimes > 1 ? 's' : ''}`);
        }
        const fullMsg = details.length > 0
          ? `${baseMsg} (${details.join(' et ')} supprimés)`
          : baseMsg;
        toast.success(fullMsg);

        if (onDeleted) onDeleted();
        // Reset interne avant fermeture (sans passer par handleClose qui bloque pendant deleting)
        setSnapshot(null);
        setInputValue('');
        setError(null);
        setDeleting(false);
        onClose();
      } else {
        toast.error(response.message || 'Erreur lors de la suppression');
        setDeleting(false);
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalConfirmDeleteStructure] erreur suppression', err);
      toast.error('Erreur lors de la suppression de la structure');
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Match exact case-sensitive
  const canConfirm =
    !!snapshot && inputValue === snapshot.nom_structure && !deleting && !loadingData;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] pour passer au-dessus de ModalDetailStructure (z-50)
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-red-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — rouge agressif */}
          <div className="flex items-center justify-between p-4 border-b border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Suppression définitive
              </h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={deleting}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5 overflow-y-auto max-h-[70vh]">
            {/* Garde-fou structure système */}
            {isSystemStructure ? (
              <div className="flex flex-col items-center justify-center py-8">
                <ShieldAlert className="w-14 h-14 text-orange-400 mb-3" />
                <p className="text-orange-300 text-center font-medium mb-1">
                  Suppression interdite
                </p>
                <p className="text-gray-400 text-sm text-center">
                  La structure système (id=0) ne peut pas être supprimée.
                </p>
              </div>
            ) : loadingData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-red-400 animate-spin mb-3" />
                <p className="text-gray-400">Chargement des informations...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSnapshot();
                  }}
                  className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : snapshot ? (
              <div className="space-y-4">
                {/* Avertissement principal */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-200 leading-relaxed">
                    <span className="font-bold">Cette action est IRRÉVERSIBLE.</span>{' '}
                    Toutes les données associées (factures, clients, produits,
                    abonnements, wallet) seront supprimées définitivement.
                  </p>
                </div>

                {/* Snapshot des données */}
                <div className="bg-gray-700/30 rounded-lg p-4 space-y-3 border border-gray-700/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Structure à supprimer
                  </h3>

                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Nom</p>
                      <p className="text-white font-semibold break-words">
                        {snapshot.nom_structure}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400 text-center text-xs">
                      #
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="text-white text-sm">{snapshot.type_structure}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Utilisateurs</p>
                      <p className="text-white text-sm">
                        {snapshot.nb_utilisateurs}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Receipt className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Factures</p>
                      <p className="text-white text-sm">
                        {snapshot.nb_factures !== null
                          ? snapshot.nb_factures
                          : <span className="text-gray-500 italic">Non chargé</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Champ de confirmation */}
                <div>
                  <label
                    htmlFor="confirm-delete-input"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Pour confirmer, tapez le nom exact :{' '}
                    <span className="font-mono text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">
                      {snapshot.nom_structure}
                    </span>
                  </label>
                  <input
                    id="confirm-delete-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={deleting}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50 font-mono"
                    placeholder="Saisir le nom exact..."
                  />
                  {inputValue.length > 0 && inputValue !== snapshot.nom_structure && (
                    <p className="text-xs text-orange-400 mt-1">
                      Le nom ne correspond pas (sensible à la casse)
                    </p>
                  )}
                  {inputValue === snapshot.nom_structure && (
                    <p className="text-xs text-red-400 mt-1 font-medium">
                      ⚠️ Confirmation valide — vous pouvez supprimer
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={deleting}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            {!isSystemStructure && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={!canConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalConfirmDeleteStructure;
