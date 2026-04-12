'use client';

/**
 * CountryPhoneInput — Sélecteur pays (drapeau + indicatif) + input téléphone
 * Utilisé Step 1 de /register pour permettre l'inscription multi-pays CEDEAO.
 *
 * - Sénégal par défaut (SN)
 * - 17 pays depuis types/pays.ts (PAYS_LIST triée par ordre_affichage)
 * - Validation longueur via validatePhoneForPays (types/pays.ts)
 * - A11y : navigation clavier complète (↑ ↓ Enter Esc Home End)
 * - Thème glassmorphism vert émeraude cohérent avec reg_glass-input
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import {
  PAYS_LIST,
  PAYS_DEFAULT_CODE,
  getPaysByCode,
  PHONE_LENGTH_BY_PAYS,
} from '@/types/pays';

export interface CountryPhoneInputProps {
  value: string;
  countryCode: string;
  onPhoneChange: (phone: string) => void;
  onCountryChange: (code: string) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
  ariaLabel?: string;
}

/**
 * Placeholder dynamique par pays (selon longueur du numéro)
 */
const PLACEHOLDERS: Record<string, string> = {
  SN: '77 123 45 67',
  CI: '01 23 45 67 89',
  ML: '70 12 34 56',
  BF: '70 12 34 56',
  TG: '90 12 34 56',
  BJ: '90 12 34 56',
  NE: '90 12 34 56',
  GN: '620 12 34 56',
  GW: '955 123 456',
  SL: '76 123 456',
  LR: '77 123 456',
  GH: '24 123 4567',
  NG: '803 123 4567',
  CV: '991 2345',
  MA: '612 345 678',
  DZ: '551 23 45 67',
  TN: '20 123 456',
};

export default function CountryPhoneInput({
  value,
  countryCode,
  onPhoneChange,
  onCountryChange,
  error,
  disabled = false,
  name = 'phoneOM',
  ariaLabel,
}: CountryPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [flash, setFlash] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Liste triée par ordre_affichage
  const sortedPays = useMemo(
    () => [...PAYS_LIST].filter(p => p.actif).sort((a, b) => a.ordre_affichage - b.ordre_affichage),
    []
  );

  // Filtre recherche
  const filteredPays = useMemo(() => {
    if (!search.trim()) return sortedPays;
    const q = search.trim().toLowerCase();
    return sortedPays.filter(
      p =>
        p.nom_fr.toLowerCase().includes(q) ||
        p.code_iso.toLowerCase().includes(q) ||
        p.indicatif_tel.includes(q)
    );
  }, [search, sortedPays]);

  // Pays courant
  const currentPays = getPaysByCode(countryCode) || getPaysByCode(PAYS_DEFAULT_CODE)!;
  const maxLen = PHONE_LENGTH_BY_PAYS[currentPays.code_iso] ?? 10;
  const placeholder = PLACEHOLDERS[currentPays.code_iso] ?? '';

  // Fermeture en cliquant dehors
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Reset focus index + search à l'ouverture
  useEffect(() => {
    if (open) {
      const idx = filteredPays.findIndex(p => p.code_iso === currentPays.code_iso);
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setSearch('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll vers option focusée
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${focusedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  const handleSelect = (code: string) => {
    onCountryChange(code);
    setOpen(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    onPhoneChange(cleaned);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(i => (i + 1) % filteredPays.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(i => (i - 1 + filteredPays.length) % filteredPays.length);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(filteredPays.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPays[focusedIndex]) handleSelect(filteredPays[focusedIndex].code_iso);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  const showSearch = sortedPays.length > 10;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <div className="flex">
        <button
          ref={triggerRef}
          type="button"
          className={`reg_country-trigger ${flash ? 'reg_country-flash' : ''}`}
          aria-label={ariaLabel || `Pays : ${currentPays.nom_fr}, indicatif ${currentPays.indicatif_tel}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="reg-country-listbox"
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
        >
          <span className="text-lg leading-none">{currentPays.emoji_drapeau}</span>
          <span className="text-sm font-medium">{currentPays.indicatif_tel}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <input
          ref={phoneInputRef}
          type="tel"
          inputMode="numeric"
          name={name}
          className="reg_glass-input flex-1"
          style={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderLeft: 'none',
          }}
          placeholder={placeholder}
          value={value}
          onChange={handlePhoneChange}
          maxLength={maxLen}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          required
        />
      </div>

      {/* Message erreur */}
      {error && (
        <p id={`${name}-error`} className="text-red-400 text-xs mt-1">
          {error}
        </p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="reg_country-dropdown"
          >
            {showSearch && (
              <div className="reg_country-search-wrap">
                <Search className="w-4 h-4 text-green-300/70" />
                <input
                  type="text"
                  className="reg_country-search"
                  placeholder="Rechercher un pays..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setFocusedIndex(0);
                  }}
                  autoFocus
                />
              </div>
            )}

            <ul
              ref={listRef}
              id="reg-country-listbox"
              role="listbox"
              aria-label="Liste des pays"
            >
              {filteredPays.length === 0 && (
                <li className="px-3 py-2 text-sm text-green-200/60 italic">Aucun pays trouvé</li>
              )}
              {filteredPays.map((p, idx) => {
                const selected = p.code_iso === currentPays.code_iso;
                const focused = idx === focusedIndex;
                return (
                  <li
                    key={p.code_iso}
                    role="option"
                    aria-selected={selected}
                    data-idx={idx}
                    data-focused={focused}
                    className="reg_country-option"
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onClick={() => handleSelect(p.code_iso)}
                  >
                    <span className="flag">{p.emoji_drapeau}</span>
                    <span className="dial">{p.indicatif_tel}</span>
                    <span className="flex-1 truncate">{p.nom_fr}</span>
                    {selected && <Check className="check w-4 h-4" />}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
