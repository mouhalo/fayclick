/**
 * Toast de partage post-facture
 * Options: QR Code, WhatsApp, URL
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, QrCode, MessageCircle, Link, X } from 'lucide-react';
import { ToastPartageProps } from '@/types/panier';

export function ToastPartage({ 
  isVisible, 
  factureId, 
  urlFacture, 
  onClose, 
  onShare 
}: ToastPartageProps) {
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] max-w-sm w-full mx-4"
        >
          <div className="
            bg-gradient-to-r from-green-500 to-green-600 
            text-white border-2 border-green-400
            rounded-2xl shadow-2xl p-6
          ">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Facture créée !</h3>
                  <p className="text-sm opacity-90">Facture #{factureId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message */}
            <p className="text-sm opacity-90 mb-4">
              Votre facture a été enregistrée avec succès. Choisissez comment la partager :
            </p>

            {/* Boutons de partage */}
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShare('qr')}
                className="
                  bg-white/20 hover:bg-white/30 
                  rounded-xl p-3 flex flex-col items-center gap-2
                  transition-colors
                "
              >
                <QrCode className="w-6 h-6" />
                <span className="text-xs font-medium">QR Code</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShare('whatsapp')}
                className="
                  bg-white/20 hover:bg-white/30 
                  rounded-xl p-3 flex flex-col items-center gap-2
                  transition-colors
                "
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-xs font-medium">WhatsApp</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShare('url')}
                className="
                  bg-white/20 hover:bg-white/30 
                  rounded-xl p-3 flex flex-col items-center gap-2
                  transition-colors
                "
              >
                <Link className="w-6 h-6" />
                <span className="text-xs font-medium">Copier URL</span>
              </motion.button>
            </div>

            {/* Barre de progression de fermeture automatique */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="h-1 bg-white/30 rounded-full mt-4"
              onAnimationComplete={onClose}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}