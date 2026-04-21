'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface ModalSuppressionAdminProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, raison: string) => void | Promise<void>;
  numFacture: string;
  montant: number;
  loading?: boolean;
}

export function ModalSuppressionAdmin({
  isOpen,
  onClose,
  onConfirm,
  numFacture,
  montant,
  loading = false
}: ModalSuppressionAdminProps) {
  const t = useTranslations('invoicesModals');
  const tc = useTranslations('common');
  const [password, setPassword] = useState('');
  const [raison, setRaison] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setRaison('');
      setShowPwd(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = password.trim().length > 0 && !loading;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(password, raison.trim());
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-md overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 relative">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('adminDelete.title')}</h2>
                <p className="text-white/90 text-sm">{t('adminDelete.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm font-semibold mb-1">
                {t('adminDelete.warningTitle')}
              </p>
              <p className="text-red-700 text-sm leading-relaxed">
                {t('adminDelete.warningBody')}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('adminDelete.invoiceLabel')}</span>
                <span className="font-semibold text-gray-900">{numFacture}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('adminDelete.amountLabel')}</span>
                <span className="font-semibold text-gray-900">
                  {montant.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('adminDelete.passwordLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder={t('adminDelete.passwordPlaceholder')}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('adminDelete.reasonLabel')}
              </label>
              <textarea
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                disabled={loading}
                rows={2}
                placeholder={t('adminDelete.reasonPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('adminDelete.confirmButton')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
