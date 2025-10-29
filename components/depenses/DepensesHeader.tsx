'use client';

import { ArrowLeft, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Header du module Gestion des Dépenses
 * Design bleu/indigo avec bouton retour
 */
export default function DepensesHeader() {
  const router = useRouter();

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 pb-10 pt-3 px-4">
      {/* Motif de fond */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>

      {/* Bouton Retour */}
      <div className="relative flex items-center justify-between mb-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/dashboard/commerce')}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md
                     hover:bg-white/30 transition-all duration-200 shadow-lg"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      {/* Logo et Titre */}
      <div className="relative flex flex-col items-center text-center">
        {/* Icône Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-14 h-14 mb-2 rounded-full bg-white/90 backdrop-blur-md
                     flex items-center justify-center shadow-2xl"
        >
          <Wallet className="w-7 h-7 text-blue-600" />
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-white mb-1 drop-shadow-lg"
        >
          Gestion des Dépenses
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-blue-100 font-medium drop-shadow"
        >
          Suivi et contrôle des dépenses
        </motion.p>
      </div>
    </div>
  );
}
