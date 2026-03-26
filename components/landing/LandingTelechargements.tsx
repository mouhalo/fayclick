'use client';

import { motion } from 'framer-motion';
import { PWA_ADVANTAGES, BROWSER_GUIDES } from './landing-data';

export default function LandingTelechargements() {
  return (
    <section id="telechargements" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,0.08),transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] text-emerald-300 uppercase tracking-wider mb-4">
            Aucun store requis
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3.5 leading-tight" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Utilisez FayClick<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">de n&apos;importe où</span>
          </h2>
          <p className="text-base text-white/50 max-w-[580px] mx-auto leading-relaxed">
            FayClick est une application web progressive (PWA). Ouvrez votre navigateur et c&apos;est parti — aucun téléchargement obligatoire. Pour une expérience native, ajoutez-la à votre écran d&apos;accueil.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-9"
          >
            <div className="flex items-center gap-3 mb-7">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl">🌐</div>
              <h3 className="text-lg font-bold text-white">Pourquoi c&apos;est mieux</h3>
            </div>
            <div className="space-y-5">
              {PWA_ADVANTAGES.map((adv, i) => (
                <motion.div
                  key={adv.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.3 }}
                  className="flex gap-3.5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring', bounce: 0.5 }}
                    className="w-8 h-8 min-w-[32px] bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold"
                  >
                    ✓
                  </motion.div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">{adv.title}</div>
                    <div className="text-xs text-white/40 leading-relaxed">{adv.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-9"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-center text-xl">📲</div>
              <div>
                <h3 className="text-lg font-bold text-white">Installer sur votre écran</h3>
                <div className="text-[11px] text-white/40">Optionnel — pour une expérience native</div>
              </div>
            </div>
            <div className="space-y-3.5 mt-7">
              {BROWSER_GUIDES.map((guide, i) => (
                <motion.div
                  key={guide.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.3 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-4"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-7 h-7 bg-gradient-to-br ${guide.iconGradient} rounded-full flex items-center justify-center text-[13px] font-extrabold text-white`}>
                      {guide.icon}
                    </div>
                    <div className="text-sm font-semibold text-white">{guide.name}</div>
                    {guide.recommended && (
                      <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">Recommandé</div>
                    )}
                  </div>
                  <div className="text-xs text-white/50 leading-[1.8]">
                    {guide.steps.map((step, si) => (
                      <div key={si}>
                        <span className="text-emerald-400">{si + 1}.</span> {step}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-emerald-500/[0.08] border border-emerald-500/15 rounded-[14px]">
            <span className="text-xl">💡</span>
            <span className="text-sm text-emerald-200">
              Vous pouvez commencer à utiliser FayClick <strong className="text-white">maintenant</strong> — sans rien installer. Juste votre navigateur.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
