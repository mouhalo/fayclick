/**
 * Modal de résultat post-modification d'une vente (PRD §7.3 step 5).
 *
 * - COMPLEMENT  → « Complément à encaisser : X FCFA » (CASH)
 * - REMBOURSEMENT → « Monnaie à rendre : X FCFA »
 * - AUCUN → ce modal n'est PAS affiché (le parent affiche un simple toast).
 *
 * Bouton « Réimprimer le reçu » : régénère le ticket 80mm (même num_facture,
 * badge PAYE) via generate-ticket-html.ts.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ArrowDownCircle, ArrowUpCircle, Printer } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { ModifierFactureResponse } from '@/types/facture';
import { formatAmount } from '@/lib/utils';

interface ModalResultatModificationProps {
  isOpen: boolean;
  onClose: () => void;
  resultat: ModifierFactureResponse | null;
  /** Réimpression du reçu mis à jour (même num_facture, badge PAYE) */
  onReprint: () => void;
}

export function ModalResultatModification({
  isOpen,
  onClose,
  resultat,
  onReprint,
}: ModalResultatModificationProps) {
  const t = useTranslations('invoices');

  if (!isOpen || !resultat) return null;

  const isComplement = resultat.type_ajustement === 'COMPLEMENT';
  const montant = isComplement
    ? resultat.complement_a_encaisser ?? 0
    : resultat.monnaie_a_rendre ?? 0;
  const numFacture = resultat.num_facture ?? '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[125] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 30 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Header coloré selon le type */}
          <div
            className={`p-5 text-white text-center relative ${
              isComplement
                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                : 'bg-gradient-to-r from-blue-500 to-sky-500'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-3 right-3 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              {isComplement ? (
                <ArrowUpCircle className="w-8 h-8" />
              ) : (
                <ArrowDownCircle className="w-8 h-8" />
              )}
            </div>
            <h2 className="font-bold text-lg">
              {isComplement
                ? t('edition.result.complementTitle')
                : t('edition.result.refundTitle')}
            </h2>
          </div>

          {/* Montant */}
          <div className="p-5 text-center">
            <p className="text-sm text-gray-500 mb-1">
              {isComplement
                ? t('edition.result.complementLabel')
                : t('edition.result.refundLabel')}
            </p>
            <p
              className={`text-3xl font-extrabold ${
                isComplement ? 'text-orange-600' : 'text-blue-600'
              }`}
            >
              {formatAmount(montant)}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{t('edition.result.stillPaid', { num: numFacture })}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 flex gap-2">
            <button
              onClick={onReprint}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {t('edition.result.reprint')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg transition-all"
            >
              {t('edition.result.close')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalResultatModification;
