/**
 * Modal d'ajustement de la mensualité d'une structure (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § 3.5 (US-5)
 *
 * Pré-condition : structure cible avec `compte_prive=true`. Sinon afficher
 * un message d'avertissement (la mensualité n'a de sens que pour les
 * comptes privés à tarif fixe).
 *
 * Backend : `adminService.ajusterMensualite()` qui appelle :
 *  1. `edit_param_structure()` avec p_mensualite=nouvelle_mensualite
 *  2. `log_admin_action(action='AJUSTER_MENSUALITE')` (séparé, non bloquant)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  Info,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';
import { StructureDetailData } from '@/types/admin.types';

// Type étendu pour récupérer les champs param_structure plats à la racine
type StructureWithParams = StructureDetailData & {
  compte_prive?: boolean;
  mensualite?: number;
};

interface ModalAjusterMensualiteProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
  /** Callback exécuté après ajustement réussi — typiquement recharge le détail */
  onSaved?: () => void;
}

const MIN_MOTIF = 10;
const MAX_MOTIF = 500;
const MIN_MENSUALITE = 0;
const MAX_MENSUALITE = 999999;

export function ModalAjusterMensualite({
  isOpen,
  onClose,
  idStructure,
  onSaved
}: ModalAjusterMensualiteProps) {
  const { user, structure, refreshAuth } = useAuth();

  // États
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comptePrive, setComptePrive] = useState<boolean | null>(null);
  const [ancienneMensualite, setAncienneMensualite] = useState<number>(0);
  const [nouvelleMensualite, setNouvelleMensualite] = useState<number>(0);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    if (isOpen && idStructure) {
      loadStructure();
    }
  }, [isOpen, idStructure]);

  const handleClose = () => {
    if (saving) return;
    setComptePrive(null);
    setAncienneMensualite(0);
    setNouvelleMensualite(0);
    setMotif('');
    setError(null);
    setSaving(false);
    onClose();
  };

  const loadStructure = async () => {
    if (!idStructure) return;
    setLoadingData(true);
    setError(null);
    try {
      const response = await adminService.getUneStructure(idStructure);
      if (response.success && response.data) {
        const data = response.data as StructureWithParams;
        const isComptePrive = data.compte_prive === true;
        const mensualiteActuelle =
          typeof data.mensualite === 'number' ? data.mensualite : 0;
        setComptePrive(isComptePrive);
        setAncienneMensualite(mensualiteActuelle);
        setNouvelleMensualite(mensualiteActuelle);
      } else {
        setError('Impossible de charger les paramètres de la structure');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalAjusterMensualite] erreur chargement', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!idStructure || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }
    if (comptePrive !== true) {
      toast.error('La mensualité ne peut être ajustée que pour les comptes privés');
      return;
    }
    if (
      !Number.isFinite(nouvelleMensualite) ||
      nouvelleMensualite < MIN_MENSUALITE ||
      nouvelleMensualite > MAX_MENSUALITE
    ) {
      toast.error(`La mensualité doit être entre ${MIN_MENSUALITE} et ${MAX_MENSUALITE} FCFA`);
      return;
    }
    const motifTrim = motif.trim();
    if (motifTrim.length < MIN_MOTIF) {
      toast.error(`Le motif doit contenir au moins ${MIN_MOTIF} caractères`);
      return;
    }
    if (motifTrim.length > MAX_MOTIF) {
      toast.error(`Le motif ne peut pas dépasser ${MAX_MOTIF} caractères`);
      return;
    }
    if (nouvelleMensualite === ancienneMensualite) {
      toast.error('La nouvelle mensualité est identique à l\'ancienne');
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.ajusterMensualite({
        id_structure: idStructure,
        nouvelle_mensualite: nouvelleMensualite,
        motif: motifTrim,
        id_admin: user.id
      });

      if (response.success) {
        toast.success(response.message || 'Mensualité ajustée avec succès');

        // Si la structure modifiée === structure courante de l'admin, refresh auth
        // (cas exotique : admin connecté qui modifie sa propre structure)
        if (structure?.id_structure === idStructure) {
          try {
            await refreshAuth();
          } catch (errRefresh) {
            SecurityService.secureLog(
              'warn',
              '[ModalAjusterMensualite] refreshAuth a échoué (non bloquant)',
              errRefresh
            );
          }
        }

        if (onSaved) onSaved();
        handleClose();
      } else {
        toast.error(response.message || "Erreur lors de l'ajustement");
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalAjusterMensualite] erreur sauvegarde', err);
      toast.error("Erreur lors de l'ajustement de la mensualité");
    } finally {
      setSaving(false);
    }
  };

  const formatFCFA = (n: number) =>
    n.toLocaleString('fr-FR') + ' FCFA';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Ajuster la mensualité
              </h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={saving}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5 overflow-y-auto max-h-[70vh]">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mb-3" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadStructure();
                  }}
                  className="mt-4 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : comptePrive === false ? (
              // Cas : compte_prive = false → message d'avertissement
              <div className="flex flex-col items-center justify-center py-8">
                <Lock className="w-14 h-14 text-orange-400 mb-3" />
                <p className="text-orange-300 text-center font-medium mb-2">
                  Mensualité indisponible
                </p>
                <p className="text-gray-400 text-sm text-center max-w-md">
                  L&apos;ajustement de la mensualité n&apos;est disponible que pour les{' '}
                  <span className="font-semibold text-white">comptes privés</span>.
                </p>
                <p className="text-gray-500 text-xs text-center mt-3 max-w-md">
                  Activez d&apos;abord &laquo; Compte privé &raquo; via &laquo; Modifier
                  paramètres &raquo; pour cette structure.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Note explicative */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-200/90">
                    La mensualité est utilisée pour les comptes privés à tarif fixe.
                    Toute modification est tracée dans le journal d&apos;audit.
                  </p>
                </div>

                {/* Ancienne mensualité (lecture seule) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Ancienne mensualité
                  </label>
                  <div className="px-3 py-2.5 bg-gray-800/60 border border-gray-700 rounded-lg text-gray-400 font-mono">
                    {formatFCFA(ancienneMensualite)}
                  </div>
                </div>

                {/* Nouvelle mensualité */}
                <div>
                  <label
                    htmlFor="nouvelle-mensualite"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Nouvelle mensualité (FCFA){' '}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="nouvelle-mensualite"
                    type="number"
                    min={MIN_MENSUALITE}
                    max={MAX_MENSUALITE}
                    step={100}
                    value={nouvelleMensualite}
                    onChange={(e) => setNouvelleMensualite(Number(e.target.value))}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    placeholder="Ex: 5000"
                  />
                  {nouvelleMensualite > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Soit {formatFCFA(nouvelleMensualite)}
                    </p>
                  )}
                </div>

                {/* Motif */}
                <div>
                  <label
                    htmlFor="motif-mensualite"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Motif <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="motif-mensualite"
                    rows={3}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    maxLength={MAX_MOTIF}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 resize-none"
                    placeholder="Ex: Adaptation tarifaire suite négociation client"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Minimum {MIN_MOTIF} caractères, requis pour le journal
                      d&apos;audit
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        motif.length < MIN_MOTIF
                          ? 'text-orange-400'
                          : motif.length > MAX_MOTIF
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {motif.length}/{MAX_MOTIF}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={saving}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {comptePrive === false ? 'Fermer' : 'Annuler'}
            </button>
            {comptePrive === true && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                disabled={
                  saving ||
                  loadingData ||
                  !!error ||
                  motif.trim().length < MIN_MOTIF ||
                  nouvelleMensualite === ancienneMensualite
                }
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Ajuster</span>
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

export default ModalAjusterMensualite;
