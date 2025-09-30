/**
 * Composant carte produit pour le catalogue public
 * Design inspiré des cartes de facture publique
 * Avec modal carrousel premium au clic
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { ProduitPublic } from '@/types/catalogue';
import Image from 'next/image';
import ModalCarrouselProduit from './ModalCarrouselProduit';

interface CarteProduitProps {
  produit: ProduitPublic;
  index: number;
}

export default function CarteProduit({ produit, index }: CarteProduitProps) {
  const [showModal, setShowModal] = useState(false);
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setShowModal(true)}
        className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 group cursor-pointer"
      >
        {/* Effet prismatique au hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%, rgba(147, 51, 234, 0.1) 100%)'
          }}
        />

        {/* Photo du produit - Plus grande */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={produit.nom_produit}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-300" />
            </div>
          )}

          {/* Overlay gradient pour meilleure lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badge catégorie */}
          {produit.nom_categorie && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="absolute top-3 right-3"
            >
              <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/95 text-white backdrop-blur-md shadow-lg border border-blue-400/30">
                {produit.nom_categorie}
              </span>
            </motion.div>
          )}

          {/* Indicateur photos multiples */}
          {produit.nombre_photos > 1 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="absolute top-3 left-3"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 text-gray-700 backdrop-blur-md shadow-lg border border-white/40">
                <span>📷</span>
                <span>{produit.nombre_photos}</span>
              </span>
            </motion.div>
          )}
        </div>

        {/* Contenu de la carte - Plus compact et élégant */}
        <div className="p-4 space-y-3 relative z-10">
          {/* Prix en évidence */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.2 }}
                className="inline-flex items-baseline gap-2"
              >
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  {formatPrix(produit.prix_vente)}
                </span>
              </motion.div>
            </div>
          </div>

          {/* Nom du produit */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.25 }}
            className="text-base font-bold text-gray-900 line-clamp-2 leading-snug"
          >
            {produit.nom_produit}
          </motion.h3>

          {/* Description */}
          {produit.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.3 }}
              className="text-sm text-gray-600 line-clamp-2 leading-relaxed"
            >
              {truncateDescription(produit.description, 80)}
            </motion.p>
          )}

          {/* ID discret */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.35 }}
            className="text-xs text-gray-400"
          >
            Réf. #{produit.id_produit}
          </motion.div>
        </div>

        {/* Effet de brillance au hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            transform: 'translateX(-100%) rotate(45deg)',
          }}
          whileHover={{
            x: '200%',
            transition: { duration: 0.6 }
          }}
        />
      </motion.div>

    {/* Modal Carrousel Premium */}
    <ModalCarrouselProduit
      produit={produit}
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    />
    </>
  );
}