'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { FAQ_DATA, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './landing-data';

/** FAQ (remplace les tutoriels vidéo dont les fichiers n'existent pas) + bannière WhatsApp. */
export default function LandingAide() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section id="aide" className="relative bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold tracking-[0.2em] mb-3 text-sky-400">ON VOUS RÉPOND FRANCHEMENT</div>
          <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-landing-heading)' }}>
            Questions fréquentes
          </h2>
        </div>

        <div className="space-y-2 mb-8">
          {FAQ_DATA.map((faq, i) => (
            <details key={faq.question} open={i === 0} className="group bg-white/[0.04] border border-white/10 rounded-lg">
              <summary className="flex items-center justify-between px-5 h-14 cursor-pointer font-semibold text-sm list-none text-white/90">
                {faq.question}
                <span className="text-white/30 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>

        {/* Bannière WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-xl p-6 flex items-center justify-between gap-4"
          style={{ background: 'rgba(37,211,102,.08)', border: '1px solid rgba(37,211,102,.3)' }}
        >
          <div className="flex items-center gap-4">
            <MessageCircle className="w-8 h-8 shrink-0 text-[#25D366]" />
            <div>
              <div className="font-semibold text-sm text-white">Une question avant de commencer ?</div>
              <div className="text-white/50 text-xs">On répond 24/7, en français comme en wolof</div>
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-5 h-11 flex items-center text-sm font-bold text-white shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: '#25D366' }}
          >
            Écrire sur WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
