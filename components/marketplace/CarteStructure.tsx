'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin } from 'lucide-react';
import Image from 'next/image';
import { CarteStructureProps } from '@/types/marketplace';
import { useTranslations } from '@/hooks/useTranslations';

const FALLBACK = '/images/mascotte.png';

export default function CarteStructure({ structure, index, onClick }: CarteStructureProps) {
  const t = useTranslations('marketplace');
  const logoSrc = structure.logo_structure && structure.logo_structure.startsWith('http')
    ? structure.logo_structure
    : FALLBACK;
  const [src, setSrc] = useState(logoSrc);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick(structure)}
      className="flex-shrink-0 w-36 snap-start group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 hover:bg-white/15 hover:border-emerald-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
        {/* Logo rond */}
        <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-white/20 group-hover:border-emerald-400/40 transition-colors flex items-center justify-center">
          <Image
            src={src}
            alt={structure.nom_structure}
            width={56}
            height={56}
            className="object-cover w-full h-full"
            onError={() => setSrc(FALLBACK)}
          />
        </div>

        {/* Nom */}
        <p className="text-white text-xs font-semibold text-center line-clamp-1 mb-1">
          {structure.nom_structure}
        </p>

        {/* Adresse */}
        {structure.adresse && (
          <p className="text-emerald-200/50 text-[9px] text-center line-clamp-1 mb-1">
            <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
            {structure.adresse}
          </p>
        )}

        {/* Badge produits */}
        <div className="flex items-center justify-center gap-1 text-emerald-300/70 text-[10px] mb-1">
          <Package className="w-3 h-3" />
          <span>{structure.total_produits > 1 ? t('structure.productPlural', { count: structure.total_produits }) : t('structure.productSingular', { count: structure.total_produits })}</span>
        </div>

        {/* Bouton Voir */}
        <div className="py-1 px-3 rounded-lg bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 text-[11px] font-medium text-center group-hover:bg-emerald-500/30 transition-colors">
          {t('structure.view')}
        </div>
      </div>
    </motion.button>
  );
}
