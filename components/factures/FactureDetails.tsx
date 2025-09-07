/**
 * Composant détails dépliable d'une facture avec design glassmorphism
 * Affiche les articles/produits de la vente avec animations
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, ShoppingBag } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { FactureComplete } from '@/types/facture';
import { formatAmount } from '@/lib/utils';

interface FactureDetailsProps {
  facture: FactureComplete;
  isExpanded: boolean;
  onToggle: () => void;
}

export function FactureDetails({ facture, isExpanded, onToggle }: FactureDetailsProps) {
  const { details, resume } = facture;

  return (
    <div className="space-y-3">
      {/* Bouton pour déplier/replier */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        className="
          w-full flex items-center justify-between p-3
          bg-white/10 backdrop-blur-lg rounded-lg
          border border-white/20 hover:bg-white/20
          transition-all duration-200 text-left
        "
      >
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-emerald-200" />
          <span className="text-white text-sm font-medium">
            Détails ({resume.nombre_articles} article{resume.nombre_articles > 1 ? 's' : ''})
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-emerald-200 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </motion.button>

      {/* Contenu dépliable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <GlassCard className="p-4 space-y-3">
              {/* Résumé des détails */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/20">
                <div className="text-center">
                  <p className="text-xs text-emerald-200 font-medium">Quantité totale</p>
                  <p className="text-white text-sm font-bold">{resume.quantite_totale}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-emerald-200 font-medium">Marge totale</p>
                  <p className="text-white text-sm font-bold">{formatAmount(resume.marge_totale)}</p>
                </div>
              </div>

              {/* Liste des articles */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-200" />
                  <span className="text-emerald-100 text-sm font-medium">Articles</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {details.map((detail, index) => (
                    <motion.div
                      key={detail.id_detail}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className="
                        bg-white/5 backdrop-blur-sm p-3 rounded-lg
                        border border-white/10 hover:bg-white/10
                        transition-colors duration-200
                      "
                    >
                      <div className="flex justify-between items-start">
                        {/* Nom du produit */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate">
                            {detail.nom_produit}
                          </h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-emerald-200">
                              Qté: {detail.quantite}
                            </span>
                            <span className="text-xs text-emerald-200">
                              Prix: {formatAmount(detail.prix)}
                            </span>
                          </div>
                        </div>

                        {/* Sous-total */}
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-white text-sm font-bold">
                            {formatAmount(detail.sous_total)}
                          </p>
                          {detail.marge > 0 && (
                            <p className="text-xs text-cyan-300">
                              +{formatAmount(detail.marge)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Barre de progression pour visualiser la contribution */}
                      <div className="mt-2">
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${(detail.sous_total / facture.facture.montant) * 100}%` 
                            }}
                            transition={{ delay: (index * 0.1) + 0.3, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Total récapitulatif */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="
                  bg-gradient-to-r from-emerald-500/20 to-cyan-500/20
                  backdrop-blur-lg p-3 rounded-lg border border-white/20
                  mt-4
                "
              >
                <div className="flex justify-between items-center">
                  <span className="text-emerald-100 text-sm font-medium">
                    Total facture
                  </span>
                  <span className="text-white text-lg font-bold">
                    {formatAmount(facture.facture.montant)}
                  </span>
                </div>
              </motion.div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}