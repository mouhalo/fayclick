/**
 * Modal Détails Bon de Commande (lecture seule + actions)
 *
 * FR-022 : Affichage entête + fournisseur enrichi + articles + montants.
 * Boutons d'action contextuels selon statut.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pencil,
  Printer,
  Trash2,
  Loader,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  ListChecks,
  ExternalLink,
} from 'lucide-react';
import { BonCommandeStatusBadge } from './BonCommandeStatusBadge';
import bonCommandeService from '@/services/bon-commande.service';
import { BonCommande, BonCommandeComplete } from '@/types/bon-commande';
import { formatAmount, formatDate } from '@/lib/utils';

interface ModalBonCommandeDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  bonCommande: BonCommande | null;
  canViewMontants?: boolean;
  onEdit?: (bc: BonCommande) => void;
  onPrint?: (bc: BonCommande, details: BonCommandeComplete) => void;
  onChangeStatus?: (bc: BonCommande) => void;
  onDelete?: (bc: BonCommande) => void;
}

export const ModalBonCommandeDetails = ({
  isOpen,
  onClose,
  bonCommande,
  canViewMontants = true,
  onEdit,
  onPrint,
  onChangeStatus,
  onDelete,
}: ModalBonCommandeDetailsProps) => {
  const [details, setDetails] = useState<BonCommandeComplete | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bonCommande) {
      loadDetails();
    } else {
      setDetails(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bonCommande?.id_bon_commande]);

  const loadDetails = async () => {
    if (!bonCommande) return;
    setLoading(true);
    try {
      const result = await bonCommandeService.getBonCommandeDetails(bonCommande.id_bon_commande);
      setDetails(result);
    } catch (error) {
      console.error('Erreur chargement details BC:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !bonCommande) return null;

  const statut = bonCommande.libelle_etat;
  const isLivre = statut === 'LIVRE';
  const isAnnule = statut === 'ANNULE';
  const canEdit = !isLivre && !isAnnule;
  const canDelete = !isLivre;
  const canChangeStatus = !isLivre && !isAnnule;
  const fournisseurEnrichi = details?.bon_commande?.fournisseur;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-lg bg-gradient-to-b from-sky-900 to-sky-950 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sky-700/50">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{bonCommande.num_bc}</h2>
              <div className="mt-1">
                <BonCommandeStatusBadge statut={statut} size="sm" />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content scrollable */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-sky-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Infos générales */}
                <div className="bg-white/10 rounded-xl p-3 space-y-2">
                  <h3 className="text-sky-300 font-semibold text-sm">Informations</h3>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Hash className="w-3.5 h-3.5 text-sky-300" />
                    <span>Date : {formatDate(bonCommande.date_bon_commande)}</span>
                  </div>
                  {bonCommande.description && (
                    <p className="text-white/70 text-sm italic">{bonCommande.description}</p>
                  )}
                </div>

                {/* Bloc fournisseur enrichi */}
                <div className="bg-white/10 rounded-xl p-3 space-y-2">
                  <h3 className="text-sky-300 font-semibold text-sm flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> Fournisseur
                  </h3>
                  <p className="text-white font-medium">
                    {fournisseurEnrichi?.nom_fournisseur ||
                      bonCommande.nom_fournisseur_snap ||
                      'Fournisseur'}
                  </p>
                  {(fournisseurEnrichi?.tel_fournisseur || bonCommande.tel_fournisseur_snap) && (
                    <p className="text-white/70 text-sm flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {fournisseurEnrichi?.tel_fournisseur || bonCommande.tel_fournisseur_snap}
                    </p>
                  )}
                  {fournisseurEnrichi?.email_fournisseur && (
                    <p className="text-white/70 text-sm flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {fournisseurEnrichi.email_fournisseur}
                    </p>
                  )}
                  {fournisseurEnrichi?.adresse && (
                    <p className="text-white/70 text-sm flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {fournisseurEnrichi.adresse}
                    </p>
                  )}
                  {fournisseurEnrichi?.ninea && (
                    <p className="text-white/60 text-xs">NINEA : {fournisseurEnrichi.ninea}</p>
                  )}
                </div>

                {/* Articles */}
                {details?.bon_commande?.articles && details.bon_commande.articles.length > 0 && (
                  <div className="bg-white/10 rounded-xl p-3">
                    <h3 className="text-sky-300 font-semibold text-sm mb-2">
                      Articles ({details.bon_commande.articles.length})
                    </h3>
                    <div className="space-y-2">
                      {details.bon_commande.articles.map((d, index) => (
                        <div key={index} className="flex justify-between items-start text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-white truncate">{d.nom_produit_snap}</p>
                            <p className="text-white/60 text-xs">
                              {d.quantite} ×{' '}
                              {canViewMontants ? formatAmount(d.cout_revient) : '***'}
                            </p>
                          </div>
                          <p className="text-white font-medium ml-2 whitespace-nowrap">
                            {canViewMontants ? formatAmount(d.sous_total) : '***'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Montants */}
                <div className="bg-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>Sous-total</span>
                    <span>
                      {canViewMontants
                        ? formatAmount(bonCommande.montant_net + bonCommande.mt_remise)
                        : '***'}
                    </span>
                  </div>
                  {bonCommande.mt_remise > 0 && (
                    <div className="flex justify-between text-sm text-orange-300">
                      <span>Remise</span>
                      <span>−{canViewMontants ? formatAmount(bonCommande.mt_remise) : '***'}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-white border-t border-white/20 pt-2">
                    <span>Montant net</span>
                    <span>
                      {canViewMontants ? formatAmount(bonCommande.montant_net) : '***'}
                    </span>
                  </div>
                </div>

                {/* Lien Inventaire pour BC LIVRÉ */}
                {isLivre && (
                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-3">
                    <p className="text-emerald-200 text-xs mb-2">
                      Pensez à enregistrer l&apos;entrée de stock dans le module Inventaire.
                    </p>
                    <a
                      href="/dashboard/commerce/inventaire"
                      className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ouvrir Inventaire
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions footer */}
          <div className="p-4 border-t border-sky-700/50 flex flex-wrap gap-2">
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(bonCommande);
                }}
                className="flex-1 min-w-[80px] py-2.5 bg-blue-500/20 rounded-xl text-blue-200 text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Modifier
              </button>
            )}
            {canChangeStatus && onChangeStatus && (
              <button
                onClick={() => {
                  onClose();
                  onChangeStatus(bonCommande);
                }}
                className="flex-1 min-w-[80px] py-2.5 bg-emerald-500/20 rounded-xl text-emerald-200 text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <ListChecks className="w-4 h-4" /> Statut
              </button>
            )}
            {onPrint && details && (
              <button
                onClick={() => {
                  onClose();
                  onPrint(bonCommande, details);
                }}
                disabled={loading || !details}
                className="flex-1 min-w-[80px] py-2.5 bg-indigo-500/20 rounded-xl text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(bonCommande);
                }}
                className="py-2.5 px-3 bg-red-500/20 rounded-xl text-red-200 text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
