/**
 * Composant TableProduits - Vue tableau des produits
 * Format : # (image + catégorie) | Nom produit | Stock dispo | Action (Vendre)
 */

'use client';

import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Produit } from '@/types/produit';

interface TableProduitsProps {
  produits: Produit[];
  onProduitClick: (produit: Produit) => void;
  onVendreClick: (produit: Produit) => void;
}

export function TableProduits({
  produits,
  onProduitClick,
  onVendreClick
}: TableProduitsProps) {

  // Fonction pour obtenir le niveau de stock avec couleur
  const getStockLevel = (stock: number | undefined) => {
    const stockValue = stock || 0;
    if (stockValue === 0) {
      return { label: 'Épuisé', color: 'text-red-600 bg-red-50' };
    } else if (stockValue < 10) {
      return { label: `${stockValue} (Faible)`, color: 'text-orange-600 bg-orange-50' };
    } else if (stockValue < 50) {
      return { label: `${stockValue}`, color: 'text-blue-600 bg-blue-50' };
    }
    return { label: `${stockValue}`, color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
      {/* En-tête du tableau */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 font-semibold text-sm">
          <div className="col-span-2">#</div>
          <div className="col-span-5">Nom produit</div>
          <div className="col-span-3 text-center">Stock dispo</div>
          <div className="col-span-2 text-center">Action</div>
        </div>
      </div>

      {/* Corps du tableau */}
      <div className="divide-y divide-gray-100">
        {produits.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-lg">Aucun produit trouvé</p>
          </div>
        ) : (
          produits.map((produit, index) => {
            const stockLevel = getStockLevel(produit.niveau_stock);

            return (
              <motion.div
                key={produit.id_produit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onProduitClick(produit)}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-green-50/50 transition-colors cursor-pointer group"
              >
                {/* Colonne # : Image + Catégorie */}
                <div className="col-span-2 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 group-hover:border-green-400 transition-colors flex items-center justify-center">
                    <img
                      src="/images/logofayclick.png"
                      alt="Logo FayClick"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <span className="text-xs text-gray-600 font-medium text-center">
                    {produit.nom_categorie || 'Sans catégorie'}
                  </span>
                </div>

                {/* Colonne Nom produit */}
                <div className="col-span-5 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    {produit.nom_produit}
                  </h3>
                  {produit.description && (
                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                      {produit.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-medium text-gray-700">
                      {produit.prix_vente.toLocaleString('fr-FR')} FCFA
                    </span>
                    {produit.code_barre && (
                      <span className="text-xs text-gray-400 font-mono">
                        {produit.code_barre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Colonne Stock dispo */}
                <div className="col-span-3 flex items-center justify-center">
                  <div className={`px-4 py-2 rounded-full font-semibold text-sm ${stockLevel.color}`}>
                    {stockLevel.label}
                  </div>
                </div>

                {/* Colonne Action : Bouton Vendre */}
                <div className="col-span-2 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVendreClick(produit);
                    }}
                    disabled={!produit.niveau_stock || produit.niveau_stock === 0}
                    className={`
                      p-3 rounded-lg font-medium flex items-center justify-center
                      transition-all shadow-md hover:shadow-lg
                      ${!produit.niveau_stock || produit.niveau_stock === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      }
                    `}
                    title={!produit.niveau_stock || produit.niveau_stock === 0 ? 'Stock épuisé' : 'Ajouter au panier'}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton pour le chargement de la vue tableau
 */
export function TableProduitsSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 font-semibold text-sm">
          <div className="col-span-2">#</div>
          <div className="col-span-5">Nom produit</div>
          <div className="col-span-3 text-center">Stock dispo</div>
          <div className="col-span-2 text-center">Action</div>
        </div>
      </div>

      {/* Lignes skeleton */}
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 animate-pulse">
            {/* Image + Catégorie */}
            <div className="col-span-2 flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>

            {/* Nom produit */}
            <div className="col-span-5 flex flex-col justify-center gap-2">
              <div className="w-3/4 h-5 bg-gray-200 rounded"></div>
              <div className="w-full h-3 bg-gray-200 rounded"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            </div>

            {/* Stock */}
            <div className="col-span-3 flex items-center justify-center">
              <div className="w-24 h-8 bg-gray-200 rounded-full"></div>
            </div>

            {/* Action */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="w-24 h-10 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
