'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface DashboardContainerProps {
  children: ReactNode;
  backgroundGradient?: string;
  className?: string;
}

/**
 * Container responsive pour dashboards
 * - Mobile/Tablet: Design actuel étroit (max-w-md)
 * - Desktop: Layout élargi pour utiliser l'espace disponible
 * - Desktop-large: Pleine largeur avec contraintes raisonnables
 */
export default function DashboardContainer({ 
  children, 
  backgroundGradient = "from-blue-600 via-blue-700 to-blue-800",
  className = ""
}: DashboardContainerProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`
          mx-auto bg-white min-h-screen relative overflow-hidden
          max-w-md
          lg:max-w-4xl lg:rounded-none lg:shadow-2xl
          xl:max-w-6xl
          2xl:max-w-7xl
          ${className}
        `}
      >
        {children}
      </motion.div>
    </div>
  );
}