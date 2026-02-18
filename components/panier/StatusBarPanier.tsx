/**
 * StatusBar Panier - Barre de statut fixe en bas d'écran
 * Affiche le total et nombre d'articles dans le panier
 * Visible UNIQUEMENT sur /produits et /venteflash
 * Vide le panier automatiquement quand l'utilisateur quitte ces pages
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanierStore } from '@/stores/panierStore';

// Pages autorisées pour le panier
const PANIER_ALLOWED_PATHS = ['/commerce/produits', '/commerce/venteflash'];

export function StatusBarPanier() {
  const pathname = usePathname();
  const { articles, getTotalItems, getSousTotal, isModalOpen, setModalOpen, clearPanier } = usePanierStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isAllowedPage = PANIER_ALLOWED_PATHS.some(p => pathname?.includes(p));

  // Vider le panier quand on quitte les pages autorisées
  useEffect(() => {
    if (!isAllowedPage) {
      const items = usePanierStore.getState().articles;
      if (items.length > 0) {
        console.log('🧹 [PANIER] Nettoyage auto - navigation hors pages panier');
        clearPanier();
      }
    }
  }, [isAllowedPage, clearPanier]);

  const totalItems = getTotalItems();
  const totalAmount = getSousTotal();

  // Ne pas afficher si panier vide OU page non autorisée
  if (!isAllowedPage || totalItems === 0) return null;

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleClearPanier = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmClear = () => {
    clearPanier();
    setShowConfirmModal(false);
  };

  const handleCancelClear = () => {
    setShowConfirmModal(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="mx-auto max-w-md">
          <motion.div
            animate={{ 
              scale: totalItems > 0 ? [1, 1.02, 1] : 1,
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="
              bg-gradient-to-r from-blue-500/90 to-blue-600/90
              backdrop-blur-lg border border-blue-300/30
              rounded-2xl shadow-2xl p-3
              flex items-center gap-2
            "
          >
            {/* Section Panier - 1/3 de la largeur */}
            <div className="flex items-center gap-2 text-white flex-1">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {/* Badge compteur */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="
                    absolute -top-1.5 -right-1.5
                    bg-orange-500 text-white text-xs font-bold
                    rounded-full w-4 h-4 flex items-center justify-center
                    border-2 border-white
                  "
                >
                  {totalItems}
                </motion.div>
              </motion.div>

              <div className="flex flex-col leading-tight">
                <div className="text-xs font-medium">
                  {totalItems} article{totalItems > 1 ? 's' : ''}
                </div>
                <div className="text-sm font-bold">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* Bouton Corbeille */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearPanier}
              className="
                bg-red-500 hover:bg-red-600 text-white
                p-2.5 rounded-xl
                shadow-lg hover:shadow-xl
                transition-all duration-200
                flex items-center justify-center
              "
              aria-label="Vider le panier"
              title="Vider le panier"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>

            {/* Bouton Afficher */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenModal}
              className="
                bg-white text-blue-600 font-semibold
                px-4 py-2.5 rounded-xl
                shadow-lg hover:shadow-xl
                transition-all duration-200
                flex items-center gap-1.5
              "
            >
              <ShoppingCart className="w-4 h-4" />
              Afficher
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Modal de confirmation de suppression */}
      {showConfirmModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={handleCancelClear}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-white">
                Vider le panier ?
              </h3>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <p className="text-gray-700 text-base mb-2">
                Voulez-vous vraiment vider le panier ?
              </p>
              <p className="text-gray-900 font-bold text-lg mb-1">
                {totalItems} article{totalItems > 1 ? 's' : ''}
              </p>
              <p className="text-gray-600 text-sm mb-4">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-red-600 text-sm font-medium">
                Cette action est irréversible
              </p>
            </div>

            {/* Footer - Boutons */}
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={handleCancelClear}
                className="
                  flex-1 py-3 px-4 rounded-xl
                  bg-gray-200 hover:bg-gray-300
                  text-gray-700 font-semibold text-sm
                  transition-colors
                "
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmClear}
                className="
                  flex-1 py-3 px-4 rounded-xl
                  bg-gradient-to-r from-red-500 to-red-600
                  hover:from-red-600 hover:to-red-700
                  text-white font-semibold text-sm
                  shadow-lg hover:shadow-xl
                  transition-all
                  flex items-center justify-center gap-2
                "
              >
                <Trash2 className="w-4 h-4" />
                Vider
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}