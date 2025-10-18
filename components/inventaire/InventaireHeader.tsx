'use client';

import { ArrowLeft, Download, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventaireHeaderProps {
  onExport: () => void;
  onBack: () => void;
}

/**
 * Header du module Statistiques Inventaires
 * Design vert glassmorphism avec boutons d'action
 */
export default function InventaireHeader({ onExport, onBack }: InventaireHeaderProps) {
  return (
    <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 pb-24 pt-6 px-4">
      {/* Motif de fond */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>

      {/* Boutons d'action */}
      <div className="relative flex items-center justify-between mb-8">
        {/* Bouton Retour */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md
                     hover:bg-white/30 transition-all duration-200 shadow-lg"
          aria-label="Retour"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </motion.button>

        {/* Bouton Export */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExport}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md
                     hover:bg-white/30 transition-all duration-200 shadow-lg"
          aria-label="Exporter"
        >
          <Download className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Logo et Titre */}
      <div className="relative flex flex-col items-center text-center">
        {/* Icône Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 mb-4 rounded-full bg-white/90 backdrop-blur-md
                     flex items-center justify-center shadow-2xl"
        >
          <BarChart3 className="w-10 h-10 text-emerald-600" />
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-white mb-2 drop-shadow-lg"
        >
          Statistiques Inventaires
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-emerald-100 font-medium drop-shadow"
        >
          Analyse des performances
        </motion.p>
      </div>
    </div>
  );
}
