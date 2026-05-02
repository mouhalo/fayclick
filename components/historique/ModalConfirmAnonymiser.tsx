/**
 * Modal de confirmation d'anonymisation d'un achat client.
 *
 * Spécificité par rapport à `ModalConfirmDeleteStructure` (admin) :
 *   - Pas de saisie texte de confirmation (action moins critique côté client final).
 *   - Snapshot léger (boutique, n° reçu, montant) directement issu de la prop `achat`.
 *   - Rappel explicite que le commerçant garde la trace comptable — seul le lien
 *     téléphone/nom du client est cassé.
 *
 * Backend :
 *   `anonymiser_achat_client(p_id_facture, p_telephone)` vérifie en BD que le
 *   téléphone correspond bien à la facture (anti-énumération).
 *
 * Contexte : Sprint 3 UI "Historique Client Public" (US-6 du PRD).
 *
 * @module components/historique/ModalConfirmAnonymiser
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  Receipt,
  CircleDollarSign,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import historiqueClientService, {
  HistoriqueClientException,
} from '@/services/historique-client.service';
import type { AchatClient } from '@/types/historique';

interface ModalConfirmAnonymiserProps {
  /** Visibilité du modal. */
  isOpen: boolean;
  /** Achat ciblé. `null` = modal en cours de fermeture/inactif. */
  achat: AchatClient | null;
  /** Téléphone du client (format BD canonique, déjà validé en amont). */
  telephone: string;
  /** Callback de fermeture (clic backdrop, X, Annuler ou succès). */
  onClose: () => void;
  /** Callback exécuté APRÈS anonymisation réussie — typiquement retire la carte. */
  onConfirmed: (idFacture: number) => void;
}

/** Formate un montant FCFA en français : 12500 -> "12 500 FCFA" */
function formatMontant(montant: number): string {
  if (typeof montant !== 'number' || Number.isNaN(montant)) return '—';
  return `${montant.toLocaleString('fr-FR')} FCFA`;
}

export default function ModalConfirmAnonymiser({
  isOpen,
  achat,
  telephone,
  onClose,
  onConfirmed,
}: ModalConfirmAnonymiserProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return; // Bloque la fermeture pendant l'appel
    onClose();
  };

  const handleConfirm = async () => {
    if (!achat || submitting) return;

    setSubmitting(true);
    try {
      const response = await historiqueClientService.anonymiserAchat(
        achat.id_facture,
        telephone
      );

      if (response.success) {
        toast.success(response.message || 'Achat anonymisé avec succès');
        onConfirmed(achat.id_facture);
        // Le parent fermera le modal via onConfirmed -> setSelectedAchat(null) + onClose
        setSubmitting(false);
        onClose();
      } else {
        toast.error(response.message || 'Anonymisation impossible');
        setSubmitting(false);
      }
    } catch (err) {
      const message =
        err instanceof HistoriqueClientException
          ? err.message
          : "Erreur lors de l'anonymisation";
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Snapshot pour affichage (peut être null si le modal vient d'être fermé)
  const numRecu = achat?.recu_numero || achat?.numrecu || '—';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] pour passer au-dessus de la liste (bg page = z-10)
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-red-500/30"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="anonymiser-title"
        >
          {/* Header rouge */}
          <div className="flex items-center justify-between p-4 border-b border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle
                  className="w-5 h-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <h2
                id="anonymiser-title"
                className="text-base sm:text-lg font-semibold text-white"
              >
                Supprimer cet achat de mon historique ?
              </h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={submitting}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5 space-y-4">
            {/* Snapshot achat */}
            {achat && (
              <div className="bg-gray-700/40 border border-gray-700/60 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Store
                    className="w-4 h-4 text-red-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    Boutique
                  </span>
                  <span className="text-white font-medium truncate">
                    {achat.nom_structure}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt
                    className="w-4 h-4 text-red-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    N° reçu
                  </span>
                  <span className="text-white font-mono text-xs truncate">
                    {numRecu}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    className="w-4 h-4 text-red-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    Montant
                  </span>
                  <span className="text-white font-semibold">
                    {formatMontant(achat.montant)}
                  </span>
                </div>
              </div>
            )}

            {/* Avertissement */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-200 leading-relaxed">
                <span className="font-bold">Cette action est irréversible.</span>{' '}
                L&apos;achat sera anonymisé et vous ne pourrez plus le retrouver
                dans votre historique.
              </p>
              <p className="text-xs text-red-300/80 mt-2 leading-relaxed">
                Le commerçant conserve la trace comptable de la transaction
                (montant, articles) — seul votre lien personnel (téléphone, nom)
                est masqué.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={submitting}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm();
              }}
              disabled={submitting || !achat}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Supprimer définitivement</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
