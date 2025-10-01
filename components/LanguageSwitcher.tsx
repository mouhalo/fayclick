'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const languages = {
  fr: {
    flag: '🇫🇷',
    name: 'Français',
    shortName: 'FR'
  },
  en: {
    flag: '🇬🇧',
    name: 'English',
    shortName: 'EN'
  }
};

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentLanguage = languages[locale];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bouton Trigger */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-white/60 backdrop-blur-lg border border-white/40
          hover:bg-white/80 hover:shadow-lg
          transition-all duration-200
          ${variant === 'compact' ? 'text-sm' : 'text-base'}
        `}
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        {variant === 'default' && (
          <span className="font-medium text-gray-700 hidden sm:inline">
            {currentLanguage.shortName}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-xl border border-white/40 shadow-2xl overflow-hidden z-50"
          >
            {Object.entries(languages).map(([key, lang]) => {
              const isActive = key === locale;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setLocale(key as 'fr' | 'en');
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3
                    hover:bg-emerald-50/80 transition-colors
                    ${isActive ? 'bg-emerald-50/50' : ''}
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`flex-1 text-left font-medium ${
                    isActive ? 'text-emerald-700' : 'text-gray-700'
                  }`}>
                    {lang.name}
                  </span>
                  {isActive && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
