# Landing Page Desktop FayClick — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing DesktopHome component with a new Dark Premium landing page targeting informal merchants, featuring 5 sections (Hero, Cibles, Fonctionnalités, Téléchargements, Support) + Footer.

**Architecture:** Each section is a standalone component in `components/landing/`. The orchestrator `DesktopLandingPage` composes them with a sticky navbar using IntersectionObserver for active link tracking. All animations use Framer Motion `whileInView`. The existing `app/page.tsx` routing (desktop/mobile split via `useIsDesktop()`) is preserved — only the desktop import changes.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-26-landing-page-desktop-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/landing/DesktopLandingPage.tsx` | Orchestrator: renders all sections, manages scroll behavior |
| Create | `components/landing/LandingNavbar.tsx` | Sticky navbar with anchor links, active link tracking via IntersectionObserver |
| Create | `components/landing/LandingHero.tsx` | 100vh hero with particles, text reveal, phone mockup, stats counter |
| Create | `components/landing/LandingCibles.tsx` | 4 problem→solution cards in 2x2 grid |
| Create | `components/landing/LandingFonctionnalites.tsx` | 3x3 grid of 9 feature cards |
| Create | `components/landing/LandingTelechargements.tsx` | PWA advantages + browser install guides |
| Create | `components/landing/LandingSupport.tsx` | 3x3 video grid + WhatsApp H24 banner |
| Create | `components/landing/LandingFooter.tsx` | 4-column footer |
| Create | `components/landing/VideoLightbox.tsx` | Modal with HTML5 video player |
| Create | `components/landing/landing-data.ts` | Static data arrays (features, videos, cibles, advantages) |
| Modify | `app/page.tsx:18-21` | Change DesktopHome import to DesktopLandingPage |
| Modify | `app/layout.tsx` | Add Clash Display font via next/font/google (fallback to Montserrat if unavailable) |

---

### Task 1: Font Setup + Landing Data

**Files:**
- Modify: `app/layout.tsx` (add font import)
- Create: `components/landing/landing-data.ts`

- [ ] **Step 1: Add Clash Display font to layout**

Open `app/layout.tsx`. The project uses `next/font/google` for Inter and Montserrat. Add a third font. Since Clash Display is not on Google Fonts, use Montserrat with weight 800 as fallback (geometric, bold, similar feel). Define a CSS variable `--font-landing-heading`.

```typescript
// In app/layout.tsx, add alongside existing font imports:
import { Montserrat } from 'next/font/google';

const landingHeading = Montserrat({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-landing-heading',
  display: 'swap',
});

// Add landingHeading.variable to the <body> className alongside existing font variables
```

- [ ] **Step 2: Create landing-data.ts with all static content**

```typescript
// components/landing/landing-data.ts

export const WHATSAPP_NUMBER = '221781043505';
export const WHATSAPP_MESSAGE = "Bonjour, j'aimerais en savoir plus sur FayClick.";

export interface CibleCard {
  icon: string;
  problem: string;
  problemDesc: string;
  solutionTitle: string;
  solutionDesc: string;
}

export const CIBLES_DATA: CibleCard[] = [
  {
    icon: '📒',
    problem: '"Je note tout dans un cahier"',
    problemDesc: 'Ventes perdues, stocks imprécis, clients oubliés. Le cahier ne calcule pas vos bénéfices.',
    solutionTitle: 'Dashboard intelligent',
    solutionDesc: 'Tout est automatique : ventes, stocks, bénéfices en temps réel sur votre téléphone.',
  },
  {
    icon: '💸',
    problem: '"Les clients paient quand ils veulent"',
    problemDesc: 'Crédits non suivis, impayés oubliés, pas de relance automatique.',
    solutionTitle: 'Suivi des impayés + relance SMS',
    solutionDesc: 'Chaque crédit est tracé. Relancez vos clients en un clic par SMS.',
  },
  {
    icon: '🏪',
    problem: '"Je ne sais pas ce qui me reste en stock"',
    problemDesc: 'Ruptures de stock imprévues, commandes tardives, pertes de ventes.',
    solutionTitle: 'Gestion de stock en temps réel',
    solutionDesc: 'Stock mis à jour à chaque vente. Alertes de rupture automatiques.',
  },
  {
    icon: '🌙',
    problem: '"Je vends en ligne même quand je ferme"',
    problemDesc: 'Boutique fermée = zéro vente. Pas de visibilité en dehors des heures d\'ouverture.',
    solutionTitle: 'Catalogue & Marketplace 24/7',
    solutionDesc: 'FayClick expose vos produits dans son marketplace pour vous permettre de vendre H24.',
  },
];

