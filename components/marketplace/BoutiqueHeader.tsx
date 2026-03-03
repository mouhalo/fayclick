'use client';

import { motion } from 'framer-motion';
import { Tags, Phone, ArrowLeft, Package } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { CatalogueResponse } from '@/types/catalogue';

interface BoutiqueHeaderProps {
  catalogue: CatalogueResponse;
  totalCategories: number;
}

export default function BoutiqueHeader({ catalogue, totalCategories }: BoutiqueHeaderProps) {
  const router = useRouter();
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

      {/* Effet prismatique */}
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
      <div className="absolute inset-0 rounded-3xl border border-white/30 shadow-inner" />

      <div className="relative z-10">
        {/* Bouton retour */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/catalogues')}
          className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Marketplace
        </motion.button>

        <div className="text-center">
          {/* Logo structure */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center mb-3"
          >
            <div className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32 md:w-36 md:h-36'} rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg`}>
              <Image
                src={catalogue.logo || '/images/mascotte.png'}
                alt={`Logo ${catalogue.nom_structure}`}
                width={140}
                height={140}
                className="object-contain w-full h-full"
              />
            </div>
          </motion.div>

          {/* Nom structure */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-white drop-shadow-lg mb-1`}
          >
            {catalogue.nom_structure}
          </motion.h1>

          {/* Telephone cliquable */}
          {catalogue.telephone && (
            <motion.a
              href={`tel:+221${catalogue.telephone}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-1.5 text-emerald-200 hover:text-emerald-100 text-sm mb-4 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {catalogue.telephone}
            </motion.a>
          )}

          {/* Badges stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30">
              <Package className="w-3.5 h-3.5 text-emerald-200" />
              <span className="font-bold text-emerald-100 text-xs">
                {catalogue.total_produits} produit{catalogue.total_produits > 1 ? 's' : ''}
              </span>
            </div>
            {totalCategories > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 backdrop-blur-sm rounded-full border border-teal-400/30">
                <Tags className="w-3.5 h-3.5 text-teal-200" />
                <span className="font-bold text-teal-100 text-xs">
                  {totalCategories} categorie{totalCategories > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
