/**
 * Header Vente Flash
 * Section 1: Bouton Retour + Titre + Badge Panier + Recherche + Scan
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Search, Zap, X, RefreshCw
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { ScanCodeBarre } from '@/components/shared/ScanCodeBarre';
import { SearchProductResult } from '@/types/venteflash.types';
import { Produit } from '@/types/produit';

interface VenteFlashHeaderProps {
  /** Liste complète des produits chargés */
  produits: Produit[];
  /** Callback ajout produit au panier */
  onAddToPanier: (produit: Produit) => void;
  /** Callback pour rafraîchir les données */
  onRefresh?: () => void;
  /** Callback pour ouvrir le panier */
  onOpenPanier?: () => void;
}

export function VenteFlashHeader({
  produits,
  onAddToPanier,
  onRefresh,
  onOpenPanier
}: VenteFlashHeaderProps) {
  const router = useRouter();
  const { getTotalItems } = usePanierStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Produit[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const totalItems = getTotalItems();

  // Recherche produits (déclenchée après 3 caractères)
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const term = searchTerm.toLowerCase();
      const results = produits.filter(p =>
        p.nom_produit.toLowerCase().includes(term)
      ).slice(0, 10); // Max 10 résultats

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchTerm, produits]);

  // Fermer dropdown si clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler sélection produit
  const handleSelectProduct = (produit: Produit) => {
    console.log('✅ [VENTE FLASH] Produit sélectionné:', produit.nom_produit);
    onAddToPanier(produit);
    setSearchTerm('');
    setShowDropdown(false);
  };

  // Handler scan code-barre
  const handleScanSuccess = (code: string) => {
    console.log('📊 [VENTE FLASH] Code scanné:', code);

    // Rechercher produit par code-barre
    const produit = produits.find(p => p.code_barre === code);

    if (produit) {
      console.log('✅ [VENTE FLASH] Produit trouvé par scan:', produit.nom_produit);
      onAddToPanier(produit);
    } else {
      console.warn('⚠️ [VENTE FLASH] Aucun produit avec ce code-barre:', code);
      alert(`Aucun produit trouvé avec le code-barre: ${code}`);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 rounded-2xl p-4 shadow-xl mb-4">
      {/* Ligne 1: Retour + Titre + Panier */}
      <div className="flex items-center justify-between mb-4">
        {/* Bouton Retour */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/dashboard/commerce')}
          className="
            w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full
            flex items-center justify-center hover:bg-white/30 transition-colors
          "
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        {/* Titre centré */}
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-300" />
          <h1 className="text-xl font-bold text-white">Vente Flash</h1>
        </div>

        {/* Badge Panier flottant */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onOpenPanier?.()}
          className="
            relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full
            flex items-center justify-center hover:bg-white/30 transition-colors
          "
        >
          <ShoppingCart className="w-5 h-5 text-white" />
          {totalItems > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="
                absolute -top-1 -right-1
                w-5 h-5 bg-red-500 rounded-full
                flex items-center justify-center
                text-xs font-bold text-white
                shadow-lg
              "
            >
              {totalItems}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Ligne 2: Recherche + Actualiser + Scan (Grid flexible) */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2" ref={searchRef}>
        {/* Champ Recherche avec dropdown */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="
                w-full pl-10 pr-10 py-3 rounded-xl
                bg-white border-2 border-white/50
                focus:outline-none focus:ring-2 focus:ring-yellow-300
                transition-all
              "
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  w-6 h-6 bg-gray-200 rounded-full
                  flex items-center justify-center hover:bg-gray-300
                  transition-colors
                "
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Dropdown résultats */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="
                  absolute top-full left-0 right-0 mt-2 z-50
                  bg-white rounded-xl shadow-2xl border border-gray-200
                  max-h-80 overflow-y-auto
                "
              >
                {searchResults.map((produit) => (
                  <motion.button
                    key={produit.id_produit}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                    onClick={() => handleSelectProduct(produit)}
                    className="
                      w-full px-4 py-3 text-left
                      border-b border-gray-100 last:border-b-0
                      transition-colors
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{produit.nom_produit}</div>
                        <div className="text-sm text-gray-500">
                          Stock: {produit.niveau_stock || 0} • {produit.prix_vente.toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                      <div className="ml-3">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${(produit.niveau_stock || 0) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'}
                        `}>
                          {(produit.niveau_stock || 0) > 0 ? 'Disponible' : 'Rupture'}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bouton Actualiser */}
        {onRefresh && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, rotate: 180 }}
            onClick={onRefresh}
            className="
              w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full
              flex items-center justify-center hover:bg-white/30 transition-all
              border-2 border-white/50
            "
            title="Actualiser les données"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {/* Bouton Scanner (icon only) */}
        <ScanCodeBarre
          onScanSuccess={handleScanSuccess}
          context="venteflash"
          variant="primary"
          size="md"
          iconOnly={true}
        />
      </div>
    </div>
  );
}
