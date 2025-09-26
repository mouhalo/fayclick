/**
 * Composant FacturesList avec animations stagger et design glassmorphism
 * Liste optimisée avec effet d'apparition séquentielle
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { FactureCard, FactureCardSkeleton } from './FactureCard';
import { FactureComplete } from '@/types/facture';

interface FacturesListProps {
  factures: FactureComplete[];
  loading?: boolean;
  onVoirDetailsModal?: (facture: FactureComplete) => void;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
  onVoirRecu?: (facture: FactureComplete) => void;
  onSupprimer?: (facture: FactureComplete) => void;
}

// Variants pour le container avec stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// Variants pour les items individuels
const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    y: -20,
    transition: {
      duration: 0.2
    }
  },
};

export const FacturesList = ({
  factures,
  loading = false,
  onVoirDetailsModal,
  onAjouterAcompte,
  onPartager,
  onVoirRecu,
  onSupprimer
}: FacturesListProps) => {

  // État de loading
  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div key={index} variants={itemVariants}>
            <FactureCardSkeleton delay={index * 0.1} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // État vide
  if (!factures || factures.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20"
        >
          <Receipt className="w-10 h-10 text-white/60" />
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white/80 mb-2"
        >
          Aucune facture trouvée
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-emerald-100/70 text-sm"
        >
          Aucune facture ne correspond à vos critères de recherche.
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-20" // Padding bottom pour éviter le chevauchement avec la navigation
    >
      <AnimatePresence mode="popLayout">
        {factures.map((facture, index) => (
          <motion.div
            key={facture.facture.id_facture}
            variants={itemVariants}
            layout
            exit="exit"
          >
            <FactureCard
              facture={facture}
              onVoirDetailsModal={onVoirDetailsModal}
              onAjouterAcompte={onAjouterAcompte}
              onPartager={onPartager}
              onVoirRecu={onVoirRecu}
              onSupprimer={onSupprimer}
              delay={index * 0.05} // Délai plus court pour la fluidité
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

// Hook pour optimiser les performances avec de grandes listes
export const useMemoizedFacturesList = (factures: FactureComplete[]) => {
  return factures; // Pour l'instant, pas de virtualisation complexe
};