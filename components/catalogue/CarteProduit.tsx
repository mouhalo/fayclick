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
import { ProduitPublicGlobal } from '@/types/catalogues';
import Image from 'next/image';
import ModalCarrouselProduit from './ModalCarrouselProduit';

interface CarteProduitProps {
  produit: ProduitPublic | ProduitPublicGlobal;
  index: number;
  showStructureName?: boolean;  // Afficher le nom de la structure (pour catalogue global)
}

export default function CarteProduit({ produit, index, showStructureName = false }: CarteProduitProps) {
  const [showModal, setShowModal] = useState(false);

  // Vérifier si le produit contient des informations de structure
  const produitGlobal = produit as ProduitPublicGlobal;
  const hasStructureInfo = 'nom_structure' in produit && showStructureName;
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
        className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 group cursor-pointer"
      >
        {/* Background glassmorphism multicouches */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl" />

        {/* Gradient vert/orange FayClick subtil */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-orange-500/5" />

        {/* Bordure glassmorphe */}
        <div className="absolute inset-0 rounded-2xl border border-white/60 shadow-inner" />

        {/* Effet prismatique vert/orange au hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 50%, rgba(251, 146, 60, 0.1) 100%)'
          }}
        />

        {/* Photo du produit - Plus grande avec effet glassmorphe */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-emerald-50/50 via-white/30 to-orange-50/50 overflow-hidden backdrop-blur-sm">
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
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/90 via-blue-50/50 to-purple-50/50">
              <Image
                src="/images/logofayclick.png"
                alt="FayClick Logo"
                width={120}
                height={120}
                className="object-contain opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500"
              />
            </div>
          )}

          {/* Overlay gradient glassmorphe au hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />

          {/* Badge catégorie glassmorphe */}
          {produit.nom_categorie && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="absolute top-3 right-3"
            >
              <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-br from-emerald-500/95 to-emerald-600/95 text-white backdrop-blur-md shadow-lg border border-emerald-400/40">
                {produit.nom_categorie}
              </span>
            </motion.div>
          )}

          {/* Indicateur photos multiples glassmorphe */}
          {produit.nombre_photos > 1 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="absolute top-3 left-3"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 text-gray-700 backdrop-blur-md shadow-lg border border-white/50 ring-1 ring-emerald-500/10">
                <span>📷</span>
                <span>{produit.nombre_photos}</span>
              </span>
            </motion.div>
          )}
        </div>

        {/* Contenu de la carte - Compact avec polices réduites */}
        <div className="p-2.5 space-y-2 relative z-10">
          {/* Prix et Stock en grille 2x1 */}
          <div className="grid grid-cols-2 gap-2">
            {/* Prix */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              className="flex flex-col"
            >
              <span className="text-[10px] text-gray-500 font-medium mb-0.5">Prix</span>
              <span className="text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent leading-tight">
                {formatPrix(produit.prix_vente)}
              </span>
            </motion.div>

            {/* Stock */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.25 }}
              className="flex flex-col"
            >
              <span className="text-[10px] text-gray-500 font-medium mb-0.5">Stock</span>
              <span className={`text-sm font-bold leading-tight ${
                produit.stock_disponible > 10
                  ? 'text-emerald-600'
                  : produit.stock_disponible > 0
                    ? 'text-orange-600'
                    : 'text-red-600'
              }`}>
                {produit.stock_disponible}
              </span>
            </motion.div>
          </div>

          {/* Nom du produit */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.25 }}
            className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight"
          >
            {produit.nom_produit}
          </motion.h3>

          {/* Description */}
          {produit.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.3 }}
              className="text-[10px] text-gray-600 line-clamp-1 leading-tight"
            >
              {truncateDescription(produit.description, 50)}
            </motion.p>
          )}

          {/* Nom de la structure (catalogue global uniquement) */}
          {hasStructureInfo && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.32 }}
              className="flex items-center gap-1.5 pt-1.5 border-t border-gray-200"
            >
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">
                    {produitGlobal.nom_structure?.charAt(0) || 'S'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-orange-700 truncate">
                  {produitGlobal.nom_structure}
                </span>
              </div>
            </motion.div>
          )}

          {/* ID discret */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.35 }}
            className="text-[9px] text-gray-400"
          >
            Réf. #{produit.id_produit}
          </motion.div>
        </div>

        {/* Effet de brillance glassmorphe au hover - Vert/Orange FayClick */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.15), rgba(251, 146, 60, 0.1), transparent)',
            transform: 'translateX(-100%) skewX(-20deg)',
          }}
          whileHover={{
            x: '200%',
            transition: { duration: 0.8, ease: 'easeInOut' }
          }}
        />

        {/* Reflet lumineux subtil au repos */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" />
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