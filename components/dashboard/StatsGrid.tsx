'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatsGridProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Grille responsive pour les stats cards des dashboards
 * - Mobile: 2 colonnes (actuel)
 * - Desktop: 4 colonnes pour exploiter l'espace disponible
 * - Spacing et padding adaptatifs
 */
export default function StatsGrid({ 
  children, 
  className = "",
  delay = 0.6 
}: StatsGridProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className={`
        grid gap-3 mb-6
        grid-cols-2
        lg:grid-cols-4 lg:gap-4 lg:mb-8
        xl:gap-6 xl:mb-10
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}