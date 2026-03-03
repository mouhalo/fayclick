'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StructurePublique } from '@/types/marketplace';
import CarteStructure from './CarteStructure';
import { SkeletonCarteStructure } from './SkeletonCards';

interface BoutiquesCarouselProps {
  structures: StructurePublique[];
  loading?: boolean;
}

export default function BoutiquesCarousel({ structures, loading = false }: BoutiquesCarouselProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <Store className="w-5 h-5 text-emerald-300" />
          <h2 className="text-white font-semibold text-sm md:text-base">Nos boutiques</h2>
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
      transition={{ delay: 0.3 }}
      className="mb-6"
    >
      {/* Titre avec boutons navigation desktop */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-300" />
          <h2 className="text-white font-semibold text-sm md:text-base">Nos boutiques</h2>
          <span className="text-emerald-300/60 text-xs">({structures.length})</span>
        </div>

        {/* Boutons fleches desktop */}
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

      {/* Carrousel scroll horizontal natif */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 touch-pan-x"
      >
        {structures.map((structure, index) => (
          <CarteStructure
            key={structure.id_structure}
            structure={structure}
            index={index}
            onClick={handleClick}
          />
        ))}
      </div>
    </motion.div>
  );
}
