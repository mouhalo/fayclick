/**
 * Composant GlassHeader avec effet glassmorphism
 * Header avec retour au dashboard et effet de verre
 */

'use client';

import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  filterContent?: React.ReactNode;
  className?: string;
  showBackButton?: boolean;
}

export const GlassHeader = ({ 
  title, 
  subtitle,
  onBack,
  rightContent,
  filterContent,
  className,
  showBackButton = true
}: GlassHeaderProps) => {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-30',
        'backdrop-blur-xl bg-emerald-500/90',
        'border-b border-emerald-400/30',
        'shadow-lg shadow-emerald-500/20',
        className
      )}
    >
      {/* Effet de brillance sur le header */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-emerald-300/20 to-emerald-400/10" />
      
      <div className="relative p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            {/* Bouton retour */}
            {showBackButton && onBack && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className={cn(
                  'flex items-center justify-center',
                  'w-10 h-10 rounded-xl',
                  'bg-white/20 backdrop-blur-lg',
                  'border border-white/30',
                  'hover:bg-white/30 hover:scale-105',
                  'transition-all duration-200',
                  'shadow-lg'
                )}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            
            {/* Titre et sous-titre */}
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-emerald-100 text-sm opacity-90">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Contenu à droite */}
          {rightContent && (
            <div className="flex items-center space-x-2">
              {rightContent}
            </div>
          )}
        </div>
        
        {/* Section de filtres intégrée */}
        {filterContent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-4 pt-4 border-t border-white/20"
          >
            {filterContent}
          </motion.div>
        )}
      </div>
      
      {/* Bordure inférieure avec effet glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
    </motion.div>
  );
};