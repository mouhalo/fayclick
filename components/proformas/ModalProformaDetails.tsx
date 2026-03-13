/**
 * Modal de details d'une proforma
 * Affiche les informations completes + articles + actions
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Printer, FileOutput, Trash2, Loader, ExternalLink } from 'lucide-react';
import { ProformaStatusBadge } from './ProformaStatusBadge';
import { proformaService } from '@/services/proforma.service';
import { Proforma, ProformaComplete, ProformaDetail } from '@/types/proforma';
import { formatAmount, formatDate } from '@/lib/utils';

interface ModalProformaDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma | null;
  onModifier?: (proforma: Proforma) => void;
  onImprimer?: (proforma: Proforma) => void;
  onConvertir?: (proforma: Proforma) => void;
  onSupprimer?: (proforma: Proforma) => void;
  canViewMontants?: boolean;
}

export const ModalProformaDetails = ({
  isOpen,
  onClose,
  proforma,
  onModifier,
  onImprimer,
  onConvertir,
  onSupprimer,
  canViewMontants = true
}: ModalProformaDetailsProps) => {
  const [details, setDetails] = useState<ProformaComplete | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && proforma) {
      loadDetails();
    } else {
      setDetails(null);
    }
  }, [isOpen, proforma?.id_proforma]);

  const loadDetails = async () => {
    if (!proforma) return;
    setLoading(true);
    try {
      const result = await proformaService.getProformaDetails(proforma.id_proforma);
      setDetails(result);
    } catch (error) {
      console.error('Erreur chargement details proforma:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !proforma) return null;

  const isConvertie = proforma.libelle_etat === 'CONVERTIE';

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
          className="relative w-full sm:max-w-lg bg-gradient-to-b from-amber-900 to-amber-950 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-700/50">
            <div>
              <h2 className="text-lg font-bold text-white">{proforma.num_proforma}</h2>
              <ProformaStatusBadge status={proforma.libelle_etat} size="sm" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Infos client */}
                <div className="bg-white/10 rounded-xl p-3 space-y-2">
                  <h3 className="text-amber-300 font-semibold text-sm">Client</h3>
                  <p className="text-white font-medium">{proforma.nom_client}</p>
                  <p className="text-white/70 text-sm">Tel: {proforma.tel_client}</p>
                  <p className="text-white/70 text-sm">Date: {formatDate(proforma.date_proforma)}</p>
                  {proforma.id_facture_liee && (
                    <p className="text-violet-300 text-sm flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Facture liee: #{proforma.id_facture_liee}
                    </p>
                  )}
                </div>

                {/* Articles */}
                {details?.details && details.details.length > 0 && (
                  <div className="bg-white/10 rounded-xl p-3">
                    <h3 className="text-amber-300 font-semibold text-sm mb-2">
                      Articles ({details.resume?.nb_articles || details.details.length})
                    </h3>
                    <div className="space-y-2">
                      {details.details.map((detail: ProformaDetail, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-white truncate">{detail.nom_produit}</p>
                            <p className="text-white/60 text-xs">
                              {detail.quantite} x {canViewMontants ? formatAmount(detail.prix_unitaire) : '***'}
                            </p>
                          </div>
                          <p className="text-white font-medium ml-2">
                            {canViewMontants ? formatAmount(detail.sous_total) : '***'}
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
                    <span>{canViewMontants ? formatAmount(proforma.montant) : '***'}</span>
                  </div>
                  {proforma.mt_remise > 0 && (
                    <div className="flex justify-between text-sm text-orange-300">
                      <span>Remise</span>
                      <span>-{canViewMontants ? formatAmount(proforma.mt_remise) : '***'}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-white border-t border-white/20 pt-2">
                    <span>Total</span>
                    <span>{canViewMontants ? formatAmount(proforma.montant_net) : '***'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions footer */}
          <div className="p-4 border-t border-amber-700/50 flex gap-2">
            {!isConvertie && onModifier && (
              <button
                onClick={() => { onClose(); onModifier(proforma); }}
                className="flex-1 py-2.5 bg-blue-500/20 rounded-xl text-blue-200 text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Modifier
              </button>
            )}
            {onImprimer && (
              <button
                onClick={() => { onClose(); onImprimer(proforma); }}
                className="flex-1 py-2.5 bg-indigo-500/20 rounded-xl text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            )}
            {!isConvertie && onConvertir && (
              <button
                onClick={() => { onClose(); onConvertir(proforma); }}
                className="flex-1 py-2.5 bg-emerald-500/20 rounded-xl text-emerald-200 text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <FileOutput className="w-4 h-4" /> Facturer
              </button>
            )}
            {!isConvertie && onSupprimer && (
              <button
                onClick={() => { onClose(); onSupprimer(proforma); }}
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
