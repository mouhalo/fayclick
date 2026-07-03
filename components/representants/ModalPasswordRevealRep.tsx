/**
 * ModalPasswordRevealRep — Réinitialisation + révélation du mot de passe représentant
 *
 * Workflow en 2 étapes (calqué sur components/admin/ModalConfirmResetPassword.tsx) :
 *  1. Confirmation : affichage des infos du représentant + bouton "Réinitialiser"
 *  2. Succès : affichage du nouveau MDP en clair (1 seule fois) + bouton "Copier"
 *
 * Sécurité :
 *  - Le MDP n'est JAMAIS persisté (localStorage/sessionStorage)
 *  - Le MDP n'est JAMAIS loggé
 *  - Le MDP est nettoyé du state à la fermeture
 *  - À l'étape 2, fermeture UNIQUEMENT via le bouton "Fermer" (pas de clic
 *    extérieur, pas de X dans le header)
 *
 * Backend : `reinitialiser_pwd_representant_auto(id_structure, id_representant, id_admin)`
 * retourne `data.new_password` en clair.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, CheckCircle, Copy, AlertTriangle, Loader2, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import representantService from '@/services/representant.service';
import { RepresentantData } from '@/types/representant';

interface ModalPasswordRevealRepProps {
  isOpen: boolean;
  onClose: () => void;
  /** Représentant concerné par la réinitialisation */
  representant: RepresentantData | null;
  idStructure: number;
  idAdmin: number;
  /** Appelé après réinitialisation réussie (ex: rafraîchir la liste) */
  onSuccess?: () => void;
}

type Step = 'confirm' | 'success';

export function ModalPasswordRevealRep({
  isOpen,
  onClose,
  representant,
  idStructure,
  idAdmin,
  onSuccess,
}: ModalPasswordRevealRepProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');

  /**
   * Fermeture sécurisée : bloquée pendant l'appel API, nettoie le MDP du state.
   *
   * ⚠️ onSuccess (recharge la liste parent) est appelé ICI, à la fermeture, et
   * NON juste après le reset : le parent RepresentantsManagement fait un early
   * return <Spinner> pendant isLoading, ce qui démonterait ce modal et effacerait
   * l'étape « succès » + le MDP avant que l'admin ne le voie. On recharge donc
   * seulement une fois le MDP révélé puis fermé. (Même pattern que ModalCreerRepresentant.)
   */
  const handleClose = () => {
    if (resetting) return;
    const didReset = step === 'success';
    setNewPassword('');
    setStep('confirm');
    setResetting(false);
    onClose();
    if (didReset) onSuccess?.();
  };

  const handleBackdropClick = () => {
    if (step === 'confirm') handleClose();
  };

  const handleConfirmReset = async () => {
    if (!representant || !idStructure || !idAdmin) {
      toast.error('Contexte invalide, veuillez réessayer');
      return;
    }

    setResetting(true);
    try {
      const res = await representantService.resetPwd({
        id_structure: idStructure,
        id_representant: representant.id_representant,
        id_admin: idAdmin,
      });

      if (res.success && res.data?.new_password) {
        // ⚠️ Stockage en mémoire uniquement, jamais persisté ni loggé
        setNewPassword(res.data.new_password);
        setStep('success');
        setResetting(false); // ⚠️ sinon handleClose (if resetting return) bloque « Fermer »
        toast.success(res.message || 'Mot de passe réinitialisé');
        // NB : onSuccess() est déféré à handleClose (voir commentaire) — le
        // déclencher ici rechargerait la liste et démonterait ce modal (perte du MDP).
      } else {
        toast.error(res.message || 'Impossible de réinitialiser le mot de passe');
        setResetting(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
      setResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.info('Mot de passe copié dans le presse-papiers');
    } catch {
      toast.error('Impossible de copier — copiez-le manuellement');
    }
  };

  if (!isOpen || !representant) return null;

  const nomComplet =
    `${representant.prenom_rep || ''} ${representant.nom_rep || ''}`.trim() ||
    representant.username;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={`bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border ${
            step === 'success' ? 'border-emerald-300' : 'border-amber-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===================== ÉTAPE 1 : CONFIRMATION ===================== */}
          {step === 'confirm' && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Réinitialiser le mot de passe
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={resetting}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Un nouveau mot de passe sera généré aléatoirement pour ce représentant. Il
                    devra le changer à sa prochaine connexion.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Représentant</p>
                      <p className="text-gray-900 font-semibold break-words">{nomComplet}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="text-gray-900 text-sm">{representant.telephone || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmReset();
                  }}
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Réinitialisation…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Réinitialiser</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ===================== ÉTAPE 2 : SUCCÈS — MDP AFFICHÉ ===================== */}
          {step === 'success' && (
            <>
              {/* Pas de bouton X : fermeture forcée via "Fermer" */}
              <div className="flex items-center gap-2 p-4 border-b border-emerald-200 bg-emerald-50">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Mot de passe réinitialisé</h2>
              </div>

              <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Représentant</p>
                  <p className="text-gray-900 font-mono text-sm break-words">{nomComplet}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Nouveau mot de passe
                  </p>
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 bg-gray-100 border-2 border-emerald-400 rounded-lg px-4 py-3 flex items-center">
                      <span className="font-mono text-xl text-gray-900 font-bold tracking-wider break-all select-all">
                        {newPassword}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPassword();
                      }}
                      className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      aria-label="Copier le mot de passe"
                      title="Copier dans le presse-papiers"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="hidden sm:inline">Copier</span>
                    </button>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 leading-relaxed">
                    <span className="font-bold">Ce mot de passe ne sera plus jamais affiché.</span>{' '}
                    Transmettez-le immédiatement au représentant.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalPasswordRevealRep;
