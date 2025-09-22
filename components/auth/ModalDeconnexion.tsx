/**
 * Modal de confirmation de déconnexion
 * Design glassmorphism selon les standards FayClick
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, X } from 'lucide-react';

interface ModalDeconnexionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export function ModalDeconnexion({
  isOpen,
  onClose,
  onConfirm,
  userName
}: ModalDeconnexionProps) {

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
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
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-4">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                  ease: "easeInOut"
                }}
                className="p-4 bg-white/20 backdrop-blur-lg rounded-2xl"
              >
                <AlertTriangle className="w-8 h-8 text-white" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-white">
                  Déconnexion
                </h2>
                <p className="text-white/90 text-sm mt-1">
                  Confirmation requise
                </p>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6">
            {/* Message personnalisé */}
            <div className="mb-6">
              <p className="text-gray-700 text-base leading-relaxed">
                {userName ? (
                  <>
                    <span className="font-semibold text-gray-900">{userName}</span>,
                    êtes-vous sûr de vouloir vous déconnecter ?
                  </>
                ) : (
                  'Êtes-vous sûr de vouloir vous déconnecter ?'
                )}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Vous devrez vous reconnecter pour accéder à nouveau à votre compte.
              </p>
            </div>

            {/* Informations de session */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6 border border-amber-200"
            >
              <div className="flex items-start gap-3">
                <LogOut className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Information de session
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Vos travaux non sauvegardés seront perdus.
                    Assurez-vous d&apos;avoir enregistré toutes vos modifications.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Annuler
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Se déconnecter
              </motion.button>
            </div>
          </div>

          {/* Footer décoratif */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}