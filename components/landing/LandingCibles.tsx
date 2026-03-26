'use client';

import { motion } from 'framer-motion';
import { CIBLES_DATA, PROFILS_CIBLES } from './landing-data';

export default function LandingCibles() {
  return (
    <section id="cibles" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-emerald-900/50 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] text-emerald-300 uppercase tracking-wider mb-4">
            À qui s&apos;adresse FayClick ?
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3.5 leading-tight" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Pensé pour les<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">marchands du Sénégal</span>
          </h2>
          <p className="text-base text-white/50 max-w-[550px] mx-auto leading-relaxed">
            Boutiquiers, commerçants de marché, vendeurs ambulants — FayClick s&apos;adapte à votre façon de travailler.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {CIBLES_DATA.map((card, i) => (
            <motion.div
              key={card.problem}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-8 relative overflow-hidden hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-2xl mb-5">
                {card.icon}
              </div>
              <div className="text-[11px] text-red-400 uppercase tracking-wider font-semibold mb-2">Le problème</div>
              <h3 className="text-[17px] font-bold text-white mb-2.5">{card.problem}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed mb-5">{card.problemDesc}</p>
              <div className="text-center mb-4">
                <motion.div
                  whileInView={{ scale: [1, 1.2, 1] }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
                  className="w-8 h-8 bg-emerald-500/15 rounded-full inline-flex items-center justify-center text-sm text-emerald-400"
                >
                  ↓
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                className="bg-emerald-500/[0.08] border border-emerald-500/15 rounded-[14px] p-4"
              >
                <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold mb-1.5">La solution FayClick</div>
                <div className="text-sm font-semibold text-emerald-200 mb-1">{card.solutionTitle}</div>
                <p className="text-xs text-white/40 leading-relaxed">{card.solutionDesc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-6 px-8 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
            {PROFILS_CIBLES.map((profil, i) => (
              <div key={profil} className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ delay: i * 0.3, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                />
                <span className="text-[13px] text-white/60">{profil}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
