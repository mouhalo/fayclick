/**
 * Liste des Bons de Commande avec animations stagger et état vide
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';
import { BonCommandeCard, BonCommandeCardSkeleton } from './BonCommandeCard';
import { BonCommande } from '@/types/bon-commande';

interface BonsCommandesListProps {
  items: BonCommande[];
  loading?: boolean;
  canViewMontants?: boolean;
  onView?: (bc: BonCommande) => void;
  onEdit?: (bc: BonCommande) => void;
  onPrint?: (bc: BonCommande) => void;
  onChangeStatus?: (bc: BonCommande) => void;
  onDelete?: (bc: BonCommande) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 12 },
  },
  exit: { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.2 } },
};

export const BonsCommandesList = ({
  items,
  loading = false,
  canViewMontants = true,
  onView,
  onEdit,
  onPrint,
  onChangeStatus,
  onDelete,
}: BonsCommandesListProps) => {
  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div key={index} variants={itemVariants}>
            <BonCommandeCardSkeleton delay={index * 0.1} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (!items || items.length === 0) {
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
          <Package className="w-10 h-10 text-white/60" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white/80 mb-2"
        >
          Aucun bon de commande
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sky-100/70 text-sm"
        >
          Créez votre premier bon de commande en cliquant sur le bouton ci-dessus.
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-20"
    >
      <AnimatePresence mode="popLayout">
        {items.map((bc, index) => (
          <motion.div key={bc.id_bon_commande} variants={itemVariants} layout exit="exit">
            <BonCommandeCard
              bonCommande={bc}
              canViewMontants={canViewMontants}
              onView={onView}
              onEdit={onEdit}
              onPrint={onPrint}
              onChangeStatus={onChangeStatus}
              onDelete={onDelete}
              delay={index * 0.05}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
