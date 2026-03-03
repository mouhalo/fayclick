'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

interface BoutiqueFABProps {
  nbArticles: number;
  onClick: () => void;
}

export default function BoutiqueFAB({ nbArticles, onClick }: BoutiqueFABProps) {
  return (
    <AnimatePresence>
      {nbArticles > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          key={nbArticles}
          onClick={onClick}
          className="fixed bottom-20 right-5 z-[9999] w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center"
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          <motion.span
            key={`badge-${nbArticles}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {nbArticles}
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
