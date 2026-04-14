'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin } from 'lucide-react';
import Image from 'next/image';
import { StructureListItem } from '@/types/marketplace';

const FALLBACK = '/images/mascotte.png';

interface CarteBoutiqueVedetteProps {
  structure: StructureListItem;
  index: number;
  onClick: (structure: StructureListItem) => void;
}

export default function CarteBoutiqueVedette({ structure, index, onClick }: CarteBoutiqueVedetteProps) {
  const logoSrc = structure.logo && structure.logo.startsWith('http') ? structure.logo : FALLBACK;
  const [src, setSrc] = useState(logoSrc);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      onClick={() => onClick(structure)}
      className="group text-left w-full"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 hover:bg-white/10 hover:border-emerald-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
        {/* Badge statut */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              structure.actif
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                : 'bg-gray-500/20 border-gray-400/30 text-gray-300'
            }`}
          >
            {structure.actif ? 'Actif' : 'Off'}
          </span>
        </div>

        {/* Logo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl mx-auto mb-3 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-white/20 group-hover:border-emerald-400/40 transition-colors flex items-center justify-center">
          {src !== FALLBACK ? (
            <Image
              src={src}
              alt={structure.nom_structure}
              width={80}
              height={80}
              className="object-cover w-full h-full"
              onError={() => setSrc(FALLBACK)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
              <span className="text-white font-bold text-2xl">
                {structure.nom_structure?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Nom */}
        <p className="text-white text-sm font-semibold text-center line-clamp-2 mb-1">
          {structure.nom_structure}
        </p>

        {/* Adresse */}
        {structure.adresse && (
          <p className="text-white/50 text-[11px] text-center line-clamp-1 mb-1.5 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{structure.adresse}</span>
          </p>
        )}

        {/* Nb produits */}
        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mb-3">
          <Package className="w-3.5 h-3.5" />
          <span>{structure.nb_produits_publics} produit{structure.nb_produits_publics > 1 ? 's' : ''} en ligne</span>
        </div>

        {/* Bouton CTA */}
        <div className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 text-xs font-medium text-center group-hover:bg-emerald-500/30 transition-colors">
          Voir la boutique
        </div>
      </div>
    </motion.button>
  );
}
