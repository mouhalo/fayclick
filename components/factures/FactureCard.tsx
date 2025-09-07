/**
 * Composant FactureCard avec design glassmorphism
 * Card moderne inspirée de la capture d'écran fournie
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, FileText, Phone, CreditCard } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FactureDetails } from './FactureDetails';
import { FactureComplete } from '@/types/facture';
import { formatAmount, formatDate, cn } from '@/lib/utils';

interface FactureCardProps {
  facture: FactureComplete;
  onVoirDetails?: (facture: FactureComplete) => void;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
  delay?: number;
}

export const FactureCard = ({ 
  facture, 
  onVoirDetails,
  onAjouterAcompte, 
  onPartager,
  delay = 0 
}: FactureCardProps) => {
  const { facture: factureData } = facture;
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const handleVoirDetails = () => {
    setIsDetailsExpanded(!isDetailsExpanded);
    onVoirDetails?.(facture);
  };

  // Animation variants pour la card
  const cardVariants = {
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
        type: "spring",
        stiffness: 100,
        damping: 12,
        delay,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
      className="w-full"
    >
      <GlassCard 
        variant="hover" 
        className="p-4 hover:scale-[1.02] transition-transform duration-200"
      >
        {/* En-tête avec numéro de facture et statut */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-lg tracking-wide">
              {factureData.num_facture}
            </h3>
            <p className="text-emerald-100 text-sm opacity-90">
              📞 {factureData.tel_client}
            </p>
          </div>
          
          <StatusBadge 
            status={factureData.libelle_etat} 
            size="md"
          />
        </div>

        {/* Informations client */}
        <div className="mb-4">
          <div className="flex items-center text-emerald-100 text-sm mb-1">
            <span className="mr-2">👤</span>
            <span className="font-medium">{factureData.nom_client}</span>
          </div>
          <div className="flex items-center text-emerald-100 text-sm">
            <span className="mr-2">📅</span>
            <span>{formatDate(factureData.date_facture)}</span>
          </div>
        </div>

        {/* Montant principal */}
        <div className="text-center mb-4">
          <p className="text-white text-2xl font-bold tracking-wide">
            {formatAmount(factureData.montant)}
          </p>
          {factureData.mt_restant > 0 && (
            <p className="text-orange-200 text-sm font-medium">
              Reste: {formatAmount(factureData.mt_restant)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {/* Bouton Voir détails */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleVoirDetails}
            className={cn(
              'flex-1 flex items-center justify-center',
              'px-3 py-2.5 rounded-lg',
              'bg-white/20 backdrop-blur-lg',
              'border border-white/30',
              'text-white text-sm font-medium',
              'hover:bg-white/30 hover:scale-105',
              'transition-all duration-200',
              'shadow-lg',
              isDetailsExpanded && 'bg-white/30'
            )}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            {isDetailsExpanded ? 'Masquer' : 'Voir détails'}
          </motion.button>

          {/* Action contextuelle selon le statut */}
          {factureData.libelle_etat === 'IMPAYEE' ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onAjouterAcompte?.(facture)}
              className={cn(
                'flex-1 flex items-center justify-center',
                'px-3 py-2.5 rounded-lg',
                'bg-orange-500/90 backdrop-blur-lg',
                'border border-orange-400/50',
                'text-white text-sm font-medium',
                'hover:bg-orange-500 hover:scale-105',
                'transition-all duration-200',
                'shadow-lg shadow-orange-500/20'
              )}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              Payer
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onPartager?.(facture)}
              className={cn(
                'flex-1 flex items-center justify-center',
                'px-3 py-2.5 rounded-lg',
                'bg-emerald-600/90 backdrop-blur-lg',
                'border border-emerald-500/50',
                'text-white text-sm font-medium',
                'hover:bg-emerald-600 hover:scale-105',
                'transition-all duration-200',
                'shadow-lg shadow-emerald-500/20'
              )}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              PDF
            </motion.button>
          )}
        </div>

        {/* Effet de brillance sur hover */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
      </GlassCard>

      {/* Détails dépliable */}
      {facture.details && facture.details.length > 0 && (
        <FactureDetails
          facture={facture}
          isExpanded={isDetailsExpanded}
          onToggle={() => setIsDetailsExpanded(!isDetailsExpanded)}
        />
      )}
    </motion.div>
  );
};

// Composant de loading skeleton
export const FactureCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="p-4 animate-pulse">
        <div className="flex justify-between mb-3">
          <div>
            <div className="h-5 bg-white/20 rounded w-32 mb-2"></div>
            <div className="h-4 bg-white/15 rounded w-24"></div>
          </div>
          <div className="h-6 bg-white/20 rounded-full w-16"></div>
        </div>
        
        <div className="mb-4">
          <div className="h-4 bg-white/15 rounded w-28 mb-1"></div>
          <div className="h-4 bg-white/15 rounded w-24"></div>
        </div>
        
        <div className="text-center mb-4">
          <div className="h-8 bg-white/20 rounded w-40 mx-auto"></div>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex-1 h-10 bg-white/15 rounded-lg"></div>
          <div className="flex-1 h-10 bg-white/15 rounded-lg"></div>
        </div>
      </GlassCard>
    </motion.div>
  );
};