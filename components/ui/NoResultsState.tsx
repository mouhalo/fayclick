/**
 * Composant NoResultsState
 * État "aucun résultat" réutilisable pour les filtres
 */

'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface NoResultsStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoResultsState({
  icon: Icon,
  title = "Aucun résultat",
  message = "Aucun élément ne correspond à vos critères de recherche.",
  action,
  className = "text-center py-8"
}: NoResultsStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {/* Icône */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20"
      >
        {Icon ? (
          <Icon className="w-8 h-8 text-white/60" />
        ) : (
          <div className="w-8 h-8 rounded bg-white/20" />
        )}
      </motion.div>
      
      {/* Titre */}
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-semibold text-white/80 mb-2"
      >
        {title}
      </motion.h3>
      
      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-emerald-100/70 text-sm"
      >
        {message}
      </motion.p>
      
      {/* Action optionnelle */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}