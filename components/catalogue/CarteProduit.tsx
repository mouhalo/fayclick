/**
 * Carte produit Premium — Design marketplace ultra-moderne
 * Bordures scintillantes, micro-animations, overlay prix flottant
 * Optimise pour 3 colonnes mobile
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Camera } from 'lucide-react';
import { ProduitPublic } from '@/types/catalogue';
import { ProduitPublicGlobal } from '@/types/catalogues';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ModalCarrouselProduit from './ModalCarrouselProduit';

interface CarteProduitProps {
  produit: ProduitPublic | ProduitPublicGlobal;
  index: number;
  showStructureName?: boolean;
  onAcheter?: (produit: ProduitPublic | ProduitPublicGlobal) => void;
}

export default function CarteProduit({ produit, index, showStructureName = false, onAcheter }: CarteProduitProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const produitGlobal = produit as ProduitPublicGlobal;
  const hasStructureInfo = 'nom_structure' in produit && showStructureName;
  const photoUrl = produit.photos && produit.photos.length > 0
    ? produit.photos[0].url_photo
    : null;

  const formatPrix = (prix: number): string => {
    if (prix >= 1000000) return (prix / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (prix >= 10000) return (prix / 1000).toFixed(0) + 'K';
    return new Intl.NumberFormat('fr-SN').format(prix);
  };

  const enStock = produit.stock_disponible > 0;
  const stockBas = produit.stock_disponible > 0 && produit.stock_disponible <= 5;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: Math.min(index * 0.03, 0.3), type: 'spring', stiffness: 200, damping: 20 }}
        onClick={() => setShowModal(true)}
        className="carte-produit-premium relative group cursor-pointer"
      >
        {/* Bordure scintillante animee */}
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-400/40 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-border" />

        {/* Lueur de fond au hover */}
        <div className="absolute -inset-1 rounded-xl bg-emerald-500/0 group-hover:bg-emerald-500/10 blur-lg transition-all duration-500 pointer-events-none" />

        {/* Corps de la carte */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-white/[0.08] group-hover:border-emerald-400/30 transition-all duration-300">

          {/* Zone photo — aspect 4:5 pour compacite */}
          <div className="relative w-full aspect-[4/5] overflow-hidden">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={produit.nom_produit}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
                <Image
                  src="/images/logofayclick.png"
                  alt="FayClick"
                  width={60}
                  height={60}
                  className="object-contain opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-all duration-500"
                />
              </div>
            )}

            {/* Overlay gradient permanent — lisibilite prix */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Overlay hover lumineux */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Badge categorie — compact, coin haut droit */}
            {produit.nom_categorie && (
              <div className="absolute top-1.5 right-1.5 z-10">
                <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-sm shadow-lg shadow-emerald-500/25">
                  {produit.nom_categorie.length > 10 ? produit.nom_categorie.slice(0, 10) + '..' : produit.nom_categorie}
                </span>
              </div>
            )}

            {/* Badge photos multiples — coin haut gauche */}
            {produit.nombre_photos > 1 && (
              <div className="absolute top-1.5 left-1.5 z-10">
                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[8px] font-bold bg-black/50 text-white backdrop-blur-sm">
                  <Camera className="w-2.5 h-2.5" />
                  {produit.nombre_photos}
                </span>
              </div>
            )}

            {/* Zone prix + stock — ancree en bas de la photo */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 z-10">
              <div className="flex items-end justify-between">
                <div>
                  <span className="block text-sm sm:text-base font-black text-white drop-shadow-lg leading-none">
                    {formatPrix(produit.prix_vente)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-300/80 font-medium">FCFA</span>
                </div>
                {/* Stock a droite du prix */}
                {!enStock ? (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-red-500/80 text-white uppercase">
                    Epuise
                  </span>
                ) : stockBas ? (
                  <span className="px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-bold bg-orange-500/90 text-white animate-pulse">
                    {produit.stock_disponible} left
                  </span>
                ) : (
                  <span className="text-[8px] sm:text-[9px] text-white/50 font-medium">
                    x{produit.stock_disponible}
                  </span>
                )}
              </div>
            </div>

            {/* Reflet animé qui traverse la carte */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.06) 50%, transparent 55%)',
                animation: 'shimmer-sweep 2s ease-in-out infinite',
              }}
            />
          </div>

          {/* Zone infos — ultra compacte */}
          <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
            {/* Nom produit */}
            <h3 className="text-[10px] sm:text-xs font-semibold text-white/90 line-clamp-1 leading-tight">
              {produit.nom_produit}
            </h3>

            {/* Structure (catalogue global) */}
            {hasStructureInfo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/catalogue?id=${produitGlobal.id_structure}`);
                }}
                className="flex items-center gap-1 w-full group/store"
              >
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/30">
                  <span className="text-white text-[6px] sm:text-[7px] font-black">
                    {produitGlobal.nom_structure?.charAt(0)}
                  </span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-medium text-orange-300/70 truncate group-hover/store:text-orange-300 transition-colors">
                  {produitGlobal.nom_structure}
                </span>
              </button>
            )}

            {/* Bouton Acheter */}
            {onAcheter && enStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcheter(produit);
                }}
                className="w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-[9px] sm:text-[10px] font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/25"
              >
                <ShoppingBag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Acheter
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <ModalCarrouselProduit
        produit={produit}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
