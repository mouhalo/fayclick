'use client';

import { motion } from 'framer-motion';
import { Tags, Phone, ArrowLeft, Package, MapPin, MessageCircle, CheckCircle, Heart } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { CatalogueResponse } from '@/types/catalogue';
import { useTranslations } from '@/hooks/useTranslations';

interface BoutiqueHeaderProps {
  catalogue: CatalogueResponse;
  totalCategories: number;
}

export default function BoutiqueHeader({ catalogue, totalCategories }: BoutiqueHeaderProps) {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const t = useTranslations('marketplace');

  const whatsappUrl = catalogue.telephone
    ? `https://wa.me/221${catalogue.telephone}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl shadow-2xl p-4 md:p-6 mb-6"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl" />
      <div className="absolute inset-0 rounded-3xl border border-white/20" />

      <div className="relative z-10">
        {/* Bouton retour */}
        <button
          onClick={() => router.push('/catalogues')}
          className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('boutiqueHeader.back')}
        </button>

        {/* Layout principal */}
        <div className={`flex ${isMobile ? 'flex-row items-start gap-3' : 'flex-row items-center gap-6'}`}>
          {/* Logo */}
          <div className={`flex-shrink-0 ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg`}>
            <Image
              src={catalogue.logo || '/images/mascotte.png'}
              alt={`Logo ${catalogue.nom_structure}`}
              width={96}
              height={96}
              className="object-contain w-full h-full"
            />
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            {/* Nom + badge verifie */}
            <div className="flex items-center gap-2 mb-1">
              <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white truncate`}>
                {catalogue.nom_structure}
              </h1>
              {/* Badge verifie — cat_badge_verified.svg */}
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            </div>

            {/* Localisation */}
            {catalogue.adresse && (
              <p className="flex items-center gap-1 text-white/40 text-xs mb-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {catalogue.adresse}
              </p>
            )}

            {/* Badges : contact + live — mobile */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {catalogue.telephone && (
                <a
                  href={`tel:+221${catalogue.telephone}`}
                  className="inline-flex items-center gap-1 text-emerald-200 hover:text-emerald-100 text-xs transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {catalogue.telephone}
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-[10px] font-semibold hover:bg-green-500/30 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  {t('boutiqueHeader.contact')}
                </a>
              )}
              {/* Badge Live — cat_badge_live.svg */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {t('boutiqueHeader.live')}
              </span>
            </div>

            {/* Stats + Suivre — desktop */}
            {!isMobile && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-400/20">
                  <Package className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-200 text-xs font-bold">{catalogue.total_produits}</span>
                  <span className="text-emerald-200/50 text-xs">{t('boutiqueHeader.products')}</span>
                </div>
                {totalCategories > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 rounded-full border border-teal-400/20">
                    <Tags className="w-3.5 h-3.5 text-teal-300" />
                    <span className="text-teal-200 text-xs font-bold">{totalCategories}</span>
                    <span className="text-teal-200/50 text-xs">{t('boutiqueHeader.categories')}</span>
                  </div>
                )}
                <button className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-full transition-colors">
                  <Heart className="w-3.5 h-3.5" />
                  {t('boutiqueHeader.follow')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
