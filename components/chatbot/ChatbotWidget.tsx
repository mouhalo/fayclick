'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { matchLocalFaq, askAi, ChatMessage } from '@/services/chatbot.service';
import { WHATSAPP_BOT_URL } from './chatbot-data';

type QuickReply = 'createShop' | 'free' | 'how';

interface DisplayMessage {
  id: number;
  from: 'bot' | 'user';
  text: string;
  isHtml: boolean;
  ctaHref?: string;
  ctaText?: string;
}

const WELCOME_DELAY = 7000;
const SESSION_KEY = 'fc-chatbot-greeted';

/**
 * Échappe les caractères HTML.
 * ⚠️ Sécurité (faille XSS corrigée) : toute valeur saisie par le visiteur
 * interpolée dans un message rendu via `dangerouslySetInnerHTML`
 * (ex. le nom de boutique collecté par le bot) DOIT passer par ici.
 * Le rendu `isHtml: false` (texte simple) est déjà échappé par React.
 */
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Assistant IA de la landing : accueille, répond (FAQ locale instantanée
 * puis LLM via proxy PHP) et pousse vers /register avec pré-remplissage.
 */
export default function ChatbotWidget() {
  const t = useTranslations('chatbot');
  const { locale } = useLanguage();

  const [open, setOpen] = useState(false);
  const [animatedOpen, setAnimatedOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [collectMode, setCollectMode] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [stickyOffset, setStickyOffset] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const historyRef = useRef<ChatMessage[]>([]);

  const nextId = () => ++idRef.current;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const pushMessage = (msg: Omit<DisplayMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: nextId() }]);
    scrollToBottom();
  };

  const pushBot = (text: string, isHtml = false, cta?: { text: string; href: string }) => {
    pushMessage({ from: 'bot', text, isHtml, ctaText: cta?.text, ctaHref: cta?.href });
  };

  const pushUser = (text: string) => {
    pushMessage({ from: 'user', text, isHtml: false });
    historyRef.current.push({ role: 'user', content: text });
  };

  // La bulle remonte quand le CTA sticky mobile est visible
  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.4;
      const finalEl = document.getElementById('cta-final');
      const nearFinal = finalEl ? finalEl.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
      setStickyOffset(past && !nearFinal && window.innerWidth < 1024);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Salutation proactive (1×/session)
  useEffect(() => {
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      greeted = false;
    }
    if (greeted) return;

    const timer = setTimeout(() => {
      // Ouverture sans animation : la salutation automatique doit être visible
      // même si l'onglet est en arrière-plan ou que les animations sont throttlées
      setAnimatedOpen(false);
      setOpen(true);
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        pushBot(t('welcome'), true);
        setQuickReplies(['createShop', 'free', 'how']);
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          // stockage indisponible : on saluera à nouveau, sans gravité
        }
      }, 1000);
    }, WELCOME_DELAY);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickReply = (q: QuickReply) => {
    setQuickReplies([]);
    if (q === 'createShop') {
      pushUser(t('qCreate'));
      setCollectMode(true);
      pushBot(t('collectName'), true);
      inputRef.current?.focus();
      return;
    }
    if (q === 'free') sendMessage(t('qFree'));
    if (q === 'how') sendMessage(t('qHow'));
  };

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    pushUser(text);

    // Mode collecte du nom de la boutique → lien pré-rempli
    if (collectMode) {
      setCollectMode(false);
      const rawName = text.replace(/\s+/g, ' ').toUpperCase();
      const name = escapeHtml(rawName); // XSS : le nom est rendu en HTML plus bas
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        pushBot(t('collectDone', { name }), true, {
          text: t('ctaRegister'),
          href: `/register?nom=${encodeURIComponent(rawName)}&source=chatbot`,
        });
        setQuickReplies([]);
      }, 1200);
      return;
    }

    // Niveau 1 : FAQ locale instantanée
    const local = matchLocalFaq(text, locale);
    if (local) {
      pushBot(local.answer, true);
      historyRef.current.push({ role: 'assistant', content: local.answer.replace(/<[^>]+>/g, '') });
      if (local.ctaRegister) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), from: 'bot', text: t('ctaRegister'), isHtml: false, ctaHref: '/register?source=chatbot' },
        ]);
        scrollToBottom();
      }
      setQuickReplies(['createShop']);
      return;
    }

    // Niveau 2 : LLM via proxy PHP
    setTyping(true);
    try {
      const reply = await askAi(historyRef.current, locale);
      historyRef.current.push({ role: 'assistant', content: reply });
      pushBot(reply);
      setQuickReplies(['createShop']);
    } catch {
      pushBot(t('aiError'), true, { text: t('human'), href: WHATSAPP_BOT_URL(locale) });
      setQuickReplies(['createShop']);
    } finally {
      setTyping(false);
    }
  };

  const submitInput = () => {
    const v = inputRef.current?.value ?? '';
    if (!v.trim()) return;
    inputRef.current!.value = '';
    sendMessage(v);
  };

  const isStickyVisible = stickyOffset;

  return (
    <>
      {/* Panneau de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={animatedOpen ? { opacity: 0, y: 24, scale: 0.96 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed z-50 flex flex-col rounded-2xl overflow-hidden bg-slate-900 text-white border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            style={{
              right: 20,
              bottom: isStickyVisible ? 104 : 20,
              width: 'min(360px, calc(100vw - 40px))',
              height: 'min(540px, calc(100vh - 120px))',
              maxHeight: 'calc(100dvh - 120px)',
            }}
          >
            {/* En-tête */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10 shrink-0" style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)' }}>
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden shrink-0 text-lg">
                🐝
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">
                  {t('title')}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('status')}
                  </span>
                </div>
                <div className="text-[11px] text-sky-200/70">{t('langHint')}</div>
              </div>
              <button
                onClick={() => {
                  setAnimatedOpen(false);
                  setOpen(false);
                }}
                aria-label={t('close')}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.from === 'user'
                        ? 'rounded-br-md text-white bg-primary-500'
                        : 'rounded-bl-md text-white bg-slate-800 border border-white/10'
                    }`}
                  >
                    {m.isHtml ? <span dangerouslySetInnerHTML={{ __html: m.text }} /> : <span className="whitespace-pre-line">{m.text}</span>}
                    {m.ctaHref && (
                      <Link
                        href={m.ctaHref}
                        className="block w-full rounded-lg mt-2 px-4 h-11 flex items-center justify-center font-bold text-[13px] text-white shadow-cta bg-primary-500 hover:bg-primary-600 transition-colors"
                      >
                        {m.ctaText}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex gap-1.5 px-3 py-2.5 rounded-2xl rounded-bl-md bg-slate-800 border border-white/10">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickReply(q)}
                    className="px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors"
                    style={{ borderColor: 'rgba(14,165,233,.5)', color: '#7dd3fc', background: 'rgba(14,165,233,.12)' }}
                  >
                    {q === 'createShop' ? t('qCreate') : q === 'free' ? t('qFree') : t('qHow')}
                  </button>
                ))}
              </div>
            )}

            {/* Saisie + escalade humaine */}
            <div className="px-4 pb-3 pt-1 shrink-0">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t('placeholder')}
                  onKeyDown={(e) => e.key === 'Enter' && submitInput()}
                  className="flex-1 h-11 bg-transparent text-sm placeholder-white/30 focus:outline-none"
                />
                <button
                  onClick={submitInput}
                  aria-label={t('send')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-90 bg-primary-500 text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <a
                href={WHATSAPP_BOT_URL(locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/40 hover:text-[#25D366] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>
                {t('human')}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulle flottante */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            onClick={() => {
              setAnimatedOpen(true);
              setOpen(true);
            }}
            aria-label={t('bubble')}
            className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-cta bg-primary-500 hover:bg-primary-600 active:scale-90 transition-all"
            style={{ right: 20, bottom: isStickyVisible ? 104 : 20 }}
          >
            💬
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
