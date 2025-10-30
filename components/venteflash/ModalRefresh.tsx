/**
 * Modal de rafraîchissement automatique
 * Affiche un message bloquant pendant le rechargement des données
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ModalRefreshProps {
  isOpen: boolean;
}

export function ModalRefresh({ isOpen }: ModalRefreshProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop bloquant */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center"
          >
            {/* Modal centré */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4"
            >
              {/* Icône animée */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <RefreshCw className="w-10 h-10 text-white" />
                </motion.div>
              </div>

              {/* Titre */}
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-3">
                Rafraîchissement en cours...
              </h3>

              {/* Message */}
              <p className="text-center text-gray-600 mb-6">
                Mise à jour des données<br />
                <span className="text-sm text-gray-500">Veuillez patienter quelques instants</span>
              </p>

              {/* Barre de progression animée */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
