'use client';

import { Home, Store, Search, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/hooks/useTranslations';

type TabId = 'home' | 'boutiques' | 'search' | 'cart';

interface BottomNavMarketplaceProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  /**
   * Nombre d'articles dans le panier. Si défini (même à 0), l'onglet
   * "Panier" est affiché avec un badge. Si undefined, l'onglet n'apparaît
   * pas (comportement par défaut pour la marketplace globale sans panier).
   */
  cartCount?: number;
}

export default function BottomNavMarketplace({
  activeTab = 'home',
  onTabChange,
  cartCount,
}: BottomNavMarketplaceProps) {
  const t = useTranslations('marketplace');

  const showCart = typeof cartCount === 'number';

  const tabs: Array<{ id: TabId; icon: typeof Home; label: string }> = [
    { id: 'home', icon: Home, label: t('nav.home') },
    { id: 'boutiques', icon: Store, label: t('nav.shops') },
    ...(showCart
      ? [{ id: 'cart' as TabId, icon: ShoppingCart, label: t('nav.cart') }]
      : []),
    { id: 'search', icon: Search, label: t('nav.search') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 h-16 flex items-center justify-around px-2 safe-area-bottom">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const isCart = tab.id === 'cart';
          const hasItems = isCart && (cartCount ?? 0) > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              aria-label={tab.label}
            >
              {/* Trait actif superieur */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-3 right-3 h-0.5 bg-emerald-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-emerald-400'
                      : hasItems
                      ? 'text-emerald-300'
                      : 'text-white/40'
                  }`}
                />

                {/* Badge cartCount sur l'onglet Panier */}
                <AnimatePresence>
                  {hasItems && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-slate-900"
                    >
                      {(cartCount ?? 0) > 99 ? '99+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <span
                className={`text-[9px] font-medium transition-colors ${
                  isActive
                    ? 'text-emerald-400'
                    : hasItems
                    ? 'text-emerald-200'
                    : 'text-white/30'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
