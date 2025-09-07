/**
 * Composant EmptyState
 * État vide réutilisable avec design glassmorphism
 */

'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title = "Aucun élément",
  message = "Aucun élément n'a été trouvé.",
  action,
  className = "text-center py-12"
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={className}
    >
      {/* Icône */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="w-24 h-24 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20"
      >
        {Icon ? (
          <Icon className="w-12 h-12 text-white/60" />
        ) : (
          <div className="w-12 h-12 rounded bg-white/20" />
        )}
      </motion.div>
      
      {/* Titre */}
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-semibold text-white/80 mb-2"
      >
        {title}
      </motion.h3>
      
      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-emerald-100/70 text-sm mb-6"
      >
        {message}
      </motion.p>
      
      {/* Action */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}