export interface FeatureCard {
  icon: string;
  colorClass: string; // tailwind color prefix e.g. 'emerald', 'orange'
  title: string;
  description: string;
}

export const FEATURES_DATA: FeatureCard[] = [
  { icon: '⚡', colorClass: 'emerald', title: 'Vente Flash', description: 'Encaissez en 3 secondes. Client anonyme, paiement CASH immédiat, reçu automatique.' },
  { icon: '📱', colorClass: 'amber', title: 'Wave, OM & Free Money', description: 'Acceptez les paiements mobile money directement. Vos clients paient par QR code.' },
  { icon: '📦', colorClass: 'blue', title: 'Gestion des Stocks', description: 'Stock mis à jour à chaque vente. Inventaire, alertes de rupture, historique des mouvements.' },
  { icon: '👥', colorClass: 'purple', title: 'Fichier Clients', description: "Historique d'achats, crédits en cours, relance SMS en un clic. Fidélisez sans effort." },
  { icon: '📊', colorClass: 'teal', title: 'Tableau de Bord', description: 'CA du jour, top produits, top clients, graphiques. Vos chiffres en un coup d\'œil.' },
  { icon: '🧾', colorClass: 'rose', title: 'Factures & Reçus', description: 'Factures professionnelles, reçus tickets 80mm, bons de livraison. Impression ou partage WhatsApp.' },
  { icon: '🛍️', colorClass: 'yellow', title: 'Catalogue & Marketplace', description: 'Exposez vos produits en ligne 24/7. Vos clients commandent même quand la boutique est fermée.' },
  { icon: '🔐', colorClass: 'emerald', title: 'Coffre-Fort KALPE', description: 'Soldes OM, Wave et Free centralisés. Retirez votre argent quand vous voulez.' },
  { icon: '📷', colorClass: 'violet', title: 'Scan Code-Barres', description: 'Scannez vos produits avec la caméra du téléphone. Ajout au panier instantané.' },
];

export interface VideoTutorial {
  number: string;
  title: string;
  subtitle: string;
  colorClass: string;
  src: string;
}

export const VIDEOS_DATA: VideoTutorial[] = [
  { number: '01', title: 'Créer un compte gratuitement', subtitle: 'Inscription en 2 minutes', colorClass: 'emerald', src: '/videos/1.mp4' },
  { number: '02', title: 'Démarrer avec FayClick', subtitle: "Premier pas dans l'application", colorClass: 'emerald', src: '/videos/2.mp4' },
  { number: '03', title: 'Ajouter vos produits et stocks', subtitle: 'Catalogue et inventaire', colorClass: 'emerald', src: '/videos/3.mp4' },
  { number: '04', title: 'Effectuer une Vente', subtitle: 'Panier et encaissement', colorClass: 'emerald', src: '/videos/4.mp4' },
  { number: '05', title: 'Fidéliser vos clients', subtitle: 'Fichier clients et historique', colorClass: 'emerald', src: '/videos/5.mp4' },
  { number: '06', title: 'Accepter des Paiements Wave/OM/Free', subtitle: 'Mobile money intégré', colorClass: 'amber', src: '/videos/6.mp4' },
  { number: '07', title: 'Suivre vos clients et les impayés', subtitle: 'Crédits et relances SMS', colorClass: 'emerald', src: '/videos/7.mp4' },
  { number: '08', title: 'Voir Stats et Inventaires', subtitle: 'Dashboard et rapports', colorClass: 'emerald', src: '/videos/8.mp4' },
  { number: '09', title: 'Renouveler son abonnement', subtitle: "Gestion de l'abonnement", colorClass: 'violet', src: '/videos/9.mp4' },
];

