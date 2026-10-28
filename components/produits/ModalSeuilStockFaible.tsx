/**
 * Modal de réglage du seuil "stock faible"
 * Ouvert depuis l'icône paramètres du header de la page Produits.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface ModalSeuilStockFaibleProps {
  isOpen: boolean;
  onClose: () => void;
  seuil: number;
  onSave: (seuil: number) => void;
}

export function ModalSeuilStockFaible({ isOpen, onClose, seuil, onSave }: ModalSeuilStockFaibleProps) {
  const t = useTranslations('produits');
  const [valeur, setValeur] = useState(String(seuil));

  // Repartir de la valeur enregistrée à chaque ouverture
  useEffect(() => {
    if (isOpen) setValeur(String(seuil));
  }, [isOpen, seuil]);

  const nombre = Number(valeur);
  const valide = valeur.trim() !== '' && Number.isInteger(nombre) && nombre > 0;

  const handleSave = () => {
    if (!valide) return;
    onSave(nombre);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t('stockFaible.modalTitle')}</h3>
                <p className="text-sm text-slate-500">{t('stockFaible.modalSubtitle')}</p>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="seuil-stock-faible">
              {t('stockFaible.inputLabel')}
            </label>
            <input
              id="seuil-stock-faible"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className={`text-xs mt-1.5 ${valide ? 'text-slate-500' : 'text-red-500'}`}>
              {valide ? t('stockFaible.inputHint', { seuil: nombre }) : t('stockFaible.inputInvalid')}
            </p>

            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                {t('stockFaible.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!valide}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium transition-all hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('stockFaible.save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
