'use client';

import { Home, Store, ShoppingCart, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavMarketplaceProps {
  activeTab?: 'home' | 'boutiques' | 'cart' | 'profil';
  cartCount?: number;
  onTabChange?: (tab: 'home' | 'boutiques' | 'cart' | 'profil') => void;
}

const tabs = [
  { id: 'home' as const, icon: Home, label: 'Accueil' },
  { id: 'boutiques' as const, icon: Store, label: 'Boutiques' },
  { id: 'cart' as const, icon: ShoppingCart, label: 'Panier' },
  { id: 'profil' as const, icon: User, label: 'Profil' },
];

export default function BottomNavMarketplace({ activeTab = 'home', cartCount = 0, onTabChange }: BottomNavMarketplaceProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 h-16 flex items-center justify-around px-2 safe-area-bottom">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
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
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-400' : 'text-white/40'}`} />
                {/* Badge panier */}
                {tab.id === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>

              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-white/30'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
