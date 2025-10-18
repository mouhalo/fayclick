'use client';

import { motion } from 'framer-motion';
import { Package, Trophy } from 'lucide-react';
import Image from 'next/image';
import type { TopArticle } from '@/types/inventaire.types';

interface TopArticlesCardProps {
  articles: TopArticle[];
}

/**
 * Carte affichant le top 5 des meilleurs articles/produits vendus
 */
export default function TopArticlesCard({ articles }: TopArticlesCardProps) {
  // Couleurs des badges de rang
  const getRangeBadgeColor = (rang: number) => {
    switch (rang) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Meilleurs articles</h3>
      </div>

      {/* Liste des articles */}
      {articles && articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article, index) => (
            <motion.div
              key={article.rang}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {/* Badge de rang */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRangeBadgeColor(article.rang)}`}>
                {article.rang}
              </div>

              {/* Image produit */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center overflow-hidden">
                <Image
                  src="/default_product.png"
                  alt={article.nom_produit}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>

              {/* Informations produit */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{article.nom_produit}</p>
                <p className="text-xs text-gray-500">
                  {article.nombre_ventes} {article.nombre_ventes > 1 ? 'ventes' : 'vente'} • {article.quantite_totale} unités
                </p>
              </div>

              {/* Montant */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-emerald-600 text-sm">
                  {article.montant_total.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Package className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-sm">Aucun article vendu sur cette période</p>
        </div>
      )}
    </motion.div>
  );
}
