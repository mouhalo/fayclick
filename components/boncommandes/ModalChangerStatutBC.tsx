/**
 * Modal Changement de Statut Bon de Commande
 *
 * FR-022 : Transitions de statut V1 selon matrice DBA :
 *   BROUILLON → CONFIRME, ANNULE
 *   CONFIRME  → LIVRE, ANNULE
 *   LIVRE     → (aucune transition)
 *   ANNULE    → (aucune transition)
 *
 * Au passage LIVRE : avertissement "Pensez à saisir l'entrée stock dans le module Inventaire."
 * + lien direct vers /dashboard/commerce/inventaire
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  AlertTriangle,
  PackageCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import bonCommandeService, {
  BonCommandeApiException,
} from '@/services/bon-commande.service';
import { BonCommande, BonCommandeStatut } from '@/types/bon-commande';
import { BonCommandeStatusBadge } from './BonCommandeStatusBadge';

interface ModalChangerStatutBCProps {
  isOpen: boolean;
  onClose: () => void;
  bonCommande: BonCommande;
  onSuccess: () => void;
}

interface TransitionOption {
  statut: BonCommandeStatut;
  label: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
}

// Transitions valides selon statut courant (matrice FR-010)
function getTransitionsAutorisees(statut: BonCommandeStatut): TransitionOption[] {
  switch (statut) {
    case 'BROUILLON':
      return [
        {
          statut: 'CONFIRME',
          label: 'Confirmer',
          description: 'Engagement formel avec le fournisseur',
          icon: <CheckCircle2 className="w-5 h-5" />,
          bgClass: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/40',
          textClass: 'text-blue-200',
        },
        {
          statut: 'ANNULE',
          label: 'Annuler',
          description: 'Annule définitivement le bon de commande',
          icon: <XCircle className="w-5 h-5" />,
          bgClass: 'bg-red-500/20 hover:bg-red-500/30 border-red-400/40',
          textClass: 'text-red-200',
        },
      ];
    case 'CONFIRME':
      return [
        {
          statut: 'LIVRE',
          label: 'Marquer comme livré',
          description: 'La marchandise a été réceptionnée',
          icon: <PackageCheck className="w-5 h-5" />,
          bgClass: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40',
          textClass: 'text-emerald-200',
        },
        {
          statut: 'ANNULE',
          label: 'Annuler',
          description: 'Annule le bon de commande',
          icon: <XCircle className="w-5 h-5" />,
          bgClass: 'bg-red-500/20 hover:bg-red-500/30 border-red-400/40',
          textClass: 'text-red-200',
        },
      ];
    default:
      return [];
  }
}

export const ModalChangerStatutBC = ({
  isOpen,
  onClose,
  bonCommande,
  onSuccess,
}: ModalChangerStatutBCProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statutChoisi, setStatutChoisi] = useState<BonCommandeStatut | null>(null);

  const transitions = useMemo(
    () => getTransitionsAutorisees(bonCommande.libelle_etat),
    [bonCommande.libelle_etat]
  );

  const handleApply = async (statut: BonCommandeStatut) => {
    setIsLoading(true);
    setStatutChoisi(statut);
    try {
      const result = await bonCommandeService.updateStatut(
        bonCommande.id_bon_commande,
        statut
      );
      if (result.success) {
        toast.success(result.message || `Statut mis à jour : ${statut}`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Erreur changement statut');
      }
    } catch (error) {
      const msg =
        error instanceof BonCommandeApiException
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Impossible de changer le statut';
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setStatutChoisi(null);
    }
  };

  if (!isOpen) return null;

  // États terminaux : aucune transition disponible
  if (transitions.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <BonCommandeStatusBadge statut={bonCommande.libelle_etat} size="md" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Statut terminal</h3>
              <p className="text-sm text-gray-600 mb-5">
                Ce bon de commande est dans un état terminal ({bonCommande.libelle_etat}) et ne
                peut plus changer de statut.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-b from-sky-900 to-sky-950 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sky-700/50">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Changer le statut</h2>
              <p className="text-xs text-white/70 truncate">{bonCommande.num_bc}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Statut courant */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span className="text-xs text-white/60">Statut actuel :</span>
            <BonCommandeStatusBadge statut={bonCommande.libelle_etat} size="sm" />
          </div>

          {/* Options de transition */}
          <div className="px-4 pb-4 space-y-2 overflow-y-auto">
            <p className="text-xs text-white/60 mb-2">Choisissez le nouveau statut :</p>
            {transitions.map((opt) => (
              <button
                key={opt.statut}
                onClick={() => handleApply(opt.statut)}
                disabled={isLoading}
                className={`w-full p-3 rounded-xl border ${opt.bgClass} transition-colors flex items-start gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`flex-shrink-0 ${opt.textClass}`}>
                  {isLoading && statutChoisi === opt.statut ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    opt.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${opt.textClass}`}>{opt.label}</p>
                  <p className="text-xs text-white/60">{opt.description}</p>
                </div>
              </button>
            ))}

            {/* Avertissement spécial passage LIVRÉ */}
            {transitions.some((t) => t.statut === 'LIVRE') && (
              <div className="mt-3 bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100 space-y-2">
                  <p>
                    En passant à <strong>LIVRÉ</strong>, pensez à saisir l&apos;entrée stock dans
                    le module Inventaire.
                  </p>
                  <a
                    href="/dashboard/commerce/inventaire"
                    className="inline-flex items-center gap-1.5 bg-amber-600 text-white px-2.5 py-1 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ouvrir Inventaire
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
