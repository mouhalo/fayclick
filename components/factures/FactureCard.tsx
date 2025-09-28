/**
 * Composant FactureCard avec design glassmorphism
 * Card moderne inspirée de la capture d'écran fournie
 * Intégration avec ModalFacturePrivee - suppression du système dépliable
 */

'use client';

import { motion } from 'framer-motion';
import { Eye, Receipt, CreditCard, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FactureComplete } from '@/types/facture';
import { formatAmount, formatDate, cn } from '@/lib/utils';

interface FactureCardProps {
  facture: FactureComplete;
  onVoirDetailsModal?: (facture: FactureComplete) => void;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
  onVoirRecu?: (facture: FactureComplete) => void;
  onSupprimer?: (facture: FactureComplete) => void;
  delay?: number;
}

export const FactureCard = ({
  facture,
  onVoirDetailsModal,
  onAjouterAcompte,
  onPartager,
  onVoirRecu,
  onSupprimer,
  delay = 0
}: FactureCardProps) => {
  const { facture: factureData } = facture;

  const handleVoirDetails = () => {
    onVoirDetailsModal?.(facture);
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
        type: "spring" as const,
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
          {/* Configuration des boutons selon le statut */}
          {factureData.libelle_etat === 'IMPAYEE' ? (
            <>
              {/* Bouton Voir */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleVoirDetails}
                className={cn(
                  'flex-1 flex items-center justify-center',
                  'px-2 py-2.5 rounded-lg',
                  'bg-white/20 backdrop-blur-lg',
                  'border border-white/30',
                  'text-white text-sm font-medium',
                  'hover:bg-white/30 hover:scale-105',
                  'transition-all duration-200',
                  'shadow-lg'
                )}
              >
                <Eye className="w-4 h-4 mr-1" />
                Voir
              </motion.button>

              {/* Bouton Supprimer */}
              {onSupprimer && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSupprimer(facture)}
                  className={cn(
                    'flex-1 flex items-center justify-center',
                    'px-2 py-2.5 rounded-lg',
                    'bg-red-500/90 backdrop-blur-lg',
                    'border border-red-400/50',
                    'text-white text-sm font-medium',
                    'hover:bg-red-500 hover:scale-105',
                    'transition-all duration-200',
                    'shadow-lg shadow-red-500/20'
                  )}
                  title="Supprimer la facture"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Sup.
                </motion.button>
              )}

              {/* Bouton Payer */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAjouterAcompte?.(facture)}
                className={cn(
                  'flex-1 flex items-center justify-center',
                  'px-2 py-2.5 rounded-lg',
                  'bg-orange-500 hover:bg-orange-600',
                  'border border-orange-400',
                  'text-white text-sm font-medium',
                  'hover:scale-105',
                  'transition-all duration-200',
                  'shadow-lg'
                )}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Payer
              </motion.button>
            </>
          ) : (
            <>
              {/* Bouton Voir pour factures payées */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleVoirDetails}
                className={cn(
                  'flex-1 flex items-center justify-center',
                  'px-3 py-2.5 rounded-lg',
                  'bg-green-500 hover:bg-green-600',
                  'border border-green-400',
                  'text-white text-sm font-medium',
                  'hover:scale-105',
                  'transition-all duration-200',
                  'shadow-lg'
                )}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Voir
              </motion.button>

              {/* Bouton Reçu pour factures payées */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onVoirRecu?.(facture)}
                className={cn(
                  'flex-1 flex items-center justify-center',
                  'px-3 py-2.5 rounded-lg',
                  'bg-blue-500 hover:bg-blue-600',
                  'border border-blue-400',
                  'text-white text-sm font-medium',
                  'hover:scale-105',
                  'transition-all duration-200',
                  'shadow-lg'
                )}
                title="Voir le reçu de paiement"
              >
                <Receipt className="w-4 h-4 mr-1.5" />
                Reçu
              </motion.button>
            </>
          )}
        </div>

        {/* Effet de brillance sur hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
      </GlassCard>
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
      <div className="
        bg-white/90 backdrop-blur-xl rounded-2xl p-4 animate-pulse
        border border-white/20 shadow-lg
      ">
        <div className="flex justify-between mb-3">
          <div>
            <div className="h-5 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="h-6 bg-gray-300 rounded-full w-16"></div>
        </div>

        <div className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-28 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>

        <div className="text-center mb-4">
          <div className="h-8 bg-gray-300 rounded w-40 mx-auto"></div>
        </div>

        <div className="flex space-x-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </motion.div>
  );
};