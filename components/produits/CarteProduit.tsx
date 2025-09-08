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
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';

interface CarteProduitProps {
  produit: Produit;
  onEdit: (produit: Produit) => void;
  onDelete: (id: number) => void;
  typeStructure: string;
  compactMode?: boolean;
}

export function CarteProduit({ 
  produit, 
  onEdit, 
  onDelete, 
  typeStructure, 
  compactMode = false 
}: CarteProduitProps) {
  const [quantity, setQuantity] = useState(1);
  const { addArticle } = usePanierStore();
  const { success: showSuccessToast } = useToast();

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
      // Le produit est déjà au bon format pour ArticlePanier
      
      // Ajouter au panier via le store
      for (let i = 0; i < quantity; i++) {
        addArticle(produit);
      }
      
      // Toast de succès
      showSuccessToast(
        'Article ajouté !', 
        `${quantity} x ${produit.nom_produit} ajouté${quantity > 1 ? 's' : ''} au panier`
      );
      
      // Reset de la quantité
      setQuantity(1);
    }
  };

  return (
    <motion.div
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        transition: { type: "spring" as const, stiffness: 300, damping: 20 }
      }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-black/10 hover:bg-white/95 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 border border-gray-200/50 relative overflow-hidden"
    >
      {/* Effet de brillance subtil */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-emerald-100/20 pointer-events-none" />
      
      <div className="relative z-10">
      {/* Header avec nom et check vert - exactement comme l'image */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight pr-2">
            {produit?.nom_produit || 'Produit sans nom'}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.3 }}
            className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        </div>
      </div>

      {/* Section Prix et Stock en grille horizontale */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Prix */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-200">
            <Tag className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-sm text-gray-600 font-medium">Prix</span>
            <div className="font-bold text-gray-900 text-base">
              {formatMontant(prixVente)}
            </div>
          </div>
        </div>
        
        {/* Stock */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-xl border border-green-200">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <span className="text-sm text-gray-600 font-medium">Stock</span>
            <div className="font-bold text-gray-900 text-base">
              {niveauStock} unités
            </div>
          </div>
        </div>
      </div>

      {/* Section Catégorie avec icône smartphone */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-blue-100 rounded-xl border border-blue-200">
          <Smartphone className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <span className="text-sm text-gray-600 font-medium">Catégorie</span>
          <div className="font-bold text-gray-900 text-base">
            {nomCategorie}
          </div>
        </div>
      </div>

      {/* Section Description avec icône info */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-100 rounded-xl border border-orange-200">
          <Info className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <span className="text-sm text-gray-600 font-medium">Description</span>
          <div className="font-medium text-gray-800 text-base leading-relaxed">
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
            className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Minus className="w-5 h-5 text-gray-600" />
          </motion.button>

          <div className="text-xl font-bold text-gray-900 min-w-[2rem] text-center">
            {quantity}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= niveauStock}
            className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>

        {/* 3 boutons d'actions circulaires */}
        <div className="flex items-center gap-2">
          {/* Bouton QR Code */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 5 }}
            className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
            title="QR Code"
          >
            <QrCode className="w-5 h-5" />
          </motion.button>
          
          {/* Bouton Éditer */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: -5 }}
            onClick={() => onEdit(produit)}
            className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors"
            title="Modifier"
          >
            <Edit className="w-5 h-5" />
          </motion.button>
          
          {/* Bouton Supprimer */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 5 }}
            onClick={() => onDelete(produit.id_produit)}
            className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Bouton Ajouter au panier */}
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAddToCart}
        disabled={niveauStock === 0 || quantity > niveauStock}
        className="w-full bg-emerald-500 text-white py-4 px-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        <ShoppingCart className="w-5 h-5" />
        Ajouter au panier
      </motion.button>

      {/* Message stock insuffisant */}
      {niveauStock === 0 && (
        <p className="text-sm text-red-600 text-center mt-3 font-medium">
          Rupture de stock
        </p>
      )}
      
      </div> {/* Fermeture de relative z-10 */}
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
