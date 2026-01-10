/**
 * Composant FlipCard - Carte qui se retourne au clic
 * Face avant : contenu principal
 * Face arrière : contenu secondaire (ex: QR Code)
 * Responsive : 3 breakpoints (mobile, tablette, PC)
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  frontTitle?: string;
  backTitle?: string;
  frontIcon?: React.ReactNode;
  backIcon?: React.ReactNode;
  className?: string;
}

export function FlipCard({
  frontContent,
  backContent,
  frontTitle,
  backTitle,
  frontIcon,
  backIcon,
  className = ''
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { isMobile, isMobileLarge, isTablet } = useBreakpoint();

  // Styles responsives selon breakpoint
  const getStyles = () => {
    if (isMobile) {
      // Mobile : Ultra-compact
      return {
        container: 'min-h-[120px]',
        padding: 'p-2',
        titleSize: 'text-xs',
        iconSize: 'w-3 h-3',
        flipButtonSize: 'w-5 h-5',
        flipIconSize: 'w-3 h-3',
        gap: 'gap-1'
      };
    } else if (isMobileLarge || isTablet) {
      // Tablette : Medium
      return {
        container: 'min-h-[140px]',
        padding: 'p-3',
        titleSize: 'text-sm',
        iconSize: 'w-4 h-4',
        flipButtonSize: 'w-6 h-6',
        flipIconSize: 'w-3.5 h-3.5',
        gap: 'gap-1.5'
      };
    } else {
      // Desktop : Compact mais lisible
      return {
        container: 'min-h-[160px]',
        padding: 'p-4',
        titleSize: 'text-sm',
        iconSize: 'w-4 h-4',
        flipButtonSize: 'w-7 h-7',
        flipIconSize: 'w-4 h-4',
        gap: 'gap-2'
      };
    }
  };

  const styles = getStyles();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className={`relative ${styles.container} ${className}`}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Face avant */}
        <div
          className={`
            absolute inset-0 w-full h-full
            bg-gray-50 rounded-xl border border-gray-200
            ${styles.padding}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header face avant */}
          <div className={`flex items-center justify-between mb-2`}>
            <div className={`flex items-center ${styles.gap}`}>
              {frontIcon && (
                <span className={`${styles.iconSize} text-purple-600`}>
                  {frontIcon}
                </span>
              )}
              {frontTitle && (
                <span className={`font-semibold text-gray-900 ${styles.titleSize}`}>
                  {frontTitle}
                </span>
              )}
            </div>

            {/* Bouton flip */}
            <button
              onClick={handleFlip}
              className={`
                ${styles.flipButtonSize}
                bg-purple-100 hover:bg-purple-200
                rounded-full flex items-center justify-center
                transition-colors group
              `}
              title="Retourner pour voir le QR Code"
            >
              <RotateCw className={`${styles.flipIconSize} text-purple-600 group-hover:rotate-180 transition-transform duration-300`} />
            </button>
          </div>

          {/* Contenu face avant */}
          <div className="overflow-hidden">
            {frontContent}
          </div>
        </div>

        {/* Face arrière */}
        <div
          className={`
            absolute inset-0 w-full h-full
            bg-gradient-to-br from-purple-50 to-blue-50
            rounded-xl border border-purple-200
            ${styles.padding}
          `}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Header face arrière */}
          <div className={`flex items-center justify-between mb-2`}>
            <div className={`flex items-center ${styles.gap}`}>
              {backIcon && (
                <span className={`${styles.iconSize} text-purple-600`}>
                  {backIcon}
                </span>
              )}
              {backTitle && (
                <span className={`font-semibold text-gray-900 ${styles.titleSize}`}>
                  {backTitle}
                </span>
              )}
            </div>

            {/* Bouton flip retour */}
            <button
              onClick={handleFlip}
              className={`
                ${styles.flipButtonSize}
                bg-purple-100 hover:bg-purple-200
                rounded-full flex items-center justify-center
                transition-colors group
              `}
              title="Retourner pour voir les détails"
            >
              <RotateCw className={`${styles.flipIconSize} text-purple-600 group-hover:-rotate-180 transition-transform duration-300`} />
            </button>
          </div>

          {/* Contenu face arrière */}
          <div className="overflow-hidden">
            {backContent}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
