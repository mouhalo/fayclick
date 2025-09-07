/**
 * Composant ErrorState
 * État d'erreur réutilisable avec design glassmorphism
 */

'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface ErrorStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  icon: Icon = AlertCircle,
  title = "Erreur de chargement",
  message,
  onRetry,
  retryLabel = "Réessayer",
  className = "min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center p-4"
}: ErrorStateProps) {
  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Icône d'erreur */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-red-500/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-400/30"
        >
          <Icon className="w-10 h-10 text-red-300" />
        </motion.div>
        
        {/* Titre */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white mb-2"
        >
          {title}
        </motion.h3>
        
        {/* Message d'erreur */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-emerald-100 mb-6"
        >
          {message}
        </motion.p>
        
        {/* Bouton retry */}
        {onRetry && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors border border-white/30"
          >
            {retryLabel}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}