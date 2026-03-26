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
                role="button"
                tabIndex={0}
                aria-label={`Regarder : ${video.title}`}
                onClick={() => setActiveVideo({ src: video.src, title: video.title })}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveVideo({ src: video.src, title: video.title }); }}
                className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${colors.glow}, transparent 70%)` }} />
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-12 h-12 ${colors.playBg} border-2 ${colors.playBorder} rounded-full flex items-center justify-center text-lg text-white z-10 group-hover:shadow-lg transition-shadow duration-300`}
                  >
                    ▶
                  </motion.div>
                  <div className={`absolute top-2.5 left-2.5 ${colors.badge} border rounded-md px-2 py-0.5 text-[10px] ${colors.badgeText} font-semibold`}>
                    {video.number}
                  </div>
                </div>
                <div className="p-3.5 px-4">
                  <div className="text-sm font-semibold text-white mb-1">{video.title}</div>
                  <div className="text-[11px] text-white/35">{video.subtitle}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

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

      <VideoLightbox
        isOpen={!!activeVideo}
        onClose={() => setActiveVideo(null)}
        src={activeVideo?.src || ''}
        title={activeVideo?.title || ''}
      />
    </section>
  );
}
