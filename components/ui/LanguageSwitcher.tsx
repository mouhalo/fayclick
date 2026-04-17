'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage, type Locale } from '@/contexts/LanguageContext';

interface LanguageOption {
  code: Locale;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'wo', label: 'WO', flag: '🇸🇳' },
];

export type LanguageSwitcherVariant = 'light' | 'dark' | 'glass';

interface LanguageSwitcherProps {
  variant?: LanguageSwitcherVariant;
  className?: string;
  compact?: boolean;
}

/**
 * Switch de langue FR/EN avec persistance localStorage.
 * Variants : light (fond clair), dark (fond sombre/landing), glass (glassmorphism).
 */
export default function LanguageSwitcher({
  variant = 'light',
  className = '',
  compact = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const variantStyles: Record<LanguageSwitcherVariant, { btn: string; menu: string; item: string; itemActive: string }> = {
    light: {
      btn: 'bg-white/80 hover:bg-white text-gray-800 border border-gray-200 shadow-sm',
      menu: 'bg-white border border-gray-200 shadow-lg',
      item: 'text-gray-700 hover:bg-gray-50',
      itemActive: 'bg-emerald-50 text-emerald-700 font-semibold',
    },
    dark: {
      btn: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm',
      menu: 'bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/40',
      item: 'text-white/80 hover:bg-white/10 hover:text-white',
      itemActive: 'bg-emerald-500/20 text-emerald-400 font-semibold',
    },
    glass: {
      btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-sm',
      menu: 'bg-white/95 backdrop-blur-xl border border-white/40 shadow-lg',
      item: 'text-gray-700 hover:bg-gray-50',
      itemActive: 'bg-emerald-50 text-emerald-700 font-semibold',
    },
  };

  const styles = variantStyles[variant];

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Changer la langue"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${styles.btn} flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200`}
      >
        <span className="text-base leading-none" aria-hidden="true">
          {current.flag}
        </span>
        {!compact && <span>{current.label}</span>}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`${styles.menu} absolute right-0 mt-2 min-w-[120px] rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
        >
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === locale;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`${isActive ? styles.itemActive : styles.item} flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors`}
              >
                <span className="text-base" aria-hidden="true">
                  {lang.flag}
                </span>
                <span>{lang.label}</span>
                {isActive && (
                  <svg
                    className="w-3.5 h-3.5 ml-auto text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
