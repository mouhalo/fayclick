'use client';

import { useState, useEffect, useRef } from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingTrio from './LandingTrio';
import LandingPreuve from './LandingPreuve';
import LandingTelechargements from './LandingTelechargements';
import LandingAide from './LandingAide';
import LandingCtaFinal from './LandingCtaFinal';
import LandingFooter from './LandingFooter';

const SECTION_IDS = ['hero', 'fonctionnement', 'preuve', 'telecharger', 'aide'];

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
    <div className="min-h-screen bg-slate-900 text-white scroll-smooth">
      <LandingNavbar activeSection={activeSection} />
      <LandingHero />
      <LandingTrio />
      <LandingPreuve />
      <LandingTelechargements />
      <LandingAide />
      <LandingCtaFinal />
      <LandingFooter />
    </div>
  );
}
