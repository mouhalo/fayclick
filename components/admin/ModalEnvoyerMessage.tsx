/**
 * Modal d'envoi de message WhatsApp à une structure (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md (US bonus)
 * Template Meta : `fayclick_admin_message`
 *  - Variables : {{1}} = sujet, {{2}} = corps
 *  - Backend ICELABSOFT : POST /whatsapp_service/api/send_message
 *
 * UX :
 *  - Affiche le destinataire (mobile_om priorité, mobile_wave fallback)
 *  - Sujet (input, max 60 chars)
 *  - Corps (textarea, max 1024 chars, compteur)
 *  - Sanitize auto des newlines côté service (Meta refuse \n dans variables)
 *  - Bloque l'envoi si aucun numéro disponible
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageCircle,
  Send,
  Loader2,
  Phone,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import whatsAppMessageService from '@/services/whatsapp-message.service';
import SecurityService from '@/services/security.service';

const MAX_SUJET = 60;
const MAX_CORPS = 1024;

interface ModalEnvoyerMessageProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nom de la structure destinataire (affichage uniquement) */
  nomStructure: string;
  /** Numéro Orange Money de la structure (priorité) */
  mobileOm?: string;
  /** Numéro Wave de la structure (fallback) */
  mobileWave?: string;
}

export function ModalEnvoyerMessage({
  isOpen,
  onClose,
  nomStructure,
  mobileOm,
  mobileWave
}: ModalEnvoyerMessageProps) {
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [sending, setSending] = useState(false);

  // Numéro destinataire effectif : OM en priorité, sinon WAVE
  const phoneToUse = (mobileOm?.trim() || mobileWave?.trim() || '').trim();
  const phoneSource = mobileOm?.trim() ? 'OM' : mobileWave?.trim() ? 'WAVE' : '';

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSujet('');
      setCorps('');
      setSending(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (sending) return;
    setSujet('');
    setCorps('');
    setSending(false);
    onClose();
  };

  const handleBackdropClick = () => {
    if (!sending) handleClose();
  };

  const handleSend = async () => {
    if (!phoneToUse) {
      toast.error('Aucun numéro WhatsApp configuré pour cette structure');
      return;
    }
    const sujetTrim = sujet.trim();
    const corpsTrim = corps.trim();
    if (!sujetTrim) {
      toast.error('Veuillez saisir un sujet');
      return;
    }
    if (!corpsTrim) {
      toast.error('Veuillez saisir un message');
      return;
    }
    if (sujetTrim.length > MAX_SUJET) {
      toast.error(`Le sujet ne peut pas dépasser ${MAX_SUJET} caractères`);
      return;
    }
    if (corpsTrim.length > MAX_CORPS) {
      toast.error(`Le message ne peut pas dépasser ${MAX_CORPS} caractères`);
      return;
    }

    setSending(true);
    try {
      const response = await whatsAppMessageService.sendAdminMessage(
        phoneToUse,
        sujetTrim,
        corpsTrim,
        'fr'
      );

      if (response.success) {
        const masked = response.recipient || '***';
        toast.success(`Message WhatsApp envoyé à ${masked}`);
        handleClose();
      } else {
        SecurityService.secureLog(
          'warn',
          `[ModalEnvoyerMessage] WhatsApp KO code=${response.error_code ?? 'unknown'}`
        );
        if (response.error_code === 'META_INVALID_NUMBER') {
          toast.error("Numéro non enregistré sur WhatsApp");
        } else if (response.error_code === 'META_RATE_LIMIT' || response.error_code === 'DAILY_QUOTA_EXCEEDED') {
          toast.error('Quota WhatsApp atteint, réessayez plus tard');
        } else {
          toast.error(`Échec envoi : ${response.message || response.error_code || 'erreur'}`);
        }
      }
    } catch (err) {
      SecurityService.secureLog(
        'error',
        `[ModalEnvoyerMessage] Exception envoi: ${err instanceof Error ? err.message : 'unknown'}`
      );
      toast.error('Erreur réseau — réessayez');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] pour passer au-dessus du ModalDetailStructure (z-50)
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-green-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-green-500/30 bg-green-500/10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Envoyer un message WhatsApp
                </h2>
                <p className="text-xs text-gray-400 truncate max-w-[300px]">
                  À : {nomStructure}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={sending}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
            {/* Numéro destinataire */}
            {phoneToUse ? (
              <div className="bg-gray-700/30 rounded-xl p-3 flex items-center gap-3">
                <Phone className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    Destinataire ({phoneSource})
                  </p>
                  <p className="text-white font-mono">{phoneToUse}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300 font-medium">
                    Aucun numéro WhatsApp configuré
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Configurez un numéro Orange Money ou Wave dans la fiche
                    structure pour pouvoir envoyer un message.
                  </p>
                </div>
              </div>
            )}

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Sujet <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                disabled={sending || !phoneToUse}
                maxLength={MAX_SUJET}
                placeholder="Ex: Information importante FayClick"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {sujet.length} / {MAX_SUJET}
              </p>
            </div>

            {/* Corps */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={corps}
                onChange={(e) => setCorps(e.target.value)}
                disabled={sending || !phoneToUse}
                maxLength={MAX_CORPS}
                rows={6}
                placeholder="Saisissez votre message ici…"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {corps.length} / {MAX_CORPS}
              </p>
              <p className="text-xs text-gray-500 mt-1 italic">
                ℹ️ Les retours à la ligne seront convertis en espaces (limite Meta WhatsApp).
              </p>
            </div>
          </div>

          {/* Footer — boutons */}
          <div className="p-4 border-t border-gray-700/50 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={sending}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              disabled={sending || !phoneToUse || !sujet.trim() || !corps.trim()}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEnvoyerMessage;
