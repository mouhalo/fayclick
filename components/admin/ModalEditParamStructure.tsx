/**
 * Modal de modification des paramètres `param_structure` (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § 3.2 (US-2) et § 4.6
 * Champs admin réservés (6) :
 *   - nombre_produit_max  (0 → 99999)
 *   - nombre_caisse_max   (1 → 99)
 *   - compte_prive        (toggle)
 *   - mensualite          (FCFA, visible uniquement si compte_prive=true)
 *   - taux_wallet         (% — 0 → 100, step 0.1)
 *   - live_autorise       (toggle)
 *
 * ⚠️ Si la structure modifiée correspond à la structure courante
 * de l'utilisateur connecté, on appelle `refreshAuth()` pour
 * synchroniser le contexte d'auth (cas exotique mais propre).
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  Box,
  Wallet,
  Video,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';
import { StructureDetailData, EditParamStructureAdminParams } from '@/types/admin.types';

// Type étendu pour accéder aux champs param_structure (plats à la racine)
type StructureWithParams = StructureDetailData & {
  nombre_produit_max?: number;
  nombre_caisse_max?: number;
  compte_prive?: boolean;
  mensualite?: number;
  taux_wallet?: number;
  live_autorise?: boolean;
};

interface ModalEditParamStructureProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
  onSaved?: () => void;
}

interface FormState {
  nombre_produit_max: number;
  nombre_caisse_max: number;
  compte_prive: boolean;
  mensualite: number;
  taux_wallet: number;
  live_autorise: boolean;
}

const DEFAULT_STATE: FormState = {
  nombre_produit_max: 600,
  nombre_caisse_max: 2,
  compte_prive: false,
  mensualite: 0,
  taux_wallet: 0.04,
  live_autorise: false
};

/**
 * Petit composant Toggle réutilisable (style switch)
 */
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-purple-500' : 'bg-gray-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function ModalEditParamStructure({
  isOpen,
  onClose,
  idStructure,
  onSaved
}: ModalEditParamStructureProps) {
  const { user, structure, refreshAuth } = useAuth();

  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [motif, setMotif] = useState('');

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && idStructure) {
      loadStructure();
    }
  }, [isOpen, idStructure]);

  const handleClose = () => {
    setForm(DEFAULT_STATE);
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
        // ⚠️ param_structure est PLAT à la racine (cf. auth.service.ts:75-97)
        const data = response.data as StructureWithParams;
        setForm({
          nombre_produit_max:
            typeof data.nombre_produit_max === 'number'
              ? data.nombre_produit_max
              : DEFAULT_STATE.nombre_produit_max,
          nombre_caisse_max:
            typeof data.nombre_caisse_max === 'number'
              ? data.nombre_caisse_max
              : DEFAULT_STATE.nombre_caisse_max,
          compte_prive: data.compte_prive === true,
          mensualite:
            typeof data.mensualite === 'number'
              ? data.mensualite
              : DEFAULT_STATE.mensualite,
          taux_wallet:
            typeof data.taux_wallet === 'number'
              ? data.taux_wallet
              : DEFAULT_STATE.taux_wallet,
          live_autorise: data.live_autorise === true
        });
      } else {
        setError('Impossible de charger les paramètres');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalEditParamStructure] erreur chargement', err);
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

    // Validation client
    if (form.nombre_produit_max < 0 || form.nombre_produit_max > 99999) {
      toast.error('Le nombre maximum de produits doit être entre 0 et 99999');
      return;
    }
    if (form.nombre_caisse_max < 1 || form.nombre_caisse_max > 99) {
      toast.error('Le nombre maximum de caisses doit être entre 1 et 99');
      return;
    }
    if (form.taux_wallet < 0 || form.taux_wallet > 100) {
      toast.error('Le taux wallet doit être entre 0 et 100 %');
      return;
    }
    if (form.compte_prive && form.mensualite < 0) {
      toast.error('La mensualité ne peut pas être négative');
      return;
    }

    // Construire le payload — n'envoyer que les champs admin
    const payload: EditParamStructureAdminParams = {
      nombre_produit_max: form.nombre_produit_max,
      nombre_caisse_max: form.nombre_caisse_max,
      compte_prive: form.compte_prive,
      // Si compte_prive=false, on remet la mensualité à 0 pour cohérence
      mensualite: form.compte_prive ? form.mensualite : 0,
      taux_wallet: form.taux_wallet,
      live_autorise: form.live_autorise
    };

    setSaving(true);
    try {
      const response = await adminService.editParamStructureAdmin(
        idStructure,
        payload,
        user.id
      );

      if (response.success) {
        toast.success(response.message || 'Paramètres modifiés avec succès');

        // Si la structure modifiée === structure courante, refreshAuth pour
        // synchroniser le contexte (cas exotique : admin connecté qui modifie
        // sa propre structure)
        if (structure?.id_structure === idStructure) {
          try {
            await refreshAuth();
          } catch (errRefresh) {
            SecurityService.secureLog(
              'warn',
              '[ModalEditParamStructure] refreshAuth a échoué (non bloquant)',
              errRefresh
            );
          }
        }

        if (onSaved) onSaved();
        handleClose();
      } else {
        toast.error(response.message || 'Erreur lors de la modification');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalEditParamStructure] erreur sauvegarde', err);
      toast.error('Erreur lors de la modification des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] — au-dessus de ModalDetailStructure (z-50)
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
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Paramètres administrateur
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
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadStructure}
                  className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Note explicative */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-200/90">
                    Paramètres réservés à l&apos;administrateur système. Distincts
                    des règles de vente accessibles depuis Settings côté
                    structure.
                  </p>
                </div>

                {/* Limites quotas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="param-nombre-produit-max"
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5"
                    >
                      <Box className="w-4 h-4 text-blue-400" />
                      Produits max
                    </label>
                    <input
                      id="param-nombre-produit-max"
                      type="number"
                      min={0}
                      max={99999}
                      value={form.nombre_produit_max}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nombre_produit_max: Number(e.target.value)
                        })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="param-nombre-caisse-max"
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5"
                    >
                      <Users className="w-4 h-4 text-green-400" />
                      Caisses max
                    </label>
                    <input
                      id="param-nombre-caisse-max"
                      type="number"
                      min={1}
                      max={99}
                      value={form.nombre_caisse_max}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nombre_caisse_max: Number(e.target.value)
                        })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Toggle Compte privé */}
                <div className="flex items-start justify-between gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700">
                  <div className="flex-1">
                    <label
                      htmlFor="param-compte-prive"
                      className="block text-sm font-medium text-white"
                    >
                      Compte privé
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Active le tarif fixe (mensualité) et le configurateur de
                      modèle de facture personnalisé.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={form.compte_prive}
                    onChange={(v) => setForm({ ...form, compte_prive: v })}
                    disabled={saving}
                    label="Compte privé"
                  />
                </div>

                {/* Mensualité — animation expand/collapse */}
                <AnimatePresence initial={false}>
                  {form.compte_prive && (
                    <motion.div
                      key="mensualite-block"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1">
                        <label
                          htmlFor="param-mensualite"
                          className="block text-sm font-medium text-gray-300 mb-1.5"
                        >
                          Mensualité (FCFA)
                        </label>
                        <input
                          id="param-mensualite"
                          type="number"
                          min={0}
                          step={100}
                          value={form.mensualite}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              mensualite: Number(e.target.value)
                            })
                          }
                          disabled={saving}
                          className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                          placeholder="Ex: 5000"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Taux wallet */}
                <div>
                  <label
                    htmlFor="param-taux-wallet"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5"
                  >
                    <Wallet className="w-4 h-4 text-orange-400" />
                    Taux wallet (%)
                  </label>
                  <input
                    id="param-taux-wallet"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.taux_wallet}
                    onChange={(e) =>
                      setForm({ ...form, taux_wallet: Number(e.target.value) })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pourcentage prélevé sur les paiements wallet (ex: 1.5 pour
                    1,5 %).
                  </p>
                </div>

                {/* Toggle Live autorisé */}
                <div className="flex items-start justify-between gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700">
                  <div className="flex-1">
                    <label
                      htmlFor="param-live-autorise"
                      className="flex items-center gap-1.5 text-sm font-medium text-white"
                    >
                      <Video className="w-4 h-4 text-cyan-400" />
                      Live shopping autorisé
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Active la fonctionnalité de vente en direct pour cette
                      structure.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={form.live_autorise}
                    onChange={(v) => setForm({ ...form, live_autorise: v })}
                    disabled={saving}
                    label="Live shopping autorisé"
                  />
                </div>

                {/* Motif (optionnel) */}
                <div>
                  <label
                    htmlFor="param-motif"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Motif{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      (optionnel — sera tracé dans le journal d&apos;audit)
                    </span>
                  </label>
                  <textarea
                    id="param-motif"
                    rows={2}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    maxLength={200}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 resize-none"
                    placeholder="Ex: Augmentation quota produits suite à demande client"
                  />
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
              Annuler
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving || loadingData || !!error}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEditParamStructure;
