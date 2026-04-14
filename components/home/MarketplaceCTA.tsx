'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { marketplaceSearchService } from '@/services/marketplace-search.service';
import { MarketplaceStats } from '@/types/marketplace';
import { useTranslations } from '@/hooks/useTranslations';

interface MarketplaceCTAProps {
  variant: 'mobile' | 'desktop';
}

export default function MarketplaceCTA({ variant }: MarketplaceCTAProps) {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const t = useTranslations('landing');

  useEffect(() => {
    marketplaceSearchService.getStats().then(setStats).catch(() => {});
  }, []);

  const isMobile = variant === 'mobile';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.7, duration: 0.8 }}
      className={`${isMobile ? 'w-full max-w-sm mb-4' : 'max-w-4xl mx-auto my-12'}`}
    >
      <div className={`relative overflow-hidden border border-orange-400/30 ${isMobile ? 'p-3' : 'p-6 md:p-8'}`}
        style={{
          borderRadius: isMobile ? '25px' : '16px',
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(251, 146, 60, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Effet brillance */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className={`relative z-10 ${!isMobile ? 'flex items-center gap-8' : ''}`}>
          {/* Texte + stats */}
          <div className={`${!isMobile ? 'flex-1' : 'text-center'}`}>
            <div className={`flex items-center ${isMobile ? 'justify-center' : ''} gap-2 mb-2`}>
              <Store className="w-5 h-5 text-orange-300" />
              <h3 className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-white`}>
                {t('marketplaceCta.title')}
              </h3>
            </div>

            <p className={`text-emerald-200/80 ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
              {t('marketplaceCta.subtitle')}
            </p>

            {/* Stats live */}
            {stats && (stats.total_produits > 0 || stats.total_structures > 0) && (
              <div className={`flex items-center ${isMobile ? 'justify-center' : ''} gap-3 ${isMobile ? 'mb-4' : 'mb-0'}`}>
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full text-emerald-200 text-[11px] font-medium border border-emerald-400/20">
                  <Package className="w-3 h-3" />
                  {t('marketplaceCta.statsProducts')}
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-teal-500/20 rounded-full text-teal-200 text-[11px] font-medium border border-teal-400/20">
                  <Store className="w-3 h-3" />
                  {t('marketplaceCta.statsShops', { count: stats.total_structures })}
                </span>
              </div>
            )}
          </div>

          {/* Bouton CTA */}
          <Link href="/catalogues" className={`${isMobile ? 'block' : 'flex-shrink-0'}`}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`${isMobile ? 'w-full' : ''} px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold ${isMobile ? 'text-sm' : 'text-base'} shadow-lg flex items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer`}
              style={{ borderRadius: '25px' }}
            >
              {t('marketplaceCta.button')}
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
