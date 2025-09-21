/**
 * Modal de confirmation générique réutilisable
 * Design glassmorphism cohérent avec l'application FayClick
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react';

interface ModalConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ModalConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger',
  loading = false
}: ModalConfirmationProps) {

  if (!isOpen) return null;

  // Configuration des couleurs selon le type
  const typeConfig = {
    danger: {
      gradient: 'from-red-500 to-red-600',
      icon: Trash2,
      confirmBg: 'bg-red-600 hover:bg-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    warning: {
      gradient: 'from-orange-500 to-orange-600',
      icon: AlertTriangle,
      confirmBg: 'bg-orange-600 hover:bg-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    info: {
      gradient: 'from-blue-500 to-blue-600',
      icon: Info,
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
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
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-md overflow-hidden"
        >
          {/* Header avec gradient */}
          <div className={`bg-gradient-to-r ${config.gradient} p-6 relative`}>
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`p-3 ${config.iconBg} rounded-2xl`}>
                <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {title || 'Confirmation'}
                </h2>
                <p className="text-white/90 text-sm">
                  Cette action nécessite votre confirmation
                </p>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 text-base leading-relaxed">
                {message}
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-3 ${config.confirmBg} text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}