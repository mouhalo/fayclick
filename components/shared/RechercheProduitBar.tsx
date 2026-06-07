/**
 * Barre de recherche produit PARTAGÉE (store-agnostic, emit-only).
 *
 * Extraite de VenteFlashHeader (section recherche) pour réutilisation dans
 * ModalEditionVente sans dupliquer la logique scan / code-barres / douchette.
 *
 * ⚠️ DESIGN VOLONTAIRE (pour permettre une future migration DRY de VenteFlashHeader) :
 * - N'importe AUCUN store (pas de panier, pas de badge) — c'est une UNITÉ de recherche.
 * - Ne gère NI refresh, NI print, NI titre — pure recherche.
 * - N'embarque PAS le modal de sélection multiple — il émet `onMultipleMatches`,
 *   le parent affiche son propre modal de sélection.
 * - Filtrage 100 % CLIENT sur la liste `produits` fournie (aucun appel serveur).
 *
 * Fonctions reprises à l'identique de VenteFlash :
 * - filtre nom_produit OU code_barre (includes), dropdown max 10 (stock/prix/code-barre),
 * - auto-scan douchette (debounce 300ms, match exact code_barre),
 * - Entrée (priorité match exact code-barres puis 1er résultat dropdown),
 * - bouton scan caméra via <ScanCodeBarre>,
 * - matches multiples → onMultipleMatches.
 */

'use client';

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { ScanCodeBarre } from '@/components/shared/ScanCodeBarre';
import { Produit } from '@/types/produit';
import { useTranslations } from '@/hooks/useTranslations';

export interface RechercheProduitBarRef {
  focusSearch: () => void;
}

interface RechercheProduitBarProps {
  /** Liste complète des produits (filtrage client) */
  produits: Produit[];
  /** Émis quand un produit est sélectionné (le parent décide quoi en faire) */
  onAddToPanier: (produit: Produit) => void;
  /** Émis quand plusieurs produits partagent le même code-barres */
  onMultipleMatches?: (matches: Produit[]) => void;
  /** Texte du champ de recherche */
  placeholder?: string;
  /** Variante de style : 'venteflash' (fond vert) ou 'modal' (fond blanc) */
  variant?: 'venteflash' | 'modal';
  /** Contexte passé à ScanCodeBarre */
  scanContext?: 'panier' | 'ajout-produit' | 'venteflash';
  /** Désactive les interactions (ex: pendant un enregistrement) */
  disabled?: boolean;
}

export const RechercheProduitBar = forwardRef<
  RechercheProduitBarRef,
  RechercheProduitBarProps
>(
  (
    {
      produits,
      onAddToPanier,
      onMultipleMatches,
      placeholder,
      variant = 'venteflash',
      scanContext = 'venteflash',
      disabled = false,
    },
    ref
  ) => {
    const t = useTranslations('venteFlash');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Produit[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Exposer focusSearch() au parent (auto-focus après ajout pour enchaîner les scans)
    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    }));

    // Recherche par nom OU code-barres (dès le premier caractère)
    useEffect(() => {
      if (searchTerm.length >= 1) {
        const term = searchTerm.toLowerCase().trim();
        const results = produits
          .filter((p) => {
            const matchNom = p.nom_produit.toLowerCase().includes(term);
            const matchCodeBarre =
              p.code_barre?.toLowerCase().includes(term) || false;
            return matchNom || matchCodeBarre;
          })
          .slice(0, 10);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, [searchTerm, produits]);

    // Auto-détection douchette : debounce 300ms puis match exact code_barre
    useEffect(() => {
      if (searchTerm.length < 3) return;

      const timer = setTimeout(() => {
        const matches = produits.filter(
          (p) => p.code_barre && p.code_barre.trim() === searchTerm.trim()
        );
        if (matches.length === 0) return;

        setSearchTerm('');
        setShowDropdown(false);

        if (matches.length === 1) {
          onAddToPanier(matches[0]);
        } else if (onMultipleMatches) {
          onMultipleMatches(matches);
        } else {
          onAddToPanier(matches[0]);
        }
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 300);

      return () => clearTimeout(timer);
    }, [searchTerm, produits, onAddToPanier, onMultipleMatches]);

    // Fermer le dropdown au clic extérieur
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          searchRef.current &&
          !searchRef.current.contains(event.target as Node)
        ) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectProduct = (produit: Produit) => {
      onAddToPanier(produit);
      setSearchTerm('');
      setShowDropdown(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Entrée : priorité au match exact code-barres (douchette), sinon 1er résultat
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const barcodeMatches = produits.filter(
        (p) => p.code_barre && p.code_barre.trim() === searchTerm.trim()
      );
      if (barcodeMatches.length > 0) {
        setSearchTerm('');
        setShowDropdown(false);
        if (barcodeMatches.length === 1) {
          onAddToPanier(barcodeMatches[0]);
        } else if (onMultipleMatches) {
          onMultipleMatches(barcodeMatches);
        } else {
          onAddToPanier(barcodeMatches[0]);
        }
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      if (searchResults.length > 0) {
        handleSelectProduct(searchResults[0]);
      }
    };

    // Scan caméra
    const handleScanSuccess = (code: string) => {
      const matches = produits.filter(
        (p) => p.code_barre && p.code_barre.trim() === code.trim()
      );
      if (matches.length > 0) {
        if (matches.length === 1) {
          onAddToPanier(matches[0]);
        } else if (onMultipleMatches) {
          onMultipleMatches(matches);
        } else {
          onAddToPanier(matches[0]);
        }
      } else {
        alert(t('header.productNotFound', { code }));
      }
    };

    const isModal = variant === 'modal';

    // Styles adaptatifs selon la variante (fond vert VF vs fond blanc modal)
    const inputClass = isModal
      ? 'w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all'
      : 'w-full pl-10 pr-10 py-3 rounded-xl bg-white border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all';

    const scanVariant = isModal ? 'secondary' : 'primary';

    return (
      <div
        className={isModal ? 'flex items-stretch gap-2' : 'grid grid-cols-[1fr_auto] gap-2'}
        ref={searchRef}
      >
        {/* Champ recherche + dropdown */}
        <div className="relative flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || t('header.searchPlaceholder')}
              disabled={disabled}
              className={inputClass}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 z-[130] bg-white rounded-xl shadow-2xl border border-gray-200 max-h-72 overflow-y-auto"
              >
                {searchResults.map((produit) => (
                  <motion.button
                    type="button"
                    key={produit.id_produit}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                    onClick={() => handleSelectProduct(produit)}
                    className="w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {produit.nom_produit}
                        </div>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-2">
                          <span>
                            {t('header.stockLabel', {
                              count: produit.niveau_stock || 0,
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {produit.prix_vente.toLocaleString('fr-FR')} FCFA
                          </span>
                          {produit.code_barre && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-mono text-xs">
                                {produit.code_barre}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (produit.niveau_stock || 0) > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {(produit.niveau_stock || 0) > 0
                            ? t('header.available')
                            : t('header.outOfStock')}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bouton scan caméra */}
        <ScanCodeBarre
          onScanSuccess={handleScanSuccess}
          context={scanContext}
          variant={scanVariant}
          size="md"
          iconOnly={true}
        />
      </div>
    );
  }
);

RechercheProduitBar.displayName = 'RechercheProduitBar';

export default RechercheProduitBar;
