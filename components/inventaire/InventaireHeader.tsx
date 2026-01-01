'use client';

import { ArrowLeft, Download, BarChart3, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventaireHeaderProps {
  onExport: () => void;
  onBack: () => void;
  onCalendar: () => void;
}

/**
 * Header du module Statistiques Inventaires
 * Design vert glassmorphism avec boutons d'action
 */
export default function InventaireHeader({ onExport, onBack, onCalendar }: InventaireHeaderProps) {
  return (
    <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 pb-4 pt-3 px-4">
      {/* Motif de fond */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>

      {/* Layout horizontal : Retour | Centre (icône + titre) | Actions */}
      <div className="relative flex items-center justify-between">
        {/* Bouton Retour */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md
                     hover:bg-white/30 transition-all duration-200 shadow-lg"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </motion.button>

        {/* Centre : Icône + Titre + Sous-titre */}
        <div className="flex items-center gap-3">
          {/* Icône Logo compact */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md
                       flex items-center justify-center shadow-lg"
          >
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </motion.div>

          {/* Titre et sous-titre */}
          <div className="text-left">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base font-bold text-white leading-tight drop-shadow-lg"
            >
              Statistiques Inventaires
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-emerald-100 font-medium drop-shadow"
            >
              Analyse des performances
            </motion.p>
          </div>
        </div>

        {/* Boutons droite : Export + Calendrier */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md
                       hover:bg-white/30 transition-all duration-200 shadow-lg"
            aria-label="Exporter"
          >
            <Download className="w-4 h-4 text-white" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCalendar}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md
                       hover:bg-white/30 transition-all duration-200 shadow-lg"
            aria-label="Sélectionner période"
          >
            <Calendar className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
