/**
 * Modal de réinitialisation du mot de passe utilisateur (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § US-7 + § 5.2
 *
 * Workflow en 2 étapes :
 *  1. Confirmation : affichage des infos utilisateur + bouton "Réinitialiser"
 *  2. Succès : affichage du nouveau MDP en clair (1 seule fois) + bouton "Copier"
 *
 * Sécurité :
 *  - MDP n'est JAMAIS persisté (localStorage / sessionStorage)
 *  - MDP n'est JAMAIS loggé (même via SecureService)
 *  - MDP est cleared du state à la fermeture du modal
 *  - À l'étape 2, fermeture UNIQUEMENT via bouton "Fermer" (pas de clic
 *    extérieur, pas de Esc, pas de X dans le header)
 *
 * Backend : `reset_user_password(pid_utilisateur)` retourne le nouveau MDP
 * en clair (8 chars alphanumériques) et force `pwd_changed=false`.
 *
 * Étape 2 : envoi WhatsApp optionnel via template `fayclick_admin_message`
 * (générique sujet + corps). Le bouton est désactivé si aucun téléphone
 * n'est fourni. L'admin garde la possibilité de copier le MDP en parallèle.
 * Voir docs/memo_whatsapp_new_endpoints.md § 4.2 A.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  CheckCircle,
  Copy,
  AlertTriangle,
  Loader2,
  User,
  Building2,
  Phone,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import whatsAppMessageService from '@/services/whatsapp-message.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';

interface ModalConfirmResetPasswordProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID de l'utilisateur dont le MDP sera reset */
  idUtilisateur: number | null;
  /** Nom complet utilisateur (affichage) */
  username: string;
  /** Login utilisateur (affichage) */
  login: string;
  /** Nom de la structure (affichage) */
  nomStructure: string;
  /** Téléphone utilisateur (affichage) */
  telephone: string;
}

type Step = 'confirm' | 'success';

