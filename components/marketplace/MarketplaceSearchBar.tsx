'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, Store, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { marketplaceSearchService } from '@/services/marketplace-search.service';
import { SearchResult, StructurePublique } from '@/types/marketplace';

interface MarketplaceSearchBarProps {
  onSelectStructure?: (structure: StructurePublique) => void;
  variant?: 'hero' | 'sticky';
}

export default function MarketplaceSearchBar({ onSelectStructure, variant = 'hero' }: MarketplaceSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const isTel = /^7\d*$/.test(query.trim());

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await marketplaceSearchService.search(q);
      setResults(res);
      setIsOpen(res.length > 0);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Fermer dropdown au clic exterieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (structure: StructurePublique) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectStructure) {
      onSelectStructure(structure);
    } else {
      router.push(`/catalogue?id=${structure.id_structure}`);
    }
  };

  const isSticky = variant === 'sticky';

  return (
    <div ref={containerRef} className={`relative w-full ${isSticky ? 'max-w-md' : 'max-w-xl mx-auto'}`}>
      {/* Input pill-shape */}
      <div className={`relative flex items-center ${isSticky ? 'h-10' : 'h-12'} rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-all focus-within:border-emerald-400/50 focus-within:ring-2 focus-within:ring-emerald-400/30`}>
        <div className="pl-4 pr-2 flex items-center">
          {isTel ? (
            <Phone className={`${isSticky ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-300`} />
          ) : (
            <Search className={`${isSticky ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-300`} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isTel ? 'Numéro de téléphone (7xx...)' : 'Rechercher une boutique...'}
          className={`flex-1 bg-transparent ${isSticky ? 'text-sm' : 'text-base'} text-white placeholder-white/50 outline-none pr-4`}
        />
        {isSearching && (
          <div className="pr-4">
            <div className="w-4 h-4 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden"
          >
            {results.map((r, i) => (
              <button
                key={r.structure.id_structure}
                onClick={() => handleSelect(r.structure)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
              >
                {/* Logo ou mascotte */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-white/20 flex items-center justify-center">
                  <Image
                    src={r.structure.logo_structure && r.structure.logo_structure.startsWith('http') ? r.structure.logo_structure : '/images/mascotte.png'}
                    alt={r.structure.nom_structure}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    onError={(e) => { e.currentTarget.src = '/images/mascotte.png'; }}
                  />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {r.structure.nom_structure}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-emerald-300/70">
                    {r.matchType === 'telephone' && r.structure.telephone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {r.structure.telephone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {r.structure.total_produits} produit{r.structure.total_produits > 1 ? 's' : ''}
                    </span>
                  </div>
                  {r.structure.adresse && (
                    <p className="text-[10px] text-white/40 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      {r.structure.adresse}
                    </p>
                  )}
                </div>

                {/* Icone */}
                <Store className="w-4 h-4 text-emerald-400/50 flex-shrink-0" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
