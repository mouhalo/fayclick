/**
 * Modal de confirmation conversion proforma → facture
 * Affiche resume et avertissement stock
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, FileOutput, Loader } from 'lucide-react';
import { proformaService } from '@/services/proforma.service';
import { Proforma, ConvertProformaResponse } from '@/types/proforma';
import { formatAmount } from '@/lib/utils';

interface ModalConvertirProformaProps {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma | null;
  onSuccess: (result: ConvertProformaResponse) => void;
}

export const ModalConvertirProforma = ({
  isOpen,
  onClose,
  proforma,
  onSuccess
}: ModalConvertirProformaProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConvertir = async () => {
    if (!proforma) return;
    setLoading(true);
    setError('');

    try {
      const result = await proformaService.convertToFacture(proforma.id_proforma);
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la conversion');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !proforma) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-b from-amber-900 to-amber-950 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-700/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileOutput className="w-5 h-5 text-emerald-400" />
              Convertir en facture
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Resume proforma */}
            <div className="bg-white/10 rounded-xl p-4 space-y-2">
              <p className="text-white font-semibold">{proforma.num_proforma}</p>
              <p className="text-white/70 text-sm">Client: {proforma.nom_client}</p>
              <p className="text-white/70 text-sm">{proforma.nb_articles} article(s)</p>
              <p className="text-white text-xl font-bold">{formatAmount(proforma.montant_net)}</p>
            </div>

            {/* Avertissement stock */}
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-orange-200 font-medium">Attention</p>
                <p className="text-orange-200/80">
                  La conversion en facture va <strong>mouvementer le stock</strong> pour tous les articles de cette proforma. Cette action est irreversible.
                </p>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-amber-700/50 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConvertir}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 rounded-xl text-white text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <FileOutput className="w-4 h-4" />
              )}
              {loading ? 'Conversion...' : 'Convertir en facture'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