export function ModalConfirmResetPassword({
  isOpen,
  onClose,
  idUtilisateur,
  username,
  login,
  nomStructure,
  telephone
}: ModalConfirmResetPasswordProps) {
  const { user } = useAuth();

  // États
  const [step, setStep] = useState<Step>('confirm');
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  /**
   * Fermeture sécurisée :
   * - Bloque pendant l'appel API
   * - Reset complet du state (notamment le MDP) avant de notifier le parent
   */
  const handleClose = () => {
    if (resetting || sendingWhatsApp) return;
    setNewPassword(''); // ⚠️ Critique : MDP retiré du state immédiatement
    setStep('confirm');
    setResetting(false);
    setSendingWhatsApp(false);
    setWhatsAppSent(false);
    onClose();
  };

  /**
   * Backdrop click handler :
   * - Étape 1 (confirm) : ferme le modal
   * - Étape 2 (success) : aucune action (l'admin doit cliquer "Fermer")
   */
  const handleBackdropClick = () => {
    if (step === 'confirm') {
      handleClose();
    }
  };

  const handleConfirmReset = async () => {
    if (!idUtilisateur || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }

    setResetting(true);
    try {
      const response = await adminService.resetUserPassword({
        id_utilisateur: idUtilisateur,
        id_admin: user.id
      });

      if (response.success && response.new_password) {
        // ⚠️ Stockage en mémoire uniquement, NEVER persist
        setNewPassword(response.new_password);
        setStep('success');
        toast.success('Mot de passe réinitialisé');
      } else {
        // Reste à l'étape 1 pour permettre la réessai
        toast.error(response.message || 'Impossible de réinitialiser le mot de passe');
        setResetting(false);
      }
    } catch (err) {
      // ⚠️ Ne jamais logger l'objet réponse complet (peut contenir new_password)
      SecurityService.secureLog(
        'error',
        '[ModalConfirmResetPassword] erreur reset password'
      );
      toast.error('Erreur lors de la réinitialisation du mot de passe');
      setResetting(false);
    }
  };

  /**
   * Copie le MDP dans le clipboard.
   * Toast informatif. Pas de log du MDP.
   */
  const handleCopyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.info('Mot de passe copié dans le presse-papiers');
    } catch {
      toast.error('Impossible de copier — copiez-le manuellement');
    }
  };

  /**
   * Envoie le nouveau MDP par WhatsApp via le template fayclick_admin_message.
   *
   * ⚠️ Ne PAS fermer le modal après envoi : l'admin peut copier ET envoyer,
   * et peut renvoyer en cas d'échec ou de doute.
   *
   * Sécurité :
   *  - Aucun log du nouveau MDP ni du corps du message
   *  - Le numéro est masqué dans les toasts
   */
  const handleSendWhatsApp = async () => {
    if (!newPassword || !login || !telephone) return;

    setSendingWhatsApp(true);
    try {
      const response = await whatsAppMessageService.sendNewPasswordNotification(
        telephone,
        login,
        newPassword,
        'fr'
      );

      if (response.success) {
        setWhatsAppSent(true);
        const masked = response.recipient || maskPhoneForToast(telephone);
        toast.success(`WhatsApp envoyé à ${masked}`);
      } else {
        // ⚠️ Ne pas logger l'objet response (peut contenir corps avec MDP)
        SecurityService.secureLog(
          'warn',
          `[ModalConfirmResetPassword] WhatsApp KO code=${response.error_code ?? 'unknown'}`
        );
        toast.error(
          response.error_code === 'META_INVALID_NUMBER'
            ? 'Numéro non enregistré sur WhatsApp — transmettre manuellement'
            : 'Échec envoi WhatsApp — transmettre manuellement'
        );
      }
    } catch (err) {
      SecurityService.secureLog(
        'error',
        `[ModalConfirmResetPassword] Exception WhatsApp: ${err instanceof Error ? err.message : 'unknown'}`
      );
      toast.error('Erreur réseau WhatsApp — transmettre manuellement');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  /**
   * Masque un numéro local SN pour affichage dans les toasts.
   * Ex: "777301221" → "+2217*****221"
   */
  const maskPhoneForToast = (phone: string): string => {
    if (!phone) return '***';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+221${digits.substring(0, 1)}*****${digits.substring(digits.length - 3)}`;
    }
    if (phone.startsWith('+') && phone.length >= 8) {
      return `${phone.substring(0, 5)}*****${phone.substring(phone.length - 3)}`;
    }
    return '***';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] pour passer au-dessus de ModalDetailStructure (z-50)
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border ${
            step === 'success' ? 'border-emerald-500/40' : 'border-orange-500/30'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===================== ÉTAPE 1 : CONFIRMATION ===================== */}
          {step === 'confirm' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-orange-500/30 bg-orange-500/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Key className="w-5 h-5 text-orange-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    Réinitialiser le mot de passe
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={resetting}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Contenu */}
              <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
                {/* Avertissement explicatif */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-sm text-orange-100 leading-relaxed">
                    Le mot de passe de cet utilisateur sera réinitialisé à une
                    nouvelle valeur aléatoire. L&apos;utilisateur sera obligé de
                    le changer à sa prochaine connexion.
                  </p>
                </div>

                {/* Snapshot des données utilisateur */}
                <div className="bg-gray-700/30 rounded-lg p-4 space-y-3 border border-gray-700/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Utilisateur concerné
                  </h3>

                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Utilisateur</p>
                      <p className="text-white font-semibold break-words">
                        {username || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Key className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Login</p>
                      <p className="text-white text-sm font-mono break-words">
                        {login || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Structure</p>
                      <p className="text-white text-sm break-words">
                        {nomStructure || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Téléphone</p>
                      <p className="text-white text-sm">{telephone || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700/50 flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmReset();
                  }}
                  disabled={resetting || !idUtilisateur}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Réinitialisation...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Réinitialiser le mot de passe</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ===================== ÉTAPE 2 : SUCCÈS — MDP AFFICHÉ ===================== */}
          {step === 'success' && (
            <>
              {/* Header vert — PAS de bouton X (fermeture forcée via "Fermer") */}
              <div className="flex items-center gap-2 p-4 border-b border-emerald-500/30 bg-emerald-500/10">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Mot de passe réinitialisé
                </h2>
              </div>

              {/* Contenu */}
              <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
                {/* Identifiants pour rappel */}
                <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Login utilisateur</p>
                  <p className="text-white font-mono text-sm break-words">
                    {login || '-'}
                  </p>
                </div>

                {/* Encadré MDP */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Nouveau mot de passe
                  </p>
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 bg-gray-100 border-2 border-emerald-500/50 rounded-lg px-4 py-3 flex items-center">
                      <span className="font-mono text-xl text-gray-900 font-bold tracking-wider break-all select-all">
                        {newPassword}
                      </span>
                    </div>
                    <button
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

                {/* Avertissement rouge — affichage unique */}
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 leading-relaxed">
                    <span className="font-bold">
                      Ce mot de passe ne sera plus jamais affiché.
                    </span>{' '}
                    Transmettez-le immédiatement à l&apos;utilisateur (par
                    téléphone, en personne, ou via WhatsApp).
                  </p>
                </div>

                {/* Bouton WhatsApp */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Transmission par WhatsApp
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendWhatsApp();
                    }}
                    disabled={sendingWhatsApp || !telephone || !newPassword}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    title={
                      !telephone
                        ? 'Aucun numéro disponible pour cet utilisateur'
                        : whatsAppSent
                          ? 'Renvoyer par WhatsApp'
                          : 'Envoyer le nouveau mot de passe par WhatsApp'
                    }
                  >
                    {sendingWhatsApp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Envoi WhatsApp...</span>
                      </>
                    ) : whatsAppSent ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Renvoyer par WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Envoyer par WhatsApp</span>
                      </>
                    )}
                  </button>
                  {!telephone && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">
                      Aucun numéro de téléphone enregistré pour cet utilisateur
                    </p>
                  )}
                </div>

                {/* Info pwd_changed */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-200 leading-relaxed">
                    L&apos;utilisateur sera invité à choisir un nouveau mot de
                    passe lors de sa prochaine connexion.
                  </p>
                </div>
              </div>

              {/* Footer — UNIQUEMENT le bouton Fermer */}
              <div className="p-4 border-t border-gray-700/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={sendingWhatsApp}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ModalConfirmResetPassword;