export const PWA_ADVANTAGES = [
  { title: 'Pas de téléchargement', desc: 'Pas besoin de Play Store ni App Store. Ouvrez fayclick.com et travaillez.' },
  { title: 'Toujours à jour', desc: 'Mises à jour automatiques. Pas de version obsolète sur votre téléphone.' },
  { title: 'Zéro espace disque', desc: 'Ne prend pas de place sur votre téléphone. Idéal pour les appareils avec peu de mémoire.' },
  { title: 'Multi-appareil', desc: 'Téléphone, tablette, ordinateur — un seul compte, toutes vos données synchronisées.' },
];

export const BROWSER_GUIDES = [
  {
    name: 'Google Chrome',
    icon: 'G',
    iconGradient: 'from-[#4285F4] to-[#34A853]',
    recommended: true,
    steps: [
      'Ouvrez fayclick.com',
      'Menu ⋮ (3 points en haut à droite)',
      '"Ajouter à l\'écran d\'accueil"',
      'Confirmez → icône FayClick ajoutée !',
    ],
  },
  {
    name: 'Safari (iPhone)',
    icon: '🧭',
    iconGradient: 'from-[#007AFF] to-[#5AC8FA]',
    recommended: false,
    steps: [
      'Ouvrez fayclick.com',
      'Bouton partage ⬆ (en bas)',
      '"Sur l\'écran d\'accueil"',
      'Confirmez → c\'est prêt !',
    ],
  },
  {
    name: 'Samsung Internet',
    icon: 'S',
    iconGradient: 'from-[#1428A0] to-[#6E7FF3]',
    recommended: false,
    steps: [
      'Ouvrez fayclick.com',
      'Menu ≡ → "Ajouter à l\'écran d\'accueil"',
      'Confirmez et retrouvez FayClick sur votre bureau',
    ],
  },
];

export const NAV_LINKS = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Cibles', href: '#cibles' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Télécharger', href: '#telechargements' },
  { label: 'Support', href: '#support' },
];

export const FOOTER_NAV = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Télécharger', href: '#telechargements' },
  { label: 'Tutoriels', href: '#support' },
  { label: 'Marketplace', href: '/catalogues' },
];

export const FOOTER_LEGAL = [
  { label: "Conditions d'utilisation", href: '#' },
  { label: 'Politique de confidentialité', href: '#' },
  { label: 'Mentions légales', href: '#' },
];

export const PROFILS_CIBLES = ['Boutiquiers', 'Commerçants de marché', 'Vendeurs ambulants', 'Grossistes'];

export const STATS_DATA = [
  { value: '500+', label: 'Marchands actifs' },
  { value: '24/7', label: 'Support WhatsApp' },
  { value: '100%', label: 'Gratuit au départ' },
];
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/landing-data.ts app/layout.tsx
git commit -m "feat(landing): add font setup and static data for new desktop landing page"
```

---

### Task 2: LandingNavbar

**Files:**
- Create: `components/landing/LandingNavbar.tsx`

- [ ] **Step 1: Create LandingNavbar component**

```typescript
// components/landing/LandingNavbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { NAV_LINKS } from './landing-data';

interface LandingNavbarProps {
  activeSection: string;
}

