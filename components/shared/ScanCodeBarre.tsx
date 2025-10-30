/**
 * Composant réutilisable pour scanner les codes-barres
 * Wrapper autour de ModalScanCodeBarre pour faciliter l'intégration
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { ModalScanCodeBarre } from '@/components/produits/ModalScanCodeBarre';

interface ScanCodeBarreProps {
  /** Callback appelé avec le code scanné */
  onScanSuccess: (code: string) => void;
  /** Contexte d'utilisation pour personnaliser le message */
  context?: 'panier' | 'ajout-produit' | 'venteflash';
  /** Variante visuelle du bouton */
  variant?: 'primary' | 'secondary' | 'minimal';
  /** Texte personnalisé du bouton */
  buttonText?: string;
  /** Taille du bouton */
  size?: 'sm' | 'md' | 'lg';
  /** Afficher uniquement l'icône sans texte */
  iconOnly?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

export function ScanCodeBarre({
  onScanSuccess,
  context = 'panier',
  variant = 'primary',
  buttonText,
  size = 'md',
  iconOnly = false,
  className = ''
}: ScanCodeBarreProps) {
  const [showScanModal, setShowScanModal] = useState(false);

  const handleScanSuccess = (code: string) => {
    console.log('📊 [SCAN CODE BARRE] Code scanné:', code);
    onScanSuccess(code);
    setShowScanModal(false);
  };

  // Styles selon variante
  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl',
    secondary: 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50',
    minimal: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
  };

  // Styles selon taille (différent si iconOnly)
  const sizeStyles = iconOnly ? {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  } : {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  // Taille icône
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  // Texte par défaut selon contexte
  const defaultText = buttonText || (
    context === 'venteflash' ? 'Scanner' :
    context === 'ajout-produit' ? 'Scanner code-barres' :
    'Scanner'
  );

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowScanModal(true)}
        className={`
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${iconOnly ? 'rounded-full' : 'rounded-xl'}
          font-medium transition-all
          flex items-center justify-center gap-2
          ${className}
        `}
      >
        <Camera className={iconSizes[size]} />
        {!iconOnly && <span>{defaultText}</span>}
      </motion.button>

      {/* Modal Scanner */}
      <ModalScanCodeBarre
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScanSuccess={handleScanSuccess}
        context={context}
      />
    </>
  );
}
