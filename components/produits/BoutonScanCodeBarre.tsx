/**
 * Bouton scan de code-barres optimisé pour grille 2×1
 * Design glassmorphism vert avec animations Framer Motion
 */

'use client';

import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

interface BoutonScanCodeBarreProps {
  /** Callback au clic sur le bouton */
  onScanClick: () => void;
  /** Bouton désactivé */
  disabled?: boolean;
  /** Variante visuelle */
  variant?: 'primary' | 'secondary';
  /** Classe CSS additionnelle */
  className?: string;
}

export function BoutonScanCodeBarre({
  onScanClick,
  disabled = false,
  variant = 'primary',
  className = ''
}: BoutonScanCodeBarreProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      onClick={onScanClick}
      disabled={disabled}
      className={`
        w-full h-full px-4 py-3 rounded-lg font-medium
        flex items-center justify-center gap-2
        transition-all duration-200
        ${
          variant === 'primary'
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
            : 'bg-white/90 backdrop-blur-sm text-green-700 hover:bg-white border border-green-200 hover:border-green-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label="Scanner un code-barres"
      title="Scanner un code-barres"
    >
      <Camera className="w-5 h-5" />
      <span className="hidden sm:inline font-semibold">Scanner</span>
      <span className="sm:hidden font-semibold">Scan</span>
    </motion.button>
  );
}
