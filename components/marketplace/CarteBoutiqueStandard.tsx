'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { StructureListItem } from '@/types/marketplace';

const FALLBACK = '/images/mascotte.png';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COMMERCIALE:  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
  SCOLAIRE:     { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-400/20' },
  IMMOBILIER:   { bg: 'bg-orange-500/10',   text: 'text-orange-300',  border: 'border-orange-400/20' },
  PRESTATAIRE:  { bg: 'bg-purple-500/10',   text: 'text-purple-300',  border: 'border-purple-400/20' },
};

function getTypeStyle(type: string | null) {
  if (!type) return { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-400/20' };
  const upper = type.toUpperCase();
  for (const [key, style] of Object.entries(TYPE_COLORS)) {
    if (upper.includes(key)) return style;
  }
  return { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-400/20' };
}

function getTypeLabel(type: string | null): string {
  if (!type) return 'Autre';
  const upper = type.toUpperCase();
  if (upper.includes('COMMERCIALE')) return 'Commerce';
  if (upper.includes('SCOLAIRE')) return 'Scolaire';
  if (upper.includes('IMMOBILIER')) return 'Immobilier';
  if (upper.includes('PRESTATAIRE')) return 'Prestataire';
  return type;
}

interface CarteBoutiqueStandardProps {
  structure: StructureListItem;
  index: number;
  onClick: (structure: StructureListItem) => void;
}

export default function CarteBoutiqueStandard({ structure, index, onClick }: CarteBoutiqueStandardProps) {
  const logoSrc = structure.logo && structure.logo.startsWith('http') ? structure.logo : FALLBACK;
  const [src, setSrc] = useState(logoSrc);
  const typeStyle = getTypeStyle(structure.type_structure);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      onClick={() => onClick(structure)}
      className="group text-left w-full"
    >
      <div className="overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300">
        {/* Logo */}
        <div className="w-14 h-14 rounded-lg mx-auto mb-2.5 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/15 group-hover:border-white/25 transition-colors flex items-center justify-center">
          {src !== FALLBACK ? (
            <Image
              src={src}
              alt={structure.nom_structure}
              width={56}
              height={56}
              className="object-cover w-full h-full"
              onError={() => setSrc(FALLBACK)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
              <span className="text-white/70 font-bold text-lg">
                {structure.nom_structure?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Nom */}
        <p className="text-white text-[13px] font-semibold text-center line-clamp-2 mb-1.5">
          {structure.nom_structure}
        </p>

        {/* Badge type */}
        <div className="flex justify-center mb-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
            {getTypeLabel(structure.type_structure)}
          </span>
        </div>

        {/* Adresse */}
        {structure.adresse && (
          <p className="text-white/40 text-[10px] text-center line-clamp-1 mb-2 flex items-center justify-center gap-0.5">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span>{structure.adresse}</span>
          </p>
        )}

        {/* Bouton CTA */}
        <div className="py-1 px-2 rounded-lg border border-white/20 text-white/60 text-[11px] font-medium text-center group-hover:border-white/30 group-hover:text-white/80 transition-colors">
          Voir
        </div>
      </div>
    </motion.button>
  );
}
