/**
 * Composant carte produit pour le catalogue public
 * Design inspiré des cartes de facture publique
 */

'use client';

import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { ProduitPublic } from '@/types/catalogue';
import Image from 'next/image';

interface CarteProduitProps {
  produit: ProduitPublic;
  index: number;
}

export default function CarteProduit({ produit, index }: CarteProduitProps) {
  // Récupérer la première photo ou utiliser un placeholder
  const photoUrl = produit.photos && produit.photos.length > 0
    ? produit.photos[0].url_photo
    : null;

  // Formater le prix en FCFA
  const formatPrix = (prix: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(prix);
  };

  // Truncate description si trop longue
  const truncateDescription = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/30 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
    >
      {/* Photo du produit */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={produit.nom_produit}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Badge catégorie */}
        {produit.nom_categorie && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-500/90 text-white backdrop-blur-sm">
              {produit.nom_categorie}
            </span>
          </div>
        )}
      </div>

      {/* Contenu de la carte */}
      <div className="p-4 space-y-3">
        {/* Nom + ID */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
            {produit.nom_produit}
            <span className="text-sm text-gray-500 font-normal ml-1">
              (#{produit.id_produit})
            </span>
          </h3>
        </div>

        {/* Description */}
        {produit.description && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {truncateDescription(produit.description, 120)}
          </p>
        )}

        {/* Prix */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Prix</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatPrix(produit.prix_vente)}
            </span>
          </div>
        </div>

        {/* Indicateur photos multiples */}
        {produit.nombre_photos > 1 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>📷</span>
            <span>{produit.nombre_photos} photos</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}