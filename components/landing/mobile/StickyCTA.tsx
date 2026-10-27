'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * Barre CTA fixe en zone pouce (bas d'écran).
 * Apparaît après 40% du hero, disparaît quand le CTA final est à l'écran.
 */
export default function StickyCTA() {
  const t = useTranslations('landing');
  const [show, setShow] = useState(false);
  const [nearFinal, setNearFinal] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > window.innerHeight * 0.4);

      const finalEl = document.getElementById('cta-final');
      if (finalEl) {
        const r = finalEl.getBoundingClientRect();
        setNearFinal(r.top < window.innerHeight * 0.9);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && !nearFinal && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 inset-x-0 z-50"
        >
          <div
            className="bg-slate-900/95 backdrop-blur-md border-t border-white/10 px-4 pt-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            <div className="text-[11px] text-white/50 text-center mb-1.5">{t('mobile.stickyMicro')}</div>
            <Link
              href="/register"
              className="block w-full h-12 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-[15px] flex items-center justify-center shadow-cta active:scale-[.98] transition-all"
            >
              {t('mobile.createShop')}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
