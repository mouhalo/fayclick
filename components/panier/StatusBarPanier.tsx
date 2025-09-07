/**
 * StatusBar Panier - Barre de statut fixe en bas d'écran
 * Affiche le total et nombre d'articles dans le panier
 * Design glassmorphisme avec animations
 */

'use client';

import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanierStore } from '@/stores/panierStore';

export function StatusBarPanier() {
  const { articles, getTotalItems, getSousTotal, isModalOpen, setModalOpen } = usePanierStore();
  
  const totalItems = getTotalItems();
  const totalAmount = getSousTotal();
  
  // Ne pas afficher si panier vide
  if (totalItems === 0) return null;

  const handleOpenModal = () => {
    setModalOpen(true);
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
              rounded-2xl shadow-2xl p-4
              flex items-center justify-between
            "
          >
            {/* Icône et informations */}
            <div className="flex items-center gap-3 text-white">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <ShoppingCart className="w-6 h-6" />
                {/* Badge compteur */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="
                    absolute -top-2 -right-2
                    bg-orange-500 text-white text-xs font-bold
                    rounded-full w-5 h-5 flex items-center justify-center
                    border-2 border-white
                  "
                >
                  {totalItems}
                </motion.div>
              </motion.div>
              
              <div>
                <div className="text-sm font-medium">
                  {totalItems} article{totalItems > 1 ? 's' : ''}
                </div>
                <div className="text-lg font-bold">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* Bouton Afficher */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenModal}
              className="
                bg-white text-blue-600 font-semibold
                px-6 py-2 rounded-xl
                shadow-lg hover:shadow-xl
                transition-all duration-200
                flex items-center gap-2
              "
            >
              <ShoppingCart className="w-4 h-4" />
              Afficher
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}