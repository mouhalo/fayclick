'use client';

import { motion } from 'framer-motion';
import { Store, ShoppingBag, Zap } from 'lucide-react';
import Image from 'next/image';
import LogoFayclick from '@/components/ui/LogoFayclick';
import MarketplaceSearchBar from './MarketplaceSearchBar';
import { MarketplaceStats, StructurePublique } from '@/types/marketplace';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { marketplaceImages } from '@/lib/marketplace-images';

interface MarketplaceHeroProps {
  stats: MarketplaceStats;
  livesCount?: number;
  onSelectStructure?: (structure: StructurePublique) => void;
}

export default function MarketplaceHero({ stats, livesCount = 0, onSelectStructure }: MarketplaceHeroProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className="mb-6 space-y-4">
      {/* Top bar mobile — Logo + badge Live */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <LogoFayclick className="w-8 h-8" />
            <span className="text-white font-bold text-sm">FayClick</span>
          </div>
          {livesCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-red-300 text-[10px] font-bold">{livesCount} Live{livesCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Barre de recherche */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MarketplaceSearchBar variant="hero" onSelectStructure={onSelectStructure} />
      </motion.div>

      {/* Stats en pilules horizontales — style Stitch */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0">
          <Store className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-white font-bold text-sm leading-none">{stats.total_structures}</p>
            <p className="text-white/40 text-[10px]">BOUTIQUES</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-white font-bold text-sm leading-none">{stats.total_vedettes || 0}</p>
            <p className="text-white/40 text-[10px]">AVEC CATALOGUE</p>
          </div>
        </div>
      </motion.div>

      {/* Hero banner desktop */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl p-8 lg:p-12"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-emerald-900/80 to-teal-900" />
          {/* Image hero — cat_hero_banner.png fournie par infographiste */}
          <Image
            src={marketplaceImages.heroBanner}
            alt="Marketplace FayClick"
            fill
            className="object-cover object-right opacity-70"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-slate-900/20" />

          <div className="relative z-10 max-w-lg">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-4">
              Marketplace Premium
            </span>
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
              Les meilleurs commercants{' '}
              <span className="text-emerald-400 italic">du Senegal</span>
            </h1>
            <p className="text-white/60 text-sm mb-6">
              Decouvrez la marketplace premium pour FayClick. Qualite et authenticite garanties.
            </p>
            <button
              onClick={() => {
                const section = document.getElementById('boutiques-vedettes');
                section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              Explorer les boutiques
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
