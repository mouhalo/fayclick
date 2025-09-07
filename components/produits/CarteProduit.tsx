/**
 * Composant CarteProduit - Nouvelle version selon design Samsung A10
 * Affichage complet avec prix, stock, catégorie, description selon image de référence
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tag, 
  Package,
  ShoppingCart,
  Edit,
  Trash2,
  Check,
  Minus,
  Plus,
  QrCode,
  Smartphone,
  Info
} from 'lucide-react';
import { Produit } from '@/types/produit';

interface CarteProduitProps {
  produit: Produit;
  onEdit: (produit: Produit) => void;
  onDelete: (id: number) => void;
  onAddToCart: (produit: Produit, quantity: number) => void;
  typeStructure: string;
  compactMode?: boolean;
}

export function CarteProduit({ 
  produit, 
  onEdit, 
  onDelete, 
  onAddToCart, 
  typeStructure, 
  compactMode = false 
}: CarteProduitProps) {
  const [quantity, setQuantity] = useState(1);

  // Calculs des données
  const prixVente = produit?.prix_vente || 0;
  const niveauStock = produit?.niveau_stock || 0;
  const nomCategorie = produit?.nom_categorie || 'Non classé';
  const description = produit?.description || 'Aucune description';
  
  // Formatage des montants avec séparateurs de milliers
  const formatMontant = (montant: number) => {
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  // Gestion de la quantité
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= niveauStock) {
      setQuantity(newQuantity);
    }
  };

  // Actions
  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= niveauStock) {
      onAddToCart(produit, quantity);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-sky-100/30 backdrop-blur-md rounded-xl p-4 shadow-lg shadow-sky-500/10 hover:bg-sky-100/40 hover:shadow-xl hover:shadow-sky-500/20 transition-all duration-200 border border-sky-200/50"
    >
      {/* Header avec nom et check vert - exactement comme l'image */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-lg leading-tight pr-2">
            {produit?.nom_produit || 'Produit sans nom'}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <Check className="w-6 h-6 text-green-500" />
        </div>
      </div>

      {/* Section Prix et Stock en grille horizontale */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Prix */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100/30 backdrop-blur-sm rounded-lg">
            <Tag className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <span className="text-sm text-blue-800/90 font-medium">Prix</span>
            <div className="font-bold text-blue-900 text-base">
              {formatMontant(prixVente)}
            </div>
          </div>
        </div>
        
        {/* Stock */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100/30 backdrop-blur-sm rounded-lg">
            <Package className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <span className="text-sm text-green-800/90 font-medium">Stock</span>
            <div className="font-bold text-green-900 text-base">
              {niveauStock} unités
            </div>
          </div>
        </div>
      </div>

      {/* Section Catégorie avec icône smartphone bleue */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100/30 backdrop-blur-sm rounded-lg">
          <Smartphone className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <span className="text-sm text-blue-800/90 font-medium">Catégorie</span>
          <div className="font-bold text-blue-900 text-base">
            {nomCategorie}
          </div>
        </div>
      </div>

      {/* Section Description avec icône info orange */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100/30 backdrop-blur-sm rounded-lg">
          <Info className="w-5 h-5 text-orange-700" />
        </div>
        <div>
          <span className="text-sm text-orange-800/90 font-medium">Description</span>
          <div className="font-medium text-orange-900 text-base leading-relaxed">
            {description}
          </div>
        </div>
      </div>

      {/* Contrôles de quantité - exactement comme l'image */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-full border-2 border-sky-300/50 bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-5 h-5 text-slate-700" />
          </motion.button>

          <div className="text-xl font-bold text-slate-900 min-w-[2rem] text-center">
            {quantity}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= niveauStock}
            className="w-10 h-10 rounded-full border-2 border-sky-300/50 bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-5 h-5 text-slate-700" />
          </motion.button>
        </div>

        {/* 3 boutons d'actions circulaires comme dans l'image */}
        <div className="flex items-center gap-2">
          {/* Bouton QR Code bleu */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
            title="QR Code"
          >
            <QrCode className="w-5 h-5" />
          </motion.button>
          
          {/* Bouton Éditer vert */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(produit)}
            className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
            title="Modifier"
          >
            <Edit className="w-5 h-5" />
          </motion.button>
          
          {/* Bouton Supprimer rouge */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(produit.id_produit)}
            className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Bouton Ajouter au panier - pleine largeur comme dans l'image */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAddToCart}
        disabled={niveauStock === 0 || quantity > niveauStock}
        className="w-full bg-blue-600/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
      >
        <ShoppingCart className="w-5 h-5" />
        Ajouter
      </motion.button>

      {/* Message stock insuffisant */}
      {niveauStock === 0 && (
        <p className="text-sm text-red-500 text-center mt-2 font-medium">
          Rupture de stock
        </p>
      )}
    </motion.div>
  );
}

interface CarteProduitSkeletonProps {
  compactMode?: boolean;
}

export function CarteProduitSkeleton({ compactMode }: CarteProduitSkeletonProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
      </div>

      {/* Sections d'informations */}
      <div className="space-y-4 mb-6">
        {/* Prix */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-12 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </div>
        </div>

        {/* Stock */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-12 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
          </div>
        </div>

        {/* Catégorie */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
        </div>

        {/* Description */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="w-8 h-6 bg-gray-200 rounded"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Bouton */}
      <div className="w-full h-12 bg-gray-200 rounded-lg"></div>
    </div>
  );
}