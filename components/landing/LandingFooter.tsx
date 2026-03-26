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
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <div className="bg-[#070d18]">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-6 lg:px-12 pt-14 pb-8"
        >
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-10 mb-12">
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
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 bg-white/5 border border-white/[0.08] rounded-xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300">
                    <Icon size={16} />
                  </a>
                ))}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 bg-white/5 border border-white/[0.08] rounded-xl flex items-center justify-center text-white/50 hover:bg-[#25D366]/20 hover:text-[#25D366] transition-all duration-300">
                  💬
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white/50 mb-5">Navigation</h4>
              <div className="flex flex-col gap-3">
                {FOOTER_NAV.map((link) => (
                  <a key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className="text-sm text-white/50 hover:text-white transition-colors duration-300 relative group w-fit">
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 h-px bg-white w-0 group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white/50 mb-5">Légal</h4>
              <div className="flex flex-col gap-3">
                {FOOTER_LEGAL.map((link) => (
                  <a key={link.label} href={link.href} className="text-sm text-white/50 hover:text-white transition-colors duration-300 relative group w-fit">
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 h-px bg-white w-0 group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>
            </div>

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
