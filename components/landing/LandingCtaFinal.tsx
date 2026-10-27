'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

/** CTA final miroir du hero : même libellé, même bleu. */
export default function LandingCtaFinal() {
  return (
    <section className="py-20 text-center" style={{ background: 'linear-gradient(to right, #0369a1, #0ea5e9)' }}>
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-landing-heading)' }}>
          Prêt à ouvrir votre boutique ?
        </h2>
        <p className="text-white/80 mb-8">2 minutes. Gratuit. Sans téléchargement.</p>
        <Link
          href="/register"
          className="inline-block bg-white rounded-lg px-10 h-14 leading-[56px] text-lg font-bold text-primary-700 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all hover:scale-[1.03] active:scale-95"
        >
          Créer ma boutique gratuite
        </Link>
      </motion.div>
    </section>
  );
}
