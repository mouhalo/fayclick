/**
 * Carte produit — Design Stitch marketplace
 * Photo carree dominante, nom + prix en dessous, bouton Acheter vert
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Camera, Flame } from 'lucide-react';
import { ProduitPublic } from '@/types/catalogue';
import { ProduitPublicGlobal } from '@/types/catalogues';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ModalCarrouselProduit from './ModalCarrouselProduit';
import { formatNomCategorie } from '@/lib/format-categorie';

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
    return new Intl.NumberFormat('fr-SN').format(prix);
  };

  const enStock = produit.stock_disponible > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4) }}
        className="group"
      >
        <div className="rounded-2xl overflow-hidden bg-slate-800/80 border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-300">

          {/* Zone photo — carree comme Stitch */}
          <div
            className="relative w-full aspect-square overflow-hidden cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={produit.nom_produit}
                fill
                sizes="(max-width: 480px) 50vw, (max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                <Image
                  src="/images/logofayclick.png"
                  alt="FayClick"
                  width={48}
                  height={48}
                  className="object-contain opacity-15"
                />
              </div>
            )}

            {/* Badge promo — coin haut gauche */}
            {produit.en_promo && (
              <div className="absolute top-2 left-2 z-10">
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-orange-500 text-white shadow-lg">
                  <Flame className="w-3 h-3" />
                  Promo
                </span>
              </div>
            )}

            {/* Badge photos multiples */}
            {!produit.en_promo && produit.nombre_photos > 1 && (
              <div className="absolute top-2 left-2 z-10">
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/50 text-white backdrop-blur-sm">
                  <Camera className="w-3 h-3" />
                  {produit.nombre_photos}
                </span>
              </div>
            )}

            {/* Badge epuise */}
            {!enStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/90 text-white uppercase">
                  Rupture de stock
                </span>
              </div>
            )}
          </div>

          {/* Zone infos — sous la photo */}
          <div className="p-3 space-y-2">
            {/* Nom produit */}
            <h3
              className="text-sm font-semibold text-white line-clamp-2 leading-snug cursor-pointer hover:text-emerald-300 transition-colors"
              onClick={() => setShowModal(true)}
            >
              {produit.nom_produit}
            </h3>

            {/* Categorie */}
            {produit.nom_categorie && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {formatNomCategorie(produit.nom_categorie)}
              </span>
            )}

            {/* Prix */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-400 leading-none">
                {formatPrix(produit.prix_vente)}
              </span>
              <span className="text-[10px] text-emerald-400/60 font-medium">FCFA</span>
            </div>

            {/* Structure (catalogue global) */}
            {hasStructureInfo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/catalogue?id=${produitGlobal.id_structure}`);
                }}
                className="flex items-center gap-1.5 w-full"
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[7px] font-black">
                    {produitGlobal.nom_structure?.charAt(0)}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-white/40 truncate hover:text-orange-300 transition-colors">
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
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
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
