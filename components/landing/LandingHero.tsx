'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { STATS_DATA } from './landing-data';

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const numericMatch = value.match(/(\d+)/);
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
  }, [isInView, value]);

  return <div ref={ref}>{display}</div>;
}

export default function LandingHero() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; color: string }>>([]);

  useEffect(() => {
    // Particules plafonnées à 8 (perf) : émeraude + bleu (thème)
    const colors = ['#34d399', '#38bdf8', '#2dd4bf', '#6ee7b7'];
    setParticles(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: 8 + i * 12,
        size: 3 + (i % 3),
        duration: 11 + (i % 5) * 2,
        delay: (i * 1.9) % 9,
        color: colors[i % colors.length],
      }))
    );
  }, []);

  const titleWords = ['Votre', 'boutique'];

  return (
    <section id="hero" className="relative min-h-screen flex flex-col overflow-hidden bg-slate-950">
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at 30% 50%, rgba(14,165,233,0.14), transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.10), transparent 55%)
        `,
      }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            <div className="max-w-[560px]">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-300 mb-6"
              >
                <span>🇸🇳</span> La Super App des Marchands du Sénégal
              </motion.div>

              <h1 className="mb-5" style={{ fontFamily: 'var(--font-landing-heading)' }}>
                <span className="block text-[44px] font-extrabold leading-[1.08] text-white">
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
                  className="block text-[44px] font-extrabold leading-[1.08] bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent"
                >
                  dans votre poche
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="text-base text-white/50 leading-relaxed mb-8 max-w-[480px]"
              >
                Ventes, stocks, clients et mobile money — tout dans une seule app. Gratuit pour commencer, sans téléchargement.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="flex items-center gap-4"
              >
                <Link
                  href="/register"
                  className="px-8 h-12 flex items-center bg-primary-500 hover:bg-primary-600 text-white text-[15px] font-bold rounded-lg shadow-cta transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Créer ma boutique gratuite
                </Link>
                <button
                  type="button"
                  aria-label="Voir comment ça marche"
                  onClick={() => document.getElementById('fonctionnement')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-3 px-6 h-12 border border-white/20 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:border-white/30 transition-all duration-300"
                >
                  <span className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs">↓</span>
                  Voir comment ça marche
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
                      <div className="fc-stat text-[32px] leading-none text-sky-400">
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <div className="text-xs text-white/40 mt-1.5">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Mockup téléphone : écran Vente Flash */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="relative hidden xl:block shrink-0"
            >
              <div className="absolute inset-0 scale-150 rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.22), transparent 70%)' }} />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-[230px] h-[392px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-[32px] border-2 border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/20 rounded-full" />
                <div className="mt-4 px-3 py-2.5 flex items-center justify-between bg-primary-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    <span className="text-white font-bold text-xs">Vente Flash</span>
                  </div>
                  <span className="text-white/80 text-[10px]">Caisse #1</span>
                </div>
                <div className="p-3 text-[11px] space-y-2">
                  {[
                    { name: 'Riz parfumé 5kg', detail: '2 × 3 000 F', total: '6 000 F' },
                    { name: 'Huile végétale 1L', detail: '1 × 1 500 F', total: '1 500 F' },
                    { name: 'Sucre 1kg', detail: '5 × 1 000 F', total: '5 000 F' },
                  ].map((line) => (
                    <div key={line.name} className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold text-xs">{line.name}</div>
                        <div className="text-white/40 text-[10px]">{line.detail}</div>
                      </div>
                      <div className="text-white font-bold text-xs">{line.total}</div>
                    </div>
                  ))}
                  <div className="rounded-lg p-3 bg-emerald-500/15 border border-emerald-500/25 text-center">
                    <div className="text-[9px] text-white/50 uppercase tracking-wider">Total à encaisser</div>
                    <div className="fc-stat text-2xl text-emerald-400 leading-tight">12 500 F</div>
                  </div>
                  <div className="h-10 rounded-lg bg-primary-500 flex items-center justify-center font-bold text-xs text-white shadow-cta">Encaisser</div>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <Image src="/images/wave.png" alt="Wave" width={44} height={16} className="h-4 w-auto" />
                    <Image src="/images/om.png" alt="Orange Money" width={44} height={16} className="h-4 w-auto" />
                    <Image src="/images/free.png" alt="Free Money" width={44} height={16} className="h-4 w-auto" />
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
          <div className="w-1 h-2 bg-sky-400 rounded-full absolute top-1.5 left-1/2 -translate-x-1/2" />
        </motion.div>
      </motion.div>
    </section>
  );
}
