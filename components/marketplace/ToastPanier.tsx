'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import Image from 'next/image';

interface ToastPanierProps {
  visible: boolean;
  nomProduit: string;
  photoUrl?: string;
  onHide: () => void;
}

export default function ToastPanier({ visible, nomProduit, photoUrl, onHide }: ToastPanierProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[90vw]"
        >
          {/* Miniature */}
          {photoUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
              <Image src={photoUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate max-w-[200px]">{nomProduit}</p>
            <p className="text-emerald-400 text-xs font-medium">Ajoute au panier !</p>
          </div>

          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
