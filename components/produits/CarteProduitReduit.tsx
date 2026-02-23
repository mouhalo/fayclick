/**
 * Carte Produit Réduite - Format compact pour afficher plus de produits
 * Design optimisé avec menu contextuel 3 points pour les actions
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  TrendingUp,
  Minus,
  Plus,
  ShoppingCart,
  MoreVertical,
  QrCode,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';
import { useSubscriptionStatus } from '@/contexts/AuthContext';
import { useSalesRules } from '@/hooks/useSalesRules';
import { Produit } from '@/types/produit';

interface CarteProduitReduitProps {
  /** Produit à afficher */
  produit: Produit;
  /** Callback édition */
  onEdit: (produit: Produit) => void;
  /** Callback suppression */
  onDelete: (produit: Produit) => void;
  /** Callback QR Code (optionnel) */
  onQrCode?: (produit: Produit) => void;
  /** Type de structure */
  typeStructure?: string;
  /** Callback appelé quand l'abonnement est requis */
  onSubscriptionRequired?: (featureName?: string) => void;
  /** Mode sélection multiple activé */
  selectionMode?: boolean;
  /** Produit actuellement sélectionné */
  isSelected?: boolean;
  /** Callback toggle sélection */
  onToggleSelect?: (id_produit: number) => void;
  /** Callback vente externe (ouvre modal quantité dans le parent) */
  onVendreClick?: (produit: Produit) => void;
}

export function CarteProduitReduit({
  produit,
  onEdit,
  onDelete,
  onQrCode,
  typeStructure = 'COMMERCIALE',
  onSubscriptionRequired,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onVendreClick
}: CarteProduitReduitProps) {
  const { addArticle, articles } = usePanierStore();
  const { success: showSuccessToast } = useToast();
  const { canAccessFeature } = useSubscriptionStatus();
  const salesRules = useSalesRules();
  const [quantite, setQuantite] = useState(1);
  const [showMenu, setShowMenu] = useState(false);

  // Calculer quantité déjà dans le panier
  const quantiteDansPanier = articles.find(a => a.id_produit === produit.id_produit)?.quantite || 0;
  const stockDisponible = (produit.niveau_stock || 0) - quantiteDansPanier;

  // Gestion quantité
  const handleIncrement = () => {
    if (quantite < stockDisponible) {
      setQuantite(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantite > 1) {
      setQuantite(prev => prev - 1);
    }
  };

  // Ajout au panier
  const handleVendre = () => {
    // Si callback externe fourni → déléguer au parent (modal quantité)
    if (onVendreClick) {
      onVendreClick(produit);
      return;
    }

    // Vérifier abonnement actif
    if (!canAccessFeature('Vente produit')) {
      if (onSubscriptionRequired) {
        onSubscriptionRequired('Vente de produit');
      }
      return;
    }

    const niveauStock = produit?.niveau_stock || 0;

    if (quantite > 0 && quantite <= niveauStock) {
      for (let i = 0; i < quantite; i++) {
        addArticle(produit);
      }

      showSuccessToast(
        'Article ajouté !',
        `${quantite} x ${produit.nom_produit} ajouté${quantite > 1 ? 's' : ''} au panier`
      );

      setQuantite(1);
    }
  };

  // Actions menu
  const handleMenuAction = (action: 'qr' | 'edit' | 'delete', e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    switch (action) {
      case 'qr':
        if (onQrCode) onQrCode(produit);
        break;
      case 'edit':
        onEdit(produit);
        break;
      case 'delete':
        onDelete(produit);
        break;
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  };

  const closeMenu = () => setShowMenu(false);

  // Badge stock
  const getBadgeStock = () => {
    const stock = produit.niveau_stock || 0;
    if (stock === 0) {
      return { text: 'Rupture', color: 'bg-red-500' };
    } else if (stock <= 5) {
      return { text: 'Faible', color: 'bg-orange-500' };
    } else {
      return { text: 'Dispo', color: 'bg-green-500' };
    }
  };

  const badge = getBadgeStock();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
        selectionMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      }`}
      onClick={() => {
        if (selectionMode && onToggleSelect) {
          onToggleSelect(produit.id_produit);
        } else {
          closeMenu();
        }
      }}
    >
      {/* Header compact - Optimisé mobile */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-2 flex items-start justify-between gap-1.5">
        {/* Checkbox sélection */}
        {selectionMode && (
          <div className="flex-shrink-0 pt-0.5">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 bg-white'
            }`}>
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
        {/* Nom produit */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-[11px] leading-tight truncate">
            {produit.nom_produit}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white ${badge.color}`}>
              {badge.text}
            </span>
            <span className="text-[9px] text-gray-500">
              Stock: {produit.niveau_stock || 0}
            </span>
          </div>
        </div>

        {/* Menu 3 points */}
        <div className="relative flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu}
            className="p-1 rounded-lg hover:bg-white/80 transition-colors"
            aria-label="Menu actions"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                {/* Backdrop pour fermer */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={closeMenu}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20"
                >
                  {/* QR Code */}
                  {onQrCode && (
                    <button
                      onClick={(e) => handleMenuAction('qr', e)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-blue-600" />
                      QR Code
                    </button>
                  )}

                  {/* Modifier */}
                  <button
                    onClick={(e) => handleMenuAction('edit', e)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-cyan-600" />
                    Modifier
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={(e) => handleMenuAction('delete', e)}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Body - Optimisé mobile */}
      <div className="p-2 space-y-1.5">
        {/* Prix + Stock (Grid 2 colonnes) */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Prix */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[9px] font-medium text-gray-600">Prix</span>
            </div>
            <p className="text-[11px] font-bold text-gray-900 leading-tight">
              {produit.prix_vente.toLocaleString('fr-FR')} FCFA
            </p>
            {salesRules.prixEnGrosActif && (produit.prix_grossiste || 0) > 0 && (
              <p className="text-[9px] font-semibold text-purple-600 leading-tight">
                Gros: {(produit.prix_grossiste || 0).toLocaleString('fr-FR')}
              </p>
            )}
          </div>

          {/* Stock disponible */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Package className="w-3 h-3 text-blue-600" />
              <span className="text-[9px] font-medium text-gray-600">Dispo</span>
            </div>
            <p className={`text-[11px] font-bold leading-tight ${
              stockDisponible <= 0 ? 'text-red-600' :
              stockDisponible <= 5 ? 'text-orange-600' :
              'text-gray-900'
            }`}>
              {stockDisponible} {stockDisponible > 1 ? 'unités' : 'unité'}
            </p>
          </div>
        </div>

        {/* Contrôles quantité */}
        <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg py-1.5 px-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDecrement}
            disabled={quantite <= 1}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              quantite <= 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            <Minus className="w-3 h-3" />
          </motion.button>

          <span className="text-sm font-bold text-gray-900 min-w-[2ch] text-center">
            {quantite}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleIncrement}
            disabled={quantite >= stockDisponible}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              quantite >= stockDisponible
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            <Plus className="w-3 h-3" />
          </motion.button>
        </div>

        {/* Bouton Vendre */}
        <motion.button
          whileHover={{ scale: stockDisponible > 0 ? 1.02 : 1 }}
          whileTap={{ scale: stockDisponible > 0 ? 0.98 : 1 }}
          onClick={(e) => {
            e.stopPropagation();
            handleVendre();
          }}
          disabled={stockDisponible <= 0}
          className={`w-full py-1.5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            stockDisponible <= 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          {stockDisponible <= 0 ? 'Rupture' : 'Vendre'}
        </motion.button>
      </div>
    </motion.div>
  );
}
