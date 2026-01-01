'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Trophy, ChevronDown } from 'lucide-react';
import type { TopArticle } from '@/types/inventaire.types';

interface TopArticlesCardProps {
  articles: TopArticle[];
  defaultExpanded?: boolean;
}

/**
 * Carte dépliable affichant le top 5 des meilleurs articles/produits vendus
 * Design compact en zone répétée pour une meilleure lisibilité
 */
export default function TopArticlesCard({ articles, defaultExpanded = true }: TopArticlesCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Couleurs des badges de rang
  const getRangeBadgeColor = (rang: number) => {
    switch (rang) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  };

  // Calcul du total pour l'aperçu
  const totalMontant = articles?.reduce((acc, a) => acc + a.montant_total, 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header cliquable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-gray-800">Meilleurs articles</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {articles?.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="text-xs text-emerald-600 font-semibold">
              {totalMontant.toLocaleString('fr-FR')} F
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Liste des articles - Zone répétée dépliable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {articles && articles.length > 0 ? (
              <div className="divide-y divide-gray-50 px-4 pb-4">
                {articles.map((article, index) => (
                  <motion.div
                    key={article.rang}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="py-2.5 first:pt-0 last:pb-0"
                  >
                    {/* Ligne principale */}
                    <div className="flex items-center gap-2">
                      {/* Badge rang compact */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${getRangeBadgeColor(article.rang)}`}>
                        {article.rang}
                      </div>

                      {/* Nom produit - prend tout l'espace */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm leading-tight" title={article.nom_produit}>
                          {article.nom_produit}
                        </p>
                      </div>

                      {/* Montant */}
                      <div className="flex-shrink-0">
                        <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                          {article.montant_total.toLocaleString('fr-FR')} F
                        </p>
                      </div>
                    </div>

                    {/* Ligne secondaire - détails */}
                    <div className="flex items-center justify-between mt-1 ml-8">
                      <span className="text-xs text-gray-500">
                        {article.nombre_ventes} vente{article.nombre_ventes > 1 ? 's' : ''} • {article.quantite_totale} unité{article.quantite_totale > 1 ? 's' : ''}
                      </span>
                      {article.nom_categorie && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {article.nom_categorie}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Package className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Aucun article vendu</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
