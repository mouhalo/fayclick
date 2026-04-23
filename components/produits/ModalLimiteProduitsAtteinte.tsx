/**
 * Modal Limite Produits Atteinte
 * Affiche un avertissement quand le marchand atteint le nombre maximum de produits
 * autorisé par son abonnement, avec deux actions : contacter le support ou nettoyer le stock.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  X,
  MessageCircle,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ModalLimiteProduitsAtteinteProps {
  /** Contrôle l'affichage du modal */
  isOpen: boolean;
  /** Callback pour fermer le modal */
  onClose: () => void;
  /** Nombre actuel de produits */
  currentCount: number;
  /** Nombre maximum autorisé par l'abonnement */
  maxCount: number;
  /** Numéro WhatsApp du support (format international sans +, ex: 221777301221) */
  supportWhatsapp?: string;
  /** Callback pour rediriger vers le filtre stock = 0 */
  onCleanStock?: () => void;
}

export function ModalLimiteProduitsAtteinte({
  isOpen,
  onClose,
  currentCount,
  maxCount,
  supportWhatsapp = '221781043505',
  onCleanStock,
}: ModalLimiteProduitsAtteinteProps) {
  const handleContactSupport = () => {
    const message = encodeURIComponent(
      `Bonjour, j'ai atteint la limite de ${maxCount} produits sur mon compte FayClick. ` +
      `Je souhaite changer de formule pour augmenter mon quota.`
    );
    const url = `https://wa.me/${supportWhatsapp}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCleanStock = () => {
    onClose();
    if (onCleanStock) onCleanStock();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec gradient */}
              <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 pt-8 pb-16 px-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Package className="w-10 h-10 text-white" />
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-800" />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-white text-center mt-4"
                >
                  Limite de produits atteinte
                </motion.h2>
              </div>

              {/* Contenu */}
              <div className="relative px-6 pb-6 -mt-8">
                {/* Carte compteur */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600">{currentCount}</div>
                      <div className="text-xs text-gray-500 mt-1">Actuels</div>
                    </div>
                    <div className="text-3xl text-gray-300 font-light">/</div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-700">{maxCount}</div>
                      <div className="text-xs text-gray-500 mt-1">Autorisés</div>
                    </div>
                  </div>

                  <p className="text-gray-700 text-center leading-relaxed text-sm">
                    Vous avez atteint le nombre maximum de produits autorisé par votre abonnement.
                    Pour continuer à ajouter des produits, vous avez deux options :
                  </p>
                </motion.div>

                {/* Options */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 space-y-2"
                >
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Changer de formule</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Contactez le support pour augmenter votre quota de produits.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Nettoyer votre catalogue</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Supprimez les produits non vendus ou avec un stock à zéro.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Boutons d'action */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 space-y-3"
                >
                  <button
                    onClick={handleContactSupport}
                    className="w-full py-4 px-6 bg-gradient-to-r from-green-500 via-green-600 to-emerald-500 hover:from-green-600 hover:via-green-700 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Contacter le support</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {onCleanStock && (
                    <button
                      onClick={handleCleanStock}
                      className="w-full py-3 px-6 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Nettoyer le stock à zéro</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors"
                  >
                    Fermer
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook pour gérer l'affichage du modal de limite produits atteinte
 */
export function useModalLimiteProduitsAtteinte() {
  const [isOpen, setIsOpen] = useState(false);

  const showModal = useCallback(() => setIsOpen(true), []);
  const hideModal = useCallback(() => setIsOpen(false), []);

  return { isOpen, showModal, hideModal };
}
