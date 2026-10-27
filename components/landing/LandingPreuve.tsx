'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, PackageCheck, ShieldCheck, Star } from 'lucide-react';
import { TESTIMONIALS, GAMIFICATION_BADGES } from './landing-data';

const BADGE_ICONS = { trophy: Trophy, 'package-check': PackageCheck, 'shield-check': ShieldCheck } as const;
const BADGE_COLORS = {
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  sky: 'bg-primary-500',
  teal: 'bg-teal-500',
} as const;

/** Preuve sociale : témoignages + badges gamification + marketplace. */
export default function LandingPreuve() {
  return (
    <section id="preuve" className="relative bg-slate-950 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-5 gap-10 items-start">
        {/* Témoignages */}
        <div className="col-span-3 space-y-5">
          <div className="text-xs font-bold tracking-[0.2em] mb-2 text-sky-400">ILS VENDENT DÉJÀ AVEC FAYCLICK</div>
          <h2 className="text-4xl font-extrabold text-white mb-8" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Le marché vous dira le reste
          </h2>

          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-white/[0.06] backdrop-blur-md border border-white/10 border-l-[3px] border-l-emerald-500 rounded-lg p-6 shadow-card"
            >
              <div className="flex gap-1 mb-3 text-amber-400 text-sm">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="text-white/80 text-sm leading-relaxed mb-4">{t.quote}</blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-bold">
                  {t.initials}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.location}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* Badges gamification + marketplace */}
        <div className="col-span-2 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-lg p-6 shadow-card"
          >
            <h3 className="font-bold text-lg text-white mb-5" style={{ fontFamily: 'var(--font-landing-heading)' }}>
              Ils brillent avec FayClick
            </h3>
            <div className="space-y-4">
              {GAMIFICATION_BADGES.map((badge) => {
                const Icon = BADGE_ICONS[badge.icon];
                const color = badge.colorClass;
                return (
                  <div key={badge.label} className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-card text-white ${BADGE_COLORS[color]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${
                        color === 'emerald' ? 'text-emerald-300' : color === 'sky' ? 'text-sky-300' : 'text-teal-300'
                      }`}>
                        {badge.label}
                      </div>
                      <div className="text-white/40 text-xs">{badge.holder}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Marketplace (orange réservé ici) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 p-5 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 text-xl">
              🛍️
            </div>
            <div className="flex-1">
              <div className="text-sm text-white/80">
                <span className="fc-stat text-orange-300">+3 000</span> produits ·{' '}
                <span className="fc-stat text-orange-300">+100</span> boutiques
              </div>
              <Link href="/catalogues" className="text-xs font-semibold text-orange-300 hover:text-orange-200">
                Découvrir la marketplace →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
