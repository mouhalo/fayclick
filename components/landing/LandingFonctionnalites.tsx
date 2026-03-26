'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FEATURES_DATA } from './landing-data';

const COLOR_MAP: Record<string, { bg: string; border: string; hoverBorder: string; shadow: string }> = {
  emerald: { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', hoverBorder: 'group-hover:border-emerald-500/30', shadow: 'group-hover:shadow-emerald-500/10' },
  amber:   { bg: 'from-amber-500/20 to-amber-500/5',     border: 'border-amber-500/20',   hoverBorder: 'group-hover:border-amber-500/30',   shadow: 'group-hover:shadow-amber-500/10' },
  blue:    { bg: 'from-blue-500/20 to-blue-500/5',       border: 'border-blue-500/20',    hoverBorder: 'group-hover:border-blue-500/30',    shadow: 'group-hover:shadow-blue-500/10' },
  purple:  { bg: 'from-purple-500/20 to-purple-500/5',   border: 'border-purple-500/20',  hoverBorder: 'group-hover:border-purple-500/30',  shadow: 'group-hover:shadow-purple-500/10' },
  teal:    { bg: 'from-teal-500/20 to-teal-500/5',       border: 'border-teal-500/20',    hoverBorder: 'group-hover:border-teal-500/30',    shadow: 'group-hover:shadow-teal-500/10' },
  rose:    { bg: 'from-rose-500/20 to-rose-500/5',       border: 'border-rose-500/20',    hoverBorder: 'group-hover:border-rose-500/30',    shadow: 'group-hover:shadow-rose-500/10' },
  yellow:  { bg: 'from-yellow-500/20 to-yellow-500/5',   border: 'border-yellow-500/20',  hoverBorder: 'group-hover:border-yellow-500/30',  shadow: 'group-hover:shadow-yellow-500/10' },
  violet:  { bg: 'from-violet-500/20 to-violet-500/5',   border: 'border-violet-500/20',  hoverBorder: 'group-hover:border-violet-500/30',  shadow: 'group-hover:shadow-violet-500/10' },
};

export default function LandingFonctionnalites() {
  return (
    <section id="fonctionnalites" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0c1a2e] to-slate-900" />
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(rgba(16,185,129,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] text-emerald-300 uppercase tracking-wider mb-4">
            Tout-en-un
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3.5 leading-tight" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Tout ce dont votre<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">commerce a besoin</span>
          </h2>
          <p className="text-base text-white/50 max-w-[500px] mx-auto leading-relaxed">
            Une seule application pour remplacer cahier, calculatrice et carnet d&apos;adresses.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-5 max-w-[1050px] mx-auto">
          {FEATURES_DATA.map((feat, i) => {
            const colors = COLOR_MAP[feat.colorClass] || COLOR_MAP.emerald;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 + Math.floor(i / 3) * 0.15, duration: 0.4 }}
                className={`group bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-[18px] p-7 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${colors.hoverBorder} hover:shadow-lg ${colors.shadow}`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-[14px] flex items-center justify-center text-[22px] mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full text-[15px] font-bold text-white shadow-[0_8px_32px_rgba(16,185,129,0.3)] hover:from-emerald-400 hover:to-emerald-500 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Découvrir toutes les fonctionnalités →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