export default function LandingNavbar({ activeSection }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight - 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg">
              FC
            </div>
            <span className="font-extrabold text-lg text-white" style={{ fontFamily: 'var(--font-landing-heading)' }}>
              FayClick
            </span>
          </motion.div>

          {/* Nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href.replace('#', '');
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="relative px-4 py-2 text-sm font-medium transition-all duration-300 group"
                >
                  <span className={`relative z-10 transition-colors duration-300 ${
                    isActive ? 'text-emerald-400' : 'text-white/60 group-hover:text-white'
                  }`}>
                    {link.label}
                  </span>
                  {/* Hover underline */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-emerald-400 transition-all duration-300 w-0 group-hover:w-3/4" />
                  {/* Active pulse glow */}
                  {isActive && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-emerald-500/10 border border-emerald-400/20"
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-medium text-white/80 border border-white/20 rounded-full hover:bg-white/5 hover:border-white/30 transition-all duration-300"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/25"
            >
              Créer mon compte
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
```

- [ ] **Step 2: Verify file renders without errors**

Run: `npx tsc --noEmit components/landing/LandingNavbar.tsx` or check in dev server later.

- [ ] **Step 3: Commit**

```bash
git add components/landing/LandingNavbar.tsx
git commit -m "feat(landing): add sticky navbar with active section tracking and animated links"
```

---

### Task 3: LandingHero

**Files:**
- Create: `components/landing/LandingHero.tsx`

- [ ] **Step 1: Create LandingHero component**

```typescript
// components/landing/LandingHero.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { STATS_DATA } from './landing-data';

function AnimatedCounter({ value, duration = 1.5 }: { value: string; duration?: number }) {
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
    const step = target / (duration * 60);
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
  }, [isInView, value, duration, numericMatch]);

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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900" />

      {/* Animated radial overlays */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(20,184,166,0.1),transparent_50%)]" />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full will-change-transform"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0.4,
            }}
            animate={{
              y: [100, -window.innerHeight],
              opacity: [0, 0.6, 0.6, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Spacer for navbar */}
      <div className="h-20" />

      {/* Hero content */}
      <div className="flex-1 flex items-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="flex items-center justify-between gap-12">
            {/* Left: Text */}
            <div className="max-w-[550px]">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-300 mb-6"
              >
                <span>🇸🇳</span> La Super App des Marchands du Sénégal
              </motion.div>

              {/* Title line 1: word by word */}
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

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="text-base text-white/50 leading-relaxed mb-8"
              >
                Stocks, ventes, clients, paiements mobile money — tout dans une seule app. Gratuit pour commencer, sans téléchargement obligatoire.
              </motion.p>

              {/* CTAs */}
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

              {/* Stats */}
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

            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="relative"
            >
              {/* Glow behind phone */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.2),transparent_70%)] scale-150" />

              {/* Phone frame */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-[220px] h-[380px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-[32px] border-2 border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              >
                {/* Phone screen content */}
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

      {/* Scroll indicator */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/LandingHero.tsx
git commit -m "feat(landing): add cinematic hero section with particles, text reveal, phone mockup"
```

---

### Task 4: LandingCibles

**Files:**
- Create: `components/landing/LandingCibles.tsx`

- [ ] **Step 1: Create LandingCibles component**

```typescript
// components/landing/LandingCibles.tsx
'use client';

import { motion } from 'framer-motion';
import { CIBLES_DATA, PROFILS_CIBLES } from './landing-data';

export default function LandingCibles() {
  return (
    <section id="cibles" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-emerald-900/50 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
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

        {/* 2x2 Grid */}
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
              {/* Top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

              {/* Problem icon */}
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-2xl mb-5">
                {card.icon}
              </div>

              {/* Problem */}
              <div className="text-[11px] text-red-400 uppercase tracking-wider font-semibold mb-2">Le problème</div>
              <h3 className="text-[17px] font-bold text-white mb-2.5">{card.problem}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed mb-5">{card.problemDesc}</p>

              {/* Arrow */}
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

              {/* Solution */}
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

        {/* Bottom bar - profiles */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/LandingCibles.tsx
git commit -m "feat(landing): add Cibles section with 4 problem-solution cards"
```

---

### Task 5: LandingFonctionnalites

**Files:**
- Create: `components/landing/LandingFonctionnalites.tsx`

- [ ] **Step 1: Create LandingFonctionnalites component**

The component renders a 3x3 grid of feature cards. Each card has a colored icon background using Tailwind's dynamic color approach. Since Tailwind purges unused classes, we map `colorClass` to actual Tailwind class strings in a lookup object.

```typescript
// components/landing/LandingFonctionnalites.tsx
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
      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(rgba(16,185,129,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
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

        {/* 3x3 Grid */}
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

        {/* CTA */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/LandingFonctionnalites.tsx
git commit -m "feat(landing): add Fonctionnalites section with 9 feature cards grid"
```

---

### Task 6: LandingTelechargements

**Files:**
- Create: `components/landing/LandingTelechargements.tsx`

- [ ] **Step 1: Create LandingTelechargements component**

```typescript
// components/landing/LandingTelechargements.tsx
'use client';

import { motion } from 'framer-motion';
import { PWA_ADVANTAGES, BROWSER_GUIDES } from './landing-data';

export default function LandingTelechargements() {
  return (
    <section id="telechargements" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,0.08),transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
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

        {/* 2 columns */}
        <div className="grid grid-cols-2 gap-8 max-w-[1000px] mx-auto">
          {/* Left: Advantages */}
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

          {/* Right: Install guides */}
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
                        <span className="text-emerald-400">{si + 1}.</span>{' '}
                        <span dangerouslySetInnerHTML={{ __html: step.replace(/fayclick\.com/g, '<span class="text-white font-medium">fayclick.com</span>').replace(/"([^"]+)"/g, '"<span class="text-white font-medium">$1</span>"') }} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom banner */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/LandingTelechargements.tsx
git commit -m "feat(landing): add Telechargements section with PWA advantages and browser guides"
```

---

### Task 7: VideoLightbox + LandingSupport

**Files:**
- Create: `components/landing/VideoLightbox.tsx`
- Create: `components/landing/LandingSupport.tsx`

- [ ] **Step 1: Create VideoLightbox component**

```typescript
// components/landing/VideoLightbox.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title: string;
}

export default function VideoLightbox({ isOpen, onClose, src, title }: VideoLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div className="text-white text-lg font-semibold mb-3">{title}</div>

            {/* Video */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
              <video
                ref={videoRef}
                src={src}
                controls
                autoPlay
                className="w-full aspect-video"
                controlsList="nodownload"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create LandingSupport component**

```typescript
// components/landing/LandingSupport.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { VIDEOS_DATA, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './landing-data';
import VideoLightbox from './VideoLightbox';

const VIDEO_COLOR_MAP: Record<string, { glow: string; badge: string; badgeText: string; playBg: string; playBorder: string }> = {
  emerald: { glow: 'rgba(16,185,129,0.1)', badge: 'bg-emerald-500/15 border-emerald-500/30', badgeText: 'text-emerald-300', playBg: 'bg-emerald-500/20', playBorder: 'border-emerald-500/40' },
  amber:   { glow: 'rgba(245,158,11,0.1)', badge: 'bg-amber-500/15 border-amber-500/30',     badgeText: 'text-amber-300',   playBg: 'bg-amber-500/20',   playBorder: 'border-amber-500/40' },
  violet:  { glow: 'rgba(139,92,246,0.1)', badge: 'bg-violet-500/15 border-violet-500/30',   badgeText: 'text-violet-300',  playBg: 'bg-violet-500/20',  playBorder: 'border-violet-500/40' },
};

export default function LandingSupport() {
  const [activeVideo, setActiveVideo] = useState<{ src: string; title: string } | null>(null);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section id="support" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-emerald-900/40 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(16,185,129,0.1),transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] text-emerald-300 uppercase tracking-wider mb-4">
            Jamais seul
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3.5 leading-tight" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Apprenez à votre<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">rythme</span>
          </h2>
          <p className="text-base text-white/50 max-w-[520px] mx-auto leading-relaxed">
            9 tutoriels vidéo pour maîtriser FayClick en quelques minutes. Et si vous bloquez, on est là 24h/24.
          </p>
        </motion.div>

        {/* 3x3 Video Grid */}
        <div className="grid grid-cols-3 gap-5 max-w-[1000px] mx-auto">
          {VIDEOS_DATA.map((video, i) => {
            const colors = VIDEO_COLOR_MAP[video.colorClass] || VIDEO_COLOR_MAP.emerald;
            return (
              <motion.div
                key={video.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 + Math.floor(i / 3) * 0.12, duration: 0.4 }}
                onClick={() => setActiveVideo({ src: video.src, title: video.title })}
                className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${colors.glow}, transparent 70%)` }} />
                  {/* Play button */}
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-12 h-12 ${colors.playBg} border-2 ${colors.playBorder} rounded-full flex items-center justify-center text-lg text-white z-10 group-hover:shadow-lg transition-shadow duration-300`}
                  >
                    ▶
                  </motion.div>
                  {/* Number badge */}
                  <div className={`absolute top-2.5 left-2.5 ${colors.badge} border rounded-md px-2 py-0.5 text-[10px] ${colors.badgeText} font-semibold`}>
                    {video.number}
                  </div>
                </div>
                {/* Text */}
                <div className="p-3.5 px-4">
                  <div className="text-sm font-semibold text-white mb-1">{video.title}</div>
                  <div className="text-[11px] text-white/35">{video.subtitle}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* WhatsApp H24 Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-[1000px] mx-auto mt-12"
        >
          <div className="bg-gradient-to-r from-[rgba(37,211,102,0.08)] to-[rgba(37,211,102,0.02)] border border-[rgba(37,211,102,0.2)] rounded-[20px] p-9 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-[60px] h-[60px] bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center text-[28px] shadow-[0_8px_24px_rgba(37,211,102,0.25)]"
              >
                💬
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Besoin d&apos;aide ? On est là.</h3>
                <p className="text-sm text-white/50">
                  Support WhatsApp disponible <strong className="text-[#25D366]">24h/24, 7j/7</strong>. Réponse en moins de 5 minutes.
                </p>
              </div>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(37,211,102,0.3)] hover:scale-105 active:scale-95 transition-transform duration-300 whitespace-nowrap"
            >
              <span className="text-lg">📲</span> Écrire sur WhatsApp
            </a>
          </div>
        </motion.div>
      </div>

      {/* Video Lightbox */}
      <VideoLightbox
        isOpen={!!activeVideo}
        onClose={() => setActiveVideo(null)}
        src={activeVideo?.src || ''}
        title={activeVideo?.title || ''}
      />
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/VideoLightbox.tsx components/landing/LandingSupport.tsx
git commit -m "feat(landing): add Support section with 9 video cards, lightbox player, WhatsApp H24 banner"
```

---

### Task 8: LandingFooter

**Files:**
- Create: `components/landing/LandingFooter.tsx`

- [ ] **Step 1: Create LandingFooter component**

```typescript
// components/landing/LandingFooter.tsx
'use client';

import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { FOOTER_NAV, FOOTER_LEGAL, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './landing-data';

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'X (Twitter)' },
];

export default function LandingFooter() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative">
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="bg-[#070d18]">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-6 lg:px-12 pt-14 pb-8"
        >
          {/* 4 columns */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-xl flex items-center justify-center font-bold text-sm text-white">FC</div>
                <span className="font-bold text-lg text-white">FayClick</span>
              </div>
              <p className="text-[13px] text-white/40 leading-relaxed mb-5">
                La super app des marchands du Sénégal. Gérez votre commerce simplement depuis votre téléphone.
              </p>
              <div className="flex gap-2.5">
                {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 bg-white/5 border border-white/[0.08] rounded-xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300"
                  >
                    <Icon size={16} />
                  </a>
                ))}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 bg-white/5 border border-white/[0.08] rounded-xl flex items-center justify-center text-white/50 hover:bg-[#25D366]/20 hover:text-[#25D366] transition-all duration-300"
                >
                  💬
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white/50 mb-5">Navigation</h4>
              <div className="flex flex-col gap-3">
                {FOOTER_NAV.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-300 relative group w-fit"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 h-px bg-white w-0 group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white/50 mb-5">Légal</h4>
              <div className="flex flex-col gap-3">
                {FOOTER_LEGAL.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-300 relative group w-fit"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 h-px bg-white w-0 group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white/50 mb-5">Contact</h4>
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📍</span>
                  <span className="text-[13px] text-white/50">Dakar, Sénégal</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📧</span>
                  <span className="text-[13px] text-white/50">contact@fayclick.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💬</span>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#25D366] hover:underline">
                    WhatsApp 24/7
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-px bg-white/[0.06] mb-6" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/30">
              © 2026 FayClick — Une solution <strong className="text-white/50">ICELABSOFT SARL</strong>
            </div>
            <div className="text-xs text-white/30">
              Fait avec 💚 au Sénégal
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/LandingFooter.tsx
git commit -m "feat(landing): add 4-column footer with social links, navigation, and contact"
```

---

### Task 9: DesktopLandingPage Orchestrator + Wire Up

**Files:**
- Create: `components/landing/DesktopLandingPage.tsx`
- Modify: `app/page.tsx:18-21`

- [ ] **Step 1: Create DesktopLandingPage orchestrator**

```typescript
// components/landing/DesktopLandingPage.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingCibles from './LandingCibles';
import LandingFonctionnalites from './LandingFonctionnalites';
import LandingTelechargements from './LandingTelechargements';
import LandingSupport from './LandingSupport';
import LandingFooter from './LandingFooter';

const SECTION_IDS = ['hero', 'cibles', 'fonctionnalites', 'telechargements', 'support'];

export default function DesktopLandingPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { threshold: [0.2, 0.5], rootMargin: '-80px 0px 0px 0px' }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 scroll-smooth">
      <LandingNavbar activeSection={activeSection} />
      <LandingHero />
      <LandingCibles />
      <LandingFonctionnalites />
      <LandingTelechargements />
      <LandingSupport />
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Update app/page.tsx to import DesktopLandingPage**

Change the dynamic import from `DesktopHome` to `DesktopLandingPage`:

```typescript
// In app/page.tsx, replace:
const DesktopHome = dynamic(() => import('@/components/home/DesktopHome'), {
  loading: () => <LoadingScreen />,
  ssr: false
});

// With:
const DesktopHome = dynamic(() => import('@/components/landing/DesktopLandingPage'), {
  loading: () => <LoadingScreen />,
  ssr: false
});
```

Keep the variable name `DesktopHome` to minimize changes in the JSX below. Only the import path changes.

- [ ] **Step 3: Update LoadingScreen to match dark theme**

Replace the LoadingScreen background in `app/page.tsx` to match the new dark theme:

```typescript
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-2xl font-black text-white">FC</span>
          </div>
        </div>
        <p className="text-emerald-200 text-lg font-medium animate-pulse">Chargement...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`

Open `http://localhost:3000` in a desktop browser (width > 1024px). Verify:
- All 5 sections render
- Navbar appears and becomes sticky on scroll
- Active link updates while scrolling
- Animations fire on scroll
- WhatsApp floating button appears
- All links work (anchor scroll, /login, /register, WhatsApp)

- [ ] **Step 5: Commit**

```bash
git add components/landing/DesktopLandingPage.tsx app/page.tsx
git commit -m "feat(landing): wire up DesktopLandingPage orchestrator, replace DesktopHome import"
```

---

### Task 10: Create videos directory placeholder + Final verification

**Files:**
- Create: `public/videos/.gitkeep`

- [ ] **Step 1: Create videos directory**

```bash
mkdir -p public/videos
touch public/videos/.gitkeep
```

This ensures the `/videos/` path exists for when video files are added later.

- [ ] **Step 2: Full page test**

Open `http://localhost:3000` in desktop browser. Walk through each section:

1. **Hero**: Particles animate, title reveals word by word, phone floats, stats count up, scroll indicator bounces
2. **Cibles**: 4 cards with problem→solution, hover lifts cards, bottom bar shows profiles
3. **Fonctionnalités**: 9 cards in 3x3, hover shows colored border + glow, CTA button pulses
4. **Téléchargements**: 2 columns slide in, checkmarks spring, browser guides stagger
5. **Support**: 9 video cards, click opens lightbox (will show error if no video file — expected), WhatsApp banner with CTA
6. **Footer**: 4 columns, hover underlines, social icons
7. **Navbar**: Transparent on hero, sticky glass after scroll, active link tracks section

- [ ] **Step 3: Commit**

```bash
git add public/videos/.gitkeep
git commit -m "feat(landing): add videos directory placeholder for tutorial mp4 files"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Font + Data | Clash Display font setup + all static data |
| 2 | LandingNavbar | Sticky glassmorphism navbar with active tracking |
| 3 | LandingHero | 100vh cinematic hero with particles, text reveal, phone mockup |
| 4 | LandingCibles | 4 problem→solution cards in 2x2 grid |
| 5 | LandingFonctionnalites | 9 feature cards in 3x3 grid |
| 6 | LandingTelechargements | PWA advantages + browser install guides |
| 7 | VideoLightbox + LandingSupport | 9 video cards with lightbox + WhatsApp H24 |
| 8 | LandingFooter | 4-column footer |
| 9 | DesktopLandingPage + Wire up | Orchestrator + update app/page.tsx |
| 10 | Videos dir + Final test | Placeholder + full verification |
