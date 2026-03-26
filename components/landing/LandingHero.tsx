'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { STATS_DATA } from './landing-data';

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');
  const numericMatch = value.match(/(\d+)/);

  useEffect(() => {
    if (!isInView || !numericMatch) {
      if (!numericMatch) setDisplay(value);
      return;
    }
    const target = parseInt(numericMatch[1]);
    const prefix = value.slice(0, value.indexOf(numericMatch[1]));
    const suffix = value.slice(value.indexOf(numericMatch[1]) + numericMatch[1].length);
    let start = 0;
    const step = target / 90;
    const animate = () => {
      start += step;
      if (start >= target) {
        setDisplay(`${prefix}${target}${suffix}`);
        return;
      }
      setDisplay(`${prefix}${Math.floor(start)}${suffix}`);
      requestAnimationFrame(animate);
    };
    animate();
  }, [isInView, value, numericMatch]);

  return <div ref={ref}>{display}</div>;
}

export default function LandingHero() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ['#34d399', '#2dd4bf', '#10b981', '#6ee7b7', '#a7f3d0'];
    setParticles(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 5 + 3,
        duration: Math.random() * 7 + 8,
        delay: Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    );
  }, []);

  const titleWords = ['Gérez', 'votre', 'commerce'];

  return (
    <section id="hero" className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(20,184,166,0.1),transparent_50%)]" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full will-change-transform"
            style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color, opacity: 0.4 }}
            animate={{ y: [100, -1000], opacity: [0, 0.6, 0.6, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
          />
        ))}
      </div>

      <div className="h-20" />

      <div className="flex-1 flex items-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="flex items-center justify-between gap-12">
            <div className="max-w-[550px]">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-300 mb-6"
              >
                <span>🇸🇳</span> La Super App des Marchands du Sénégal
              </motion.div>

              <h1 className="mb-5" style={{ fontFamily: 'var(--font-landing-heading)' }}>
                <span className="block text-[44px] font-extrabold leading-[1.1] text-white">
                  {titleWords.map((word, i) => (
                    <motion.span
                      key={word}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                      className="inline-block mr-3"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="block text-[44px] font-extrabold leading-[1.1] bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
                >
                  depuis votre téléphone
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="text-base text-white/50 leading-relaxed mb-8"
              >
                Stocks, ventes, clients, paiements mobile money — tout dans une seule app. Gratuit pour commencer, sans téléchargement obligatoire.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="flex items-center gap-4"
              >
                <Link
                  href="/register"
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[15px] font-bold rounded-full shadow-[0_8px_32px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-emerald-500 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Commencer gratuitement →
                </Link>
                <button className="flex items-center gap-3 px-6 py-3.5 border border-white/20 rounded-full text-sm text-white/70 hover:bg-white/5 hover:border-white/30 transition-all duration-300">
                  <span className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs">▶</span>
                  Voir la démo
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="flex items-center gap-8 mt-10"
              >
                {STATS_DATA.map((stat, i) => (
                  <div key={stat.label} className="flex items-center gap-8">
                    {i > 0 && <div className="w-px h-10 bg-white/10" />}
                    <div>
                      <div className="text-[28px] font-extrabold text-emerald-400">
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <div className="text-xs text-white/40">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.2),transparent_70%)] scale-150" />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-[220px] h-[380px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-[32px] border-2 border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="p-4 pt-10 text-[11px]">
                  <div className="text-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-xl mx-auto mb-2 flex items-center justify-center font-bold text-xs text-white">FC</div>
                    <div className="font-semibold text-white text-xs">Dashboard</div>
                  </div>
                  <div className="bg-emerald-500/15 rounded-xl p-3 mb-2">
                    <div className="text-[9px] text-white/50">Ventes du jour</div>
                    <div className="text-lg font-extrabold text-emerald-400">125 000 F</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-white">23</div>
                      <div className="text-[8px] text-white/40">Clients</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-white">156</div>
                      <div className="text-[8px] text-white/40">Produits</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 text-center pb-6"
      >
        <div className="text-[11px] text-white/30 mb-2">Défiler pour découvrir</div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/20 rounded-xl mx-auto relative"
        >
          <div className="w-1 h-2 bg-emerald-400 rounded-full absolute top-1.5 left-1/2 -translate-x-1/2" />
        </motion.div>
      </motion.div>
    </section>
  );
}
