'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StructurePublique } from '@/types/marketplace';
import Image from 'next/image';
import { SkeletonCarteStructure } from './SkeletonCards';
import { useTranslations } from '@/hooks/useTranslations';

interface BoutiquesCarouselProps {
  structures: StructurePublique[];
  loading?: boolean;
}

export default function BoutiquesCarousel({ structures, loading = false }: BoutiquesCarouselProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('marketplace');

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleClick = (structure: StructurePublique) => {
    router.push(`/catalogue?id=${structure.id_structure}`);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <h2 className="text-white font-semibold text-sm">{t('carousel.popularShops')}</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCarteStructure key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (structures.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-6"
    >
      {/* Titre + Voir tout */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-white font-semibold text-sm">{t('carousel.popularShops')}</h2>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Carrousel — avatars circulaires Stitch */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 touch-pan-x"
      >
        {structures.map((structure, index) => (
          <motion.button
            key={structure.id_structure}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }}
            onClick={() => handleClick(structure)}
            className="flex flex-col items-center gap-1.5 snap-start flex-shrink-0 w-20 group"
          >
            {/* Avatar circulaire */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-emerald-400/50 transition-all bg-slate-700">
              {structure.logo_structure ? (
                <Image
                  src={structure.logo_structure}
                  alt={structure.nom_structure}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
                  <span className="text-white font-bold text-lg">
                    {structure.nom_structure?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Nom boutique */}
            <span className="text-[10px] text-white/60 text-center line-clamp-1 w-full font-medium group-hover:text-white/80 transition-colors">
              {structure.nom_structure}
            </span>

            {/* Nombre produits */}
            <span className="text-[9px] text-emerald-400/60">
              {structure.total_produits} prod.
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
