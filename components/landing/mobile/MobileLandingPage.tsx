'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Zap, Smartphone, Package, ChevronRight, Gift, Globe, MessageCircle, ChevronDown } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import LogoFayclick from '@/components/ui/LogoFayclick';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslations } from '@/hooks/useTranslations';
import { VersionLabel } from '@/components/ui/VersionLabel';
import { TRIO_BENEFITS, SECONDARY_FEATURES, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '@/components/landing/landing-data';
import MarketplaceCTA from '@/components/home/MarketplaceCTA';
import StickyCTA from './StickyCTA';

const TRIO_ICONS = { zap: Zap, smartphone: Smartphone, package: Package } as const;
const TRIO_COLORS = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky: 'bg-sky-500/15 text-sky-400',
  teal: 'bg-teal-500/15 text-teal-400',
} as const;

/**
 * Landing mobile complète (<1024px) : l'ancien splash devient le hero
 * d'une page scrollable pensée pour l'enrôlement (zone pouce, CTA sticky).
 */
export default function MobileLandingPage() {
  const t = useTranslations('landing');
  const { isMobile } = useBreakpoint();
  const [particles] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: 8 + i * 12,
      size: 3 + (i % 3),
      duration: 10 + (i % 5) * 2,
      delay: (i * 1.7) % 8,
      color: i % 2 === 0 ? '#34d399' : '#38bdf8',
    }))
  );

  const logoSize = isMobile ? 'w-20 h-20' : 'w-24 h-24';

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden pb-28">
      {/* ═══ M1. HERO (ex-splash conservé + promesse) ═══ */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-slate-900"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(14,165,233,0.14), transparent 60%),
            radial-gradient(ellipse at 50% 80%, rgba(16,185,129,0.10), transparent 55%)
          `,
        }}
      >
        {/* Particules légères (8, plafonnées pour les téléphones modestes) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color, opacity: 0.4 }}
              animate={{ y: ['105vh', '-5vh'], opacity: [0, 0.5, 0.5, 0] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            />
          ))}
        </div>

        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher variant="compact" />
        </div>

        {/* Logo animé (aura + étincelles réduites) */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.35, delay: 0.15 }}
          className="relative mb-5"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.45) 0%, transparent 70%)', filter: 'blur(20px)' }}
          />
          <div className={`${logoSize} relative z-10 drop-shadow-2xl`}>
            <LogoFayclick className={logoSize} />
          </div>
        </motion.div>

        {/* Titre néon (conservé) */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="font-montserrat font-black text-4xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 mb-1"
          style={{ textShadow: '0 0 24px rgba(52,211,153,0.5)' }}
        >
          FayClick
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-white/50 text-sm mb-7"
        >
          {t('mobile.subtitle')}
        </motion.p>

        {/* Promesse + preuve */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="font-montserrat font-extrabold text-2xl leading-tight mb-2"
        >
          {t('mobile.heroH2a')}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">{t('mobile.heroH2b')}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-sm text-white/50 mb-2"
        >
          {t('mobile.heroSub')}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-sm mb-8"
        >
          <span className="fc-stat text-sky-300">1386+</span>{' '}
          <span className="text-white/50">{t('mobile.heroProof1')} · </span>
          <span className="fc-stat text-sky-300">100%</span>{' '}
          <span className="text-white/50">{t('mobile.heroProof2')}</span>
        </motion.p>

        {/* Boutons zone pouce, ≥48px, radius 8px */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="w-full max-w-xs space-y-3"
        >
          <Link
            href="/register"
            className="block w-full h-12 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-[15px] flex items-center justify-center shadow-cta active:scale-[.98] transition-all"
          >
            {t('mobile.createShop')}
          </Link>
          <Link
            href="/login"
            className="block w-full h-12 rounded-lg font-semibold text-sm border border-white/20 bg-white/5 backdrop-blur flex items-center justify-center text-white/90 active:bg-white/10 transition-colors"
          >
            {t('mobile.login')}
          </Link>
        </motion.div>

        {/* Indicateur scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-center"
        >
          <div className="text-[10px] uppercase tracking-widest mb-1">{t('mobile.discover')}</div>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ M2. BANDEAU STATS ═══ */}
      <section className="border-y border-white/5 bg-slate-950/60 py-6 px-4">
        <div className="grid grid-cols-3 text-center">
          <div>
            <div className="fc-stat text-2xl leading-none text-sky-400">1386+</div>
            <div className="text-[11px] text-white/40 mt-1">{t('mobile.statsMarchands')}</div>
          </div>
          <div className="border-x border-white/5">
            <div className="fc-stat text-2xl leading-none text-emerald-400">45 000+</div>
            <div className="text-[11px] text-white/40 mt-1">{t('mobile.statsVentes')}</div>
          </div>
          <div>
            <div className="fc-stat text-2xl leading-none text-sky-300">100%</div>
            <div className="text-[11px] text-white/40 mt-1">{t('mobile.statsGratuit')}</div>
          </div>
        </div>
      </section>

      {/* ═══ M3. TRIO BÉNÉFICES (lignes cliquables ≥88px) ═══ */}
      <section className="py-12 px-4">
        <div className="text-xs font-bold tracking-[0.2em] mb-2 text-sky-400">{t('mobile.kicker')}</div>
        <h2 className="font-montserrat font-extrabold text-2xl mb-6">{t('mobile.trioTitle')}</h2>

        <div className="space-y-3">
          {TRIO_BENEFITS.map((benefit) => {
            const Icon = TRIO_ICONS[benefit.icon];
            return (
              <Link
                key={benefit.title}
                href="/register"
                className="flex items-center gap-4 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-lg p-4 min-h-[88px] active:border-sky-500/50 transition-colors"
                aria-label={benefit.title}
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${TRIO_COLORS[benefit.colorClass]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="italic text-white/50 text-[11px] mb-0.5">{benefit.problem}</p>
                  <div className="font-bold text-sm">{benefit.title}</div>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-sky-400" />
              </Link>
            );
          })}
        </div>

        {/* Chips secondaires scrollables */}
        <div className="mt-6 -mx-4 px-4 overflow-x-auto flex gap-2 pb-1 no-scrollbar">
          {SECONDARY_FEATURES.map((f) => (
            <span key={f} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/70 whitespace-nowrap">
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ M4. COMMENT ÇA MARCHE (1·2·3 + mascotte) ═══ */}
      <section className="py-12 px-4 bg-slate-950/60">
        <h2 className="font-montserrat font-extrabold text-2xl mb-8">{t('mobile.stepsTitle')}</h2>
        <div className="relative">
          {/* Ligne verticale bleu → vert */}
          <div className="absolute left-[19px] top-3 bottom-10 w-0.5 rounded-full bg-gradient-to-b from-sky-500 to-emerald-500" />

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center fc-stat text-sm shrink-0 text-white">1</div>
              <div>
                <div className="font-bold text-sm">{t('mobile.steps.s1Title')}</div>
                <div className="text-white/50 text-xs">{t('mobile.steps.s1Desc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center fc-stat text-sm shrink-0 text-white">2</div>
              <div>
                <div className="font-bold text-sm">{t('mobile.steps.s2Title')}</div>
                <div className="text-white/50 text-xs">{t('mobile.steps.s2Desc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{t('mobile.steps.s3Title')}</div>
                <div className="text-white/50 text-xs">{t('mobile.steps.s3Desc')}</div>
              </div>
              {/* Mascotte qui guide l'œil vers le bas */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="shrink-0">
                <Image src="/images/mascotte.png" alt="Mascotte FayClick" width={56} height={56} className="object-contain" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ M5. MARKETPLACE (orange réservé) ═══ */}
      <section className="px-4 py-6">
        <MarketplaceCTA variant="mobile" />
      </section>

      {/* ═══ M6. OBJECTIONS ═══ */}
      <section className="py-10 px-4 border-t border-white/5">
        <h2 className="font-montserrat font-extrabold text-xl mb-6">{t('mobile.noRiskTitle')}</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 min-h-[48px]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm">{t('mobile.objections.gratuit')} <span className="font-normal text-white/50">— {t('mobile.objections.gratuitDesc')}</span></div>
          </div>
          <div className="flex items-center gap-4 min-h-[48px]">
            <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm">{t('mobile.objections.sansTel')} <span className="font-normal text-white/50">— {t('mobile.objections.sansTelDesc')}</span></div>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 min-h-[48px]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(37,211,102,.15)', color: '#25D366' }}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-[#25D366]">{t('mobile.objections.whatsapp')} <span className="font-normal text-white/50">— {t('mobile.objections.whatsappDesc')}</span></div>
          </a>
        </div>
      </section>

      {/* ═══ M7. CTA FINAL + FOOTER ═══ */}
      <section id="cta-final" className="px-4 pt-8 pb-10 text-center">
        <div className="rounded-2xl p-7" style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
          <h2 className="font-montserrat font-extrabold text-2xl mb-2">{t('mobile.ctaFinalTitle')}</h2>
          <p className="text-white/80 text-sm mb-5">{t('mobile.ctaFinalSub')}</p>
          <Link
            href="/register"
            className="block w-full h-14 rounded-lg bg-white font-bold text-[15px] flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,.25)] active:scale-[.98] transition-transform text-primary-700"
          >
            {t('mobile.createShop')}
          </Link>
        </div>
        <div className="mt-8 text-xs text-white/40 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-white/70">Conditions</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-white/70">Confidentialité</Link>
            <span>·</span>
            <Link href="/catalogues" className="hover:text-white/70">Marketplace</Link>
          </div>
          <div className="text-emerald-200/60">
            {t('mobile.footer', { year: new Date().getFullYear() })}{' '}
            <a href="https://icelabsoft.com" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold">
              IcelabSoft
            </a>
          </div>
          <VersionLabel variant="mobile" />
        </div>
      </section>

      {/* ═══ M8. CTA STICKY ZONE POUCE ═══ */}
      <StickyCTA />
    </div>
  );
}
