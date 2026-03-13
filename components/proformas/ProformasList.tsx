/**
 * Liste des proformas avec animations stagger et design glassmorphism
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck } from 'lucide-react';
import { ProformaCard, ProformaCardSkeleton } from './ProformaCard';
import { Proforma } from '@/types/proforma';

interface ProformasListProps {
  proformas: Proforma[];
  loading?: boolean;
  onVoirDetails?: (proforma: Proforma) => void;
  onModifier?: (proforma: Proforma) => void;
  onImprimer?: (proforma: Proforma) => void;
  onPartager?: (proforma: Proforma) => void;
  onConvertir?: (proforma: Proforma) => void;
  onSupprimer?: (proforma: Proforma) => void;
  canViewMontants?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 },
  },
  exit: { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.2 } },
};

export const ProformasList = ({
  proformas,
  loading = false,
  onVoirDetails,
  onModifier,
  onImprimer,
  onPartager,
  onConvertir,
  onSupprimer,
  canViewMontants = true
}: ProformasListProps) => {
  if (loading) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div key={index} variants={itemVariants}>
            <ProformaCardSkeleton delay={index * 0.1} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (!proformas || proformas.length === 0) {
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
          <FileCheck className="w-10 h-10 text-white/60" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white/80 mb-2"
        >
          Aucune proforma
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-amber-100/70 text-sm"
        >
          Creez votre premiere facture proforma en cliquant sur le bouton ci-dessus.
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 pb-20">
      <AnimatePresence mode="popLayout">
        {proformas.map((proforma, index) => (
          <motion.div key={proforma.id_proforma} variants={itemVariants} layout exit="exit">
            <ProformaCard
              proforma={proforma}
              onVoirDetails={onVoirDetails}
              onModifier={onModifier}
              onImprimer={onImprimer}
              onPartager={onPartager}
              onConvertir={onConvertir}
              onSupprimer={onSupprimer}
              delay={index * 0.05}
              canViewMontants={canViewMontants}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
