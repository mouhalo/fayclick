'use client';

import { motion } from 'framer-motion';
import { Gift, Globe, MessageCircle } from 'lucide-react';
import { OBJECTIONS_DATA, BROWSER_GUIDES, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './landing-data';

const ICONS = { gift: Gift, globe: Globe, whatsapp: MessageCircle } as const;
const ICON_COLORS = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky: 'bg-sky-500/15 text-sky-400',
  green: 'bg-[rgba(37,211,102,0.15)] text-[#25D366]',
} as const;

/** Levée d'objections + guides d'installation en accordéon. */
export default function LandingTelechargements() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section id="telecharger" className="relative bg-slate-900 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-14">
          <div className="text-xs font-bold tracking-[0.2em] mb-3 text-sky-400">SANS RISQUE</div>
          <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Trois raisons d&apos;essayer maintenant
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-10">
          {OBJECTIONS_DATA.map((obj, i) => {
            const Icon = ICONS[obj.icon];
            return (
              <motion.div
                key={obj.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-lg p-8 text-center shadow-card"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${ICON_COLORS[obj.colorClass]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-white mb-2" style={{ fontFamily: 'var(--font-landing-heading)' }}>
                  {obj.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">{obj.description}</p>
                {obj.icon === 'whatsapp' && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs font-semibold text-[#25D366] hover:underline"
                  >
                    +221 78 104 35 05 →
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Guides navigateur en accordéon */}
        <div className="max-w-3xl mx-auto space-y-2">
          {BROWSER_GUIDES.map((guide, i) => (
            <details key={guide.name} open={i === 0} className="group bg-white/[0.04] border border-white/10 rounded-lg">
              <summary className="flex items-center justify-between px-5 h-12 cursor-pointer text-sm text-white/80 font-semibold list-none">
                <span className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 bg-gradient-to-br ${guide.iconGradient} rounded-full flex items-center justify-center text-[11px] font-extrabold text-white`}>
                    {guide.icon}
                  </span>
                  Installer sur {guide.name}
                  {guide.recommended && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Recommandé</span>
                  )}
                </span>
                <span className="text-white/30 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-white/60 space-y-1.5">
                {guide.steps.map((step, si) => (
                  <p key={si}>
                    {si + 1}. {step}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
