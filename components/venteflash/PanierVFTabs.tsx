/**
 * PanierVFTabs — Onglets multi-panier VenteFlash (desktop uniquement)
 * Affiche les paniers sous forme d'onglets avec heure, nb articles, montant
 * Max 3 paniers simultanés
 */

'use client';

import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { usePanierVFMultiStore, PanierVF } from '@/stores/panierVFMultiStore';

interface PanierVFTabsProps {
  /** Bloque le changement d'onglet (ex: modal quantité ouvert) */
  switchDisabled?: boolean;
}

export function PanierVFTabs({ switchDisabled = false }: PanierVFTabsProps) {
  const {
    paniers,
    activePanierId,
    switchPanier,
    createPanier,
    closePanier,
    getPanierCount
  } = usePanierVFMultiStore();

  const count = getPanierCount();

  // Ne rien afficher si aucun panier
  if (count === 0) return null;

  const formatTime = (id: number) => {
    return new Date(id).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPanierTotal = (panier: PanierVF) => {
    return panier.articles.reduce(
      (sum, a) => sum + ((a.prix_applique ?? a.prix_vente) * a.quantity),
      0
    );
  };

  const getPanierItemCount = (panier: PanierVF) => {
    return panier.articles.reduce((sum, a) => sum + a.quantity, 0);
  };

  const canCreateNew = count < 3;
  const hasMultiplePaniers = count > 1;

  const handleSwitchPanier = (id: number) => {
    if (switchDisabled || id === activePanierId) return;
    switchPanier(id);
  };

  const handleCreatePanier = () => {
    if (!canCreateNew || switchDisabled) return;
    createPanier();
  };

  const handleClosePanier = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (switchDisabled) return;
    const panier = paniers.find(p => p.id === id);
    if (panier && panier.articles.length > 0) {
      if (!confirm(`Ce panier contient ${panier.articles.length} article(s). Fermer quand même ?`)) return;
    }
    closePanier(id);
  };

  return (
    <div className="flex items-stretch gap-1 mb-2">
      {paniers.map((panier) => {
        const isActive = panier.id === activePanierId;
        const itemCount = getPanierItemCount(panier);
        const total = getPanierTotal(panier);
        const canClose = isActive ? hasMultiplePaniers : true;

        return (
          <motion.div
            key={panier.id}
            layout
            role="button"
            tabIndex={0}
            onClick={() => handleSwitchPanier(panier.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSwitchPanier(panier.id); }}
            className={`
              relative flex-1 max-w-[200px] rounded-t-xl px-3 py-2 text-left transition-all
              ${isActive
                ? 'bg-white border-2 border-b-0 border-green-400 shadow-sm z-10'
                : 'bg-gray-100 border-2 border-b-0 border-transparent hover:bg-gray-200 cursor-pointer'
              }
              ${switchDisabled && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Contenu onglet */}
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className={`text-xs font-semibold truncate ${
                    isActive ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {formatTime(panier.id)} — {itemCount} art.
                  </span>
                </div>
                <div className={`text-xs mt-0.5 pl-3.5 font-medium ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {total.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              {/* Bouton fermer */}
              {canClose && (
                <button
                  onClick={(e) => handleClosePanier(e, panier.id)}
                  className="
                    flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                    transition-colors mt-0.5
                    hover:bg-red-100 text-gray-400 hover:text-red-500
                  "
                  title="Fermer ce panier"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Bouton + nouveau panier */}
      <motion.button
        whileHover={canCreateNew && !switchDisabled ? { scale: 1.05 } : {}}
        whileTap={canCreateNew && !switchDisabled ? { scale: 0.95 } : {}}
        onClick={handleCreatePanier}
        disabled={!canCreateNew || switchDisabled}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-t-xl border-2 border-b-0 transition-all
          ${canCreateNew && !switchDisabled
            ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-600 cursor-pointer'
            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
        title={canCreateNew ? 'Nouveau panier' : 'Maximum 3 paniers'}
      >
        <Plus className="w-4 h-4" />
        {!canCreateNew && (
          <span className="text-[10px] font-medium whitespace-nowrap">Max 3</span>
        )}
      </motion.button>
    </div>
  );
}
