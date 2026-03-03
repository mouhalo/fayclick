'use client';

import { motion } from 'framer-motion';
import { Package, Store, Tags } from 'lucide-react';
import LogoFayclick from '@/components/ui/LogoFayclick';
import MarketplaceSearchBar from './MarketplaceSearchBar';
import { MarketplaceStats, StructurePublique } from '@/types/marketplace';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface MarketplaceHeroProps {
  stats: MarketplaceStats;
  onSelectStructure?: (structure: StructurePublique) => void;
}

export default function MarketplaceHero({ stats, onSelectStructure }: MarketplaceHeroProps) {
  const { isMobile } = useBreakpoint();

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="relative overflow-hidden rounded-3xl shadow-2xl p-5 md:p-8 mb-6"
    >
      {/* Background glassmorphe */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

      {/* Effet prismatique anime */}
      <motion.div
        animate={{
          background: [
            'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
            'linear-gradient(135deg, transparent 0%, rgba(20, 184, 166, 0.15) 50%)',
            'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Bordure lumineuse */}
      <div className="absolute inset-0 rounded-3xl border border-white/30 shadow-inner" />

      <div className="text-center relative z-10">
        {/* Logo FayClick reduit */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
          className="inline-flex items-center justify-center mb-3"
        >
          <LogoFayclick className={isMobile ? "w-16 h-16" : "w-20 h-20"} />
        </motion.div>

        {/* Slogan */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-white drop-shadow-lg mb-1`}
        >
          FayClick Marketplace
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-100 drop-shadow mb-5`}
        >
          Trouvez un marchand par nom ou telephone
        </motion.p>

        {/* Barre de recherche */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-5"
        >
          <MarketplaceSearchBar variant="hero" onSelectStructure={onSelectStructure} />
        </motion.div>

        {/* 3 stats badges animes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center justify-center gap-3 md:gap-5 flex-wrap"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30"
          >
            <Package className="w-3.5 h-3.5 text-emerald-200" />
            <span className="font-bold text-emerald-100 text-xs md:text-sm">
              {stats.total_produits} produit{stats.total_produits > 1 ? 's' : ''}
            </span>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 backdrop-blur-sm rounded-full border border-teal-400/30"
          >
            <Store className="w-3.5 h-3.5 text-teal-200" />
            <span className="font-bold text-teal-100 text-xs md:text-sm">
              {stats.total_structures} boutique{stats.total_structures > 1 ? 's' : ''}
            </span>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 backdrop-blur-sm rounded-full border border-sky-400/30"
          >
            <Tags className="w-3.5 h-3.5 text-sky-200" />
            <span className="font-bold text-sky-100 text-xs md:text-sm">
              {stats.total_categories} categorie{stats.total_categories > 1 ? 's' : ''}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
