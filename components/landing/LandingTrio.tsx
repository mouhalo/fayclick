'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Smartphone, Package, ChevronRight } from 'lucide-react';
import { TRIO_BENEFITS, SECONDARY_FEATURES, PROFILS_CIBLES } from './landing-data';

const TRIO_ICONS = { zap: Zap, smartphone: Smartphone, package: Package } as const;
const TRIO_COLORS = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky: 'bg-sky-500/15 text-sky-400',
  teal: 'bg-teal-500/15 text-teal-400',
} as const;

/** Section « Votre journée, en 3 gestes » : règle des 3 + fonctionnalités secondaires en chips. */
export default function LandingTrio() {
  return (
    <section id="fonctionnement" className="relative bg-slate-900 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-14">
          <div className="text-xs font-bold tracking-[0.2em] mb-3 text-sky-400">PENSÉ POUR LE TERRAIN</div>
          <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Votre journée, en 3 gestes
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Chaque carte répond à un problème de tous les jours. Cliquez : votre boutique est à 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          {TRIO_BENEFITS.map((benefit, i) => {
            const Icon = TRIO_ICONS[benefit.icon];
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <Link
                  href="/register"
                  className="group block h-full bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-lg p-8 shadow-card hover:border-sky-500/40 transition-all hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 ${TRIO_COLORS[benefit.colorClass]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="italic text-white/50 text-sm mb-3">{benefit.problem}</p>
                  <h3 className="font-bold text-xl text-white mb-2" style={{ fontFamily: 'var(--font-landing-heading)' }}>
                    {benefit.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-5">{benefit.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                    Je veux ça <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bandeau profils */}
        <div className="border-y border-white/5 py-4 flex items-center justify-center gap-3 text-sm text-white/40 mb-14">
          {PROFILS_CIBLES.map((p, i) => (
            <span key={p} className="flex items-center gap-3">
              {i > 0 && <span className="text-white/15">·</span>}
              {p}
            </span>
          ))}
        </div>

        {/* Fonctionnalités secondaires en chips */}
        <div className="text-center">
          <h3 className="font-bold text-xl text-white/80 mb-6" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Tout le reste est déjà dedans
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {SECONDARY_FEATURES.map((f) => (
              <span key={f} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